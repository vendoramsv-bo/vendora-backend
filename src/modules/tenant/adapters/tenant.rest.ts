import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import { requireAuth, requireTenantActivo, requireRol, type HonoEnv } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { crearPrismaScoped } from "../../../core/prisma-scoped.js"
import { TenantPrismaRepository } from "../infrastructure/tenant.prisma.repository.js"
import { ObtenerTenantUseCase } from "../application/obtener-tenant.usecase.js"
import { ListarTenantsUsuarioUseCase } from "../application/listar-tenants-usuario.usecase.js"
import { ListarMiembrosUseCase } from "../application/listar-miembros.usecase.js"
import { ListarInvitacionesUseCase } from "../application/listar-invitaciones.usecase.js"
import {
  QueryParamsTenantSchema,
  QueryParamsMiembrosSchema,
  QueryParamsInvitacionSchema,
  TenantActualResponseSchema,
  ListaTenantItemSchema,
  MiembroResponseSchema,
  InvitacionResponseSchema,
} from "./tenant.schema.js"
import {
  PreferenciaPresentacionResponseSchema,
  ActualizarPreferenciaPresentacionSchema,
  aIdTema,
  aEnumTema,
  aIdLineado,
  aEnumLineado,
  aIdDespliegue,
  aEnumDespliegue,
} from "./preferencia-presentacion.schema.js"
import { paginate } from "../../../core/query-params.js"
import { TenantNoEncontrado, SinTenantActivo } from "../domain/tenant.errors.js"
import { errorResponses, okResponse } from "../../../core/openapi-responses.js"
import pino from "pino"

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

export const tenantRouter = new OpenAPIHono<HonoEnv>()

// ─── GET /api/tenant/actual ───────────────────────────────────────────────────

tenantRouter.openapi(
  createRoute({
    method: "get",
    path: "/actual",
    operationId: "tenant_obtener_actual",
    tags: ["Tenant"],
    security: [{ bearerAuth: [] }],
    middleware: [requireAuth, requireTenantActivo] as const,
    responses: {
      200: okResponse("Tenant activo con propietario", TenantActualResponseSchema),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")

    const repo = new TenantPrismaRepository(prisma)
    const useCase = new ObtenerTenantUseCase(repo)

    try {
      const tenant = await useCase.ejecutar(tenantId)

      const propietario = await db.propietario.findUnique({
        where: { tenantId },
        select: { id: true, nombres: true, telefono: true, domicilio: true, imagenUrl: true },
      })

      logger.info({ tenantId }, "[tenant] usecase:obtenerTenant")

      return c.json({ ...tenant.toJSON(), propietario: propietario ?? null })
    } catch (err) {
      if (err instanceof TenantNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof SinTenantActivo) return c.json({ error: err.code, message: err.message }, 400)
      throw err
    }
  },
)

// ─── GET /api/tenant ──────────────────────────────────────────────────────────

tenantRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    operationId: "tenant_listar_tenants",
    tags: ["Tenant"],
    security: [{ bearerAuth: [] }],
    middleware: requireAuth,
    responses: {
      200: okResponse("Lista de tenants del usuario", z.object({ data: z.array(ListaTenantItemSchema) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const session = c.get("session")
    const rawQuery = c.req.query()
    const parsed = QueryParamsTenantSchema.safeParse(rawQuery)
    const params = parsed.success ? parsed.data : QueryParamsTenantSchema.parse({})

    const repo = new TenantPrismaRepository(prisma)
    const useCase = new ListarTenantsUsuarioUseCase(repo)
    const resultado = await useCase.ejecutar(session.user.id, params)

    return c.json(
      paginate(
        resultado.data.map(({ tenant, miRol }) => ({ ...tenant.toJSON(), miRol })),
        resultado.total,
        params,
      ),
    )
  },
)

// ─── GET /api/tenant/miembros ─────────────────────────────────────────────────

tenantRouter.openapi(
  createRoute({
    method: "get",
    path: "/miembros",
    operationId: "tenant_listar_miembros",
    tags: ["Tenant"],
    security: [{ bearerAuth: [] }],
    middleware: [requireAuth, requireTenantActivo] as const,
    responses: {
      200: okResponse("Lista de miembros del tenant", z.object({ data: z.array(MiembroResponseSchema) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const rawQuery = c.req.query()
    const parsed = QueryParamsMiembrosSchema.safeParse(rawQuery)
    const params = parsed.success ? parsed.data : QueryParamsMiembrosSchema.parse({})

    const scopedDb = crearPrismaScoped(tenantId, session.user.id)
    const repo = new TenantPrismaRepository(scopedDb)
    const useCase = new ListarMiembrosUseCase(repo)
    const resultado = await useCase.ejecutar(tenantId, params)

    logger.info({ tenantId }, "[tenant] usecase:listarMiembros")

    return c.json(
      paginate(
        resultado.data.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
        resultado.total,
        params,
      ),
    )
  },
)

// ─── GET /api/tenant/invitaciones ─────────────────────────────────────────────

tenantRouter.openapi(
  createRoute({
    method: "get",
    path: "/invitaciones",
    operationId: "tenant_listar_invitaciones",
    tags: ["Tenant"],
    security: [{ bearerAuth: [] }],
    middleware: [requireAuth, requireTenantActivo, requireRol(["PROPIETARIO", "owner", "ADMIN"])] as const,
    responses: {
      200: okResponse("Lista de invitaciones del tenant", z.object({ data: z.array(InvitacionResponseSchema) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const rawQuery = c.req.query()
    const parsed = QueryParamsInvitacionSchema.safeParse(rawQuery)
    const params = parsed.success ? parsed.data : QueryParamsInvitacionSchema.parse({})

    const scopedDb = crearPrismaScoped(tenantId, session.user.id)
    const repo = new TenantPrismaRepository(scopedDb)
    const useCase = new ListarInvitacionesUseCase(repo)
    const resultado = await useCase.ejecutar(tenantId, params)

    return c.json(
      paginate(
        resultado.data.map((inv) => ({
          ...inv,
          expiresAt: inv.expiresAt.toISOString(),
          createdAt: inv.createdAt.toISOString(),
        })),
        resultado.total,
        params,
      ),
    )
  },
)

// ─── Preferencia de presentación ──────────────────────────────────────────────
//
// Realiza el contrato §A.1 de `specs/021-design-system-vendora/contracts/`.
// El negocio se resuelve SIEMPRE desde la sesión, nunca de un parámetro
// (Artículo III.4 de la constitución del frontend, III de la del backend).

tenantRouter.openapi(
  createRoute({
    method: "get",
    path: "/preferencia-presentacion",
    operationId: "tenant_obtener_preferencia_presentacion",
    tags: ["Tenant"],
    security: [{ bearerAuth: [] }],
    middleware: [requireAuth, requireTenantActivo] as const,
    responses: {
      200: okResponse(
        "Preferencia de presentación del negocio activo",
        PreferenciaPresentacionResponseSchema,
      ),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")

    const fila = await db.preferenciaPresentacion.findUnique({ where: { tenantId } })

    // 404 no es un error de la app: es el caso normal de un negocio que todavía
    // no eligió. El cliente aplica el default de su vertical (FR-020).
    if (!fila) {
      return c.json(
        { error: "PREFERENCIA_NO_DEFINIDA", message: "El negocio todavía no eligió su presentación" },
        404,
      )
    }

    return c.json({
      tema: aIdTema(fila.tema),
      tipoLineado: aIdLineado(fila.tipoLineado),
      tipoDespliegueVentas: aIdDespliegue(fila.tipoDespliegueVentas),
    })
  },
)

tenantRouter.openapi(
  createRoute({
    method: "put",
    path: "/preferencia-presentacion",
    operationId: "tenant_actualizar_preferencia_presentacion",
    tags: ["Tenant"],
    security: [{ bearerAuth: [] }],
    // Un vendedor no cambia la identidad visual del negocio.
    middleware: [requireAuth, requireTenantActivo, requireRol(["PROPIETARIO", "owner", "ADMIN"])] as const,
    request: {
      body: {
        content: {
          "application/json": { schema: ActualizarPreferenciaPresentacionSchema },
        },
      },
    },
    responses: {
      200: okResponse("Preferencia actualizada", PreferenciaPresentacionResponseSchema),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const body = c.req.valid("json")

    // Upsert: un negocio que nunca eligió no puede fallar al elegir por primera vez.
    const datos = {
      tema: aEnumTema(body.tema),
      ...(body.tipoLineado ? { tipoLineado: aEnumLineado(body.tipoLineado) } : {}),
      ...(body.tipoDespliegueVentas
        ? { tipoDespliegueVentas: aEnumDespliegue(body.tipoDespliegueVentas) }
        : {}),
    }

    const fila = await db.preferenciaPresentacion.upsert({
      where: { tenantId },
      update: datos,
      create: { tenantId, ...datos },
    })

    logger.info({ tenantId, tema: body.tema }, "[tenant] usecase:actualizarPreferenciaPresentacion")

    return c.json({
      tema: aIdTema(fila.tema),
      tipoLineado: aIdLineado(fila.tipoLineado),
      tipoDespliegueVentas: aIdDespliegue(fila.tipoDespliegueVentas),
    })
  },
)
