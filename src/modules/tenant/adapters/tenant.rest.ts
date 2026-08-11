import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import { requireAuth, requireTenantActivo, requireRol, resolverMiembroActivo, type HonoEnv } from "../../../core/hono-context.js"
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
  EliminarNegocioSchema,
  EliminarNegocioResponseSchema,
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

// ─── DELETE /api/tenant/actual (023 US3, contracts §A.4) ──────────────────────

tenantRouter.openapi(
  createRoute({
    method: "delete",
    path: "/actual",
    operationId: "tenant_eliminar_actual",
    tags: ["Tenant"],
    security: [{ bearerAuth: [] }],
    /**
     * **ADMIN no está en la lista y no puede estarlo** (FR-021). Dar de baja el
     * negocio es la única capacidad que separa a un propietario de un
     * administrador; si ADMIN entrara acá, los dos roles serían el mismo rol.
     *
     * El guard se verifica en el servidor aunque la entrada del menú esté
     * oculta: ocultar no es controlar (FR-012, FR-026).
     */
    middleware: [
      requireAuth,
      requireTenantActivo,
      resolverMiembroActivo,
      requireRol(["PROPIETARIO"]),
    ] as const,
    request: {
      body: { content: { "application/json": { schema: EliminarNegocioSchema } } },
    },
    responses: {
      200: okResponse("Negocio dado de baja", EliminarNegocioResponseSchema),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const userId = c.get("usuario").id

    const body = await c.req.json().catch(() => ({}))
    const parsed = EliminarNegocioSchema.safeParse(body)
    if (!parsed.success) {
      return c.json(
        { error: "CONFIRMACION_INVALIDA", message: "Escribí el nombre del negocio para confirmar." },
        400,
      )
    }

    const negocio = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, estado: true },
    })

    if (!negocio) {
      return c.json({ error: "TENANT_NO_ENCONTRADO", message: "El negocio no existe." }, 404)
    }

    // Idempotencia explícita: una segunda llamada no vuelve a "dar de baja"
    // algo que ya está de baja, y decirlo es más útil que un 200 mentiroso.
    if (negocio.estado === "ELIMINADO") {
      return c.json(
        { error: "NEGOCIO_YA_ELIMINADO", message: "Este negocio ya fue eliminado." },
        409,
      )
    }

    if (parsed.data.confirmacion !== negocio.name) {
      return c.json(
        { error: "CONFIRMACION_INVALIDA", message: "El nombre no coincide con el del negocio." },
        400,
      )
    }

    /**
     * **Baja lógica, no borrado** (FR-025, research R-08).
     *
     * `authClient.organization.delete()` haría `onDelete: Cascade` sobre
     * `TenantMember`, y desde ahí sobre `Venta`: se llevaría puestos los
     * comprobantes. Acá no se borra ninguna fila — ventas, caja, inventario y
     * membresías quedan intactas. Lo que cambia es que el negocio deja de estar
     * disponible, y de eso se encarga `resolverMiembroActivo` respondiendo
     * `403 NEGOCIO_ELIMINADO` a toda petición posterior (FR-024).
     */
    await db.$transaction([
      db.tenant.update({
        where: { id: tenantId },
        data: { estado: "ELIMINADO", updatedById: userId },
      }),
      db.auditLog.create({
        data: {
          tenantId,
          userId,
          tabla: "Tenant",
          accion: "DELETE",
          cambios: { estado: { de: negocio.estado, a: "ELIMINADO" }, nombre: negocio.name },
        },
      }),
    ])

    logger.info({ tenantId, userId }, "[tenant] usecase:eliminarNegocio")

    return c.json({ ok: true })
  },
)
