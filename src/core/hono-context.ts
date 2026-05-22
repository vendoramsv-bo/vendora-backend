import type { Context, MiddlewareHandler } from "hono"
import { auth } from "../modules/autenticacion/infrastructure/better-auth.setup.js"

// CANÓNICO: el rol "owner" que asigna Better-Auth al creador de una organización
// es equivalente a "PROPIETARIO" en el dominio. Toda comparación de rol debe
// tratarlos como sinónimos. La extensión Prisma (core/prisma-scoped.ts) normaliza
// "owner" → "PROPIETARIO" al leer; los guards aceptan ambos como defensa adicional.

export const ROL_PROPIETARIO = "PROPIETARIO"

export function esPropietario(rol: string): boolean {
  return rol === "owner" || rol === "PROPIETARIO"
}

// ─── Tipos de variables del contexto Hono ────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BASession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>

export type Variables = {
  session: BASession
  usuario: { id: string; name: string; email: string; emailVerified: boolean }
  tenantId: string
}

export type HonoEnv = { Variables: Variables }

// ─── Middleware requireAuth ────────────────────────────────────────────────────

export const requireAuth: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session) {
    return c.json({ error: "UNAUTHORIZED", message: "Se requiere autenticación" }, 401)
  }

  c.set("session", session)
  c.set("usuario", {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    emailVerified: session.user.emailVerified,
  })

  await next()
}

// ─── Guard requireTenantActivo ────────────────────────────────────────────────

export const requireTenantActivo: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const session = c.get("session")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenantId = (session as any)?.session?.activeOrganizationId

  if (!tenantId) {
    return c.json(
      { error: "SIN_TENANT_ACTIVO", message: "No hay un tenant activo en la sesión" },
      400,
    )
  }

  c.set("tenantId", tenantId as string)
  await next()
}

// ─── Factory requireRol ───────────────────────────────────────────────────────

// ─── Guard requireConsultorio ─────────────────────────────────────────────────

export const requireConsultorio: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const session = c.get("session")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenantId = (session as any)?.session?.activeOrganizationId

  if (!tenantId) {
    return c.json({ error: "SIN_TENANT_ACTIVO", message: "No hay un tenant activo en la sesión" }, 403)
  }

  const { prisma } = await import("../modules/autenticacion/infrastructure/better-auth.setup.js")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenant = await (prisma as any).tenant.findUnique({
    where: { id: tenantId },
    select: { esConsultorio: true },
  })

  if (!tenant?.esConsultorio) {
    return c.json({ error: "CONSULTORIO_NO_HABILITADO", message: "El módulo de consultorio no está habilitado para este tenant" }, 403)
  }

  await next()
}

// ─── Factory requireRol ───────────────────────────────────────────────────────

export function requireRol(roles: string[]): MiddlewareHandler<HonoEnv> {
  const rolesNormalizados = roles.flatMap((r) =>
    r === "PROPIETARIO" ? ["PROPIETARIO", "owner"] : [r],
  )

  return async (c: Context<HonoEnv>, next) => {
    const session = c.get("session")
    const tenantId = c.get("tenantId")

    if (!tenantId || !session) {
      return c.json({ error: "UNAUTHORIZED", message: "Sesión o tenant no disponibles" }, 401)
    }

    const { prisma } = await import("../modules/autenticacion/infrastructure/better-auth.setup.js")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const miembro = await (prisma as any).tenantMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: tenantId,
          userId: session.user.id,
        },
      },
      select: { role: true },
    })

    if (!miembro || !rolesNormalizados.includes(miembro.role)) {
      return c.json(
        { error: "FORBIDDEN", message: "No tienes el rol requerido para esta acción" },
        403,
      )
    }

    await next()
  }
}
