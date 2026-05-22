import { Hono } from "hono"
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
} from "./tenant.schema.js"
import { paginate } from "../../../core/query-params.js"
import { TenantNoEncontrado, SinTenantActivo } from "../domain/tenant.errors.js"
import pino from "pino"

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

export const tenantRouter = new Hono<HonoEnv>()

// ─── GET /api/tenant/actual ───────────────────────────────────────────────────
// T028 + T042 — requireAuth + requireTenantActivo → retorna tenant activo con propietario

tenantRouter.get("/actual", requireAuth, requireTenantActivo, async (c) => {
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
})

// ─── GET /api/tenant ──────────────────────────────────────────────────────────
// T028 — lista todos los tenants del usuario autenticado con paginación

tenantRouter.get("/", requireAuth, async (c) => {
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
})

// ─── GET /api/tenant/miembros ─────────────────────────────────────────────────
// T039 + T041 (US4) — requireAuth + requireTenantActivo + Prisma scoped client

tenantRouter.get("/miembros", requireAuth, requireTenantActivo, async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const rawQuery = c.req.query()
  const parsed = QueryParamsMiembrosSchema.safeParse(rawQuery)
  const params = parsed.success ? parsed.data : QueryParamsMiembrosSchema.parse({})

  // T038: crearPrismaScoped garantiza aislamiento de tenant
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
})

// ─── GET /api/tenant/invitaciones ─────────────────────────────────────────────
// T031 + T032 (US3) — requireAuth + requireTenantActivo + requireRol(PROPIETARIO/ADMIN)

tenantRouter.get(
  "/invitaciones",
  requireAuth,
  requireTenantActivo,
  requireRol(["PROPIETARIO", "owner", "ADMIN"]),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const rawQuery = c.req.query()
    const parsed = QueryParamsInvitacionSchema.safeParse(rawQuery)
    const params = parsed.success ? parsed.data : QueryParamsInvitacionSchema.parse({})

    // T038: crearPrismaScoped garantiza aislamiento de tenant
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
