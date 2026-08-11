import type { Context, MiddlewareHandler } from "hono"
import { auth } from "../modules/autenticacion/infrastructure/better-auth.setup.js"
import { derivarAlcance, type Alcance } from "./alcance.js"

// CANÓNICO: el rol "owner" que asigna Better-Auth al creador de una organización
// es equivalente a "PROPIETARIO" en el dominio. Toda comparación de rol debe
// tratarlos como sinónimos. La extensión Prisma (core/prisma-scoped.ts) normaliza
// "owner" → "PROPIETARIO" al leer; los guards aceptan ambos como defensa adicional.

export const ROL_PROPIETARIO = "PROPIETARIO"

export function esPropietario(rol: string): boolean {
  return rol === "owner" || rol === "PROPIETARIO"
}

// ─── Conjuntos de roles por módulo (023 contracts §A.6) ──────────────────────
//
// El mapa de acceso aprobado concede a roles operativos secciones que estos
// endpoints restringían a ["PROPIETARIO","ADMIN"]. Sin esto el menú del cliente
// promete pantallas que responden 403, que es peor que el ruido que la feature
// viene a quitar.
//
// **Dirección del cambio**: todas las entradas AGREGAN roles. Ninguna quita.
// Ningún rol pierde acceso que hoy tenga.
//
// Los conjuntos son la unión de las tres verticales a propósito: el backend
// sirve a las tres y un rol que no existe en una vertical no puede aparecer en
// una membresía suya. Ampliar por vertical exigiría consultar la capability del
// tenant en cada guard para no conceder nada nuevo.

const BASE = ["PROPIETARIO", "ADMIN"] as const

/** Gestionar productos y categorías: + BODEGUERO (tienda) y ENCARGADO (restaurante). */
export const ROLES_CATALOGO_ESCRITURA = [...BASE, "BODEGUERO", "ENCARGADO"]

/**
 * Mirar el catálogo sin poder tocarlo — el modo `consulta` del mapa.
 *
 * **Hoy ningún endpoint lo usa, y es correcto que así sea.** Contracts §A.6
 * daba por hecho que un mismo `requireRol(["PROPIETARIO","ADMIN"])` cubría el
 * GET y el POST del mismo recurso; al implementarlo se verificó que **los 12
 * GET de catálogo no llevan guard de rol**: la lectura ya está abierta a
 * cualquier miembro del negocio, que es al menos tan permisivo como el modo
 * `consulta` que el mapa concede. Ponerle este guard hoy *quitaría* acceso
 * —al rol por defecto `member`, entre otros—, y la regla de la ampliación es
 * que ningún rol pierde lo que ya tiene.
 *
 * Queda declarado para el día que un GET de catálogo necesite guard: ese día el
 * conjunto correcto es éste y no hay que volver a derivarlo del mapa.
 */
export const ROLES_CATALOGO_LECTURA = [
  ...ROLES_CATALOGO_ESCRITURA,
  "VENDEDOR",
  "MEDICO",
  "RECEPCIONISTA",
  "CHEF",
  "MESERO",
]

/** Inventario, operaciones de almacén e insumos: + BODEGUERO, ENCARGADO, CHEF. */
export const ROLES_ALMACEN = [...BASE, "BODEGUERO", "ENCARGADO", "CHEF"]

/** Compras y proveedores: + BODEGUERO, ENCARGADO. */
export const ROLES_ABASTECIMIENTO = [...BASE, "BODEGUERO", "ENCARGADO"]

/** Clientes y gastos: + VENDEDOR, RECEPCIONISTA, ENCARGADO. */
export const ROLES_ATENCION = [...BASE, "VENDEDOR", "RECEPCIONISTA", "ENCARGADO"]

/**
 * Leer puntos de venta y turnos de atención. Hace falta para **abrir caja**:
 * sin esto, un vendedor ve la sección Caja en el menú y no puede empezar a
 * trabajar. La escritura (crear o editar un punto de venta) no se toca.
 */
export const ROLES_PUNTO_VENTA_LECTURA = [...ROLES_ATENCION, "MESERO"]

// ─── Tipos de variables del contexto Hono ────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BASession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>

/** Lo que deja `resolverMiembroActivo` en el contexto (023 data-model §6). */
export type MiembroActivo = {
  /** `TenantMember.id` — la autoría que firma ventas y movimientos. */
  id: string
  /** `TenantMember.role` crudo. `owner` sigue siendo sinónimo de PROPIETARIO. */
  rol: string
  /** `Tenant.estado`, para el guard de FR-024. */
  negocioEstado: string
}

export type Variables = {
  session: BASession
  usuario: { id: string; name: string; email: string; emailVerified: boolean }
  tenantId: string
  miembro: MiembroActivo
  alcance: Alcance
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

// ─── Guard requireRestaurante ─────────────────────────────────────────────────

export const requireRestaurante: MiddlewareHandler<HonoEnv> = async (c, next) => {
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
    select: { esRestaurante: true },
  })

  if (!tenant?.esRestaurante) {
    return c.json({ error: "CAPACIDAD_NO_ACTIVADA", message: "El módulo de restaurante no está habilitado para este tenant" }, 403)
  }

  await next()
}

// ─── Factory requireRol ───────────────────────────────────────────────────────

/**
 * Resuelve el miembro activo y su alcance — **una consulta por request**
 * (023 contracts §A.5, data-model §6).
 *
 * Deja en el contexto `miembro` y `alcance`, y rechaza con
 * `403 NEGOCIO_ELIMINADO` si el negocio está dado de baja. **Ese rechazo, y no
 * la ausencia del negocio en la lista, es lo que hace verdadero FR-024**
 * ("ninguna operación sobre él prospera").
 *
 * El saldo de consultas por request es **negativo**, no neutro: `requireRol`
 * hacía exactamente esta misma `findUnique` en cada endpoint guardado y la
 * descartaba después de comparar. Ahora se hace una vez y `requireRol` lee del
 * contexto.
 *
 * Debe correr después de `requireAuth` y `requireTenantActivo`.
 */
export const resolverMiembroActivo: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const session = c.get("session")
  const tenantId = c.get("tenantId")

  if (!tenantId || !session) {
    return c.json({ error: "UNAUTHORIZED", message: "Sesión o tenant no disponibles" }, 401)
  }

  const { prisma } = await import("../modules/autenticacion/infrastructure/better-auth.setup.js")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const miembro = await (prisma as any).tenantMember.findUnique({
    where: {
      organizationId_userId: { organizationId: tenantId, userId: session.user.id },
    },
    // Una consulta sobre @@unique([organizationId, userId]), con el estado del
    // negocio incluido: el guard de FR-024 no cuesta una consulta aparte.
    select: { id: true, role: true, tenant: { select: { estado: true } } },
  })

  if (!miembro) {
    return c.json(
      { error: "FORBIDDEN", message: "No sos miembro de este negocio" },
      403,
    )
  }

  const negocioEstado: string = miembro.tenant?.estado ?? "ACTIVO"

  if (negocioEstado === "ELIMINADO") {
    return c.json(
      {
        error: "NEGOCIO_ELIMINADO",
        message: "Este negocio ya no está disponible.",
      },
      403,
    )
  }

  c.set("miembro", { id: miembro.id, rol: miembro.role, negocioEstado })
  c.set("alcance", derivarAlcance(miembro.role, miembro.id))

  await next()
}

/**
 * Exige uno de los roles indicados.
 *
 * Lee del contexto en vez de consultar (023 contracts §A.5). Si
 * `resolverMiembroActivo` no corrió antes —hay cadenas de middleware que no lo
 * incluyen todavía— consulta como antes, para no romper los ~130 endpoints que
 * ya lo usan.
 */
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

    let rol = c.get("miembro")?.rol

    if (rol === undefined) {
      // Respaldo para las cadenas que todavía no montan `resolverMiembroActivo`.
      const { prisma } = await import("../modules/autenticacion/infrastructure/better-auth.setup.js")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const miembro = await (prisma as any).tenantMember.findUnique({
        where: {
          organizationId_userId: { organizationId: tenantId, userId: session.user.id },
        },
        select: { id: true, role: true },
      })
      if (!miembro) {
        return c.json(
          { error: "FORBIDDEN", message: "No tienes el rol requerido para esta acción" },
          403,
        )
      }
      rol = miembro.role
      c.set("miembro", { id: miembro.id, rol: miembro.role, negocioEstado: "ACTIVO" })
      c.set("alcance", derivarAlcance(miembro.role, miembro.id))
    }

    if (!rol || !rolesNormalizados.includes(rol)) {
      return c.json(
        { error: "FORBIDDEN", message: "No tienes el rol requerido para esta acción" },
        403,
      )
    }

    await next()
  }
}
