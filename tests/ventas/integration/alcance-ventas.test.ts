import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Alcance de los datos por persona — 023 US2, contracts §A.1 y §A.2.
 *
 * Se ataca la ruta real con Prisma mockeado, así que lo que se verifica es
 * exactamente lo que llega a la base: el `where`. Es la única forma de que
 * FR-014 ("el recorte ocurre en el origen del dato") sea comprobable — si el
 * filtro estuviera en la UI, estos tests pasarían igual y el dato habría salido
 * del negocio hacia quien no debe recibirlo.
 */

const TENANT = "tenant-1"
const USER = "user-vendedor"

const tenantMemberFindUnique = vi.fn()
const ventaFindMany = vi.fn()
const ventaCount = vi.fn()
const tenantFindUnique = vi.fn()

vi.mock("../../../src/modules/autenticacion/infrastructure/better-auth.setup.js", () => ({
  prisma: {
    tenantMember: { findUnique: (...a: unknown[]) => tenantMemberFindUnique(...a) },
    venta: {
      findMany: (...a: unknown[]) => ventaFindMany(...a),
      count: (...a: unknown[]) => ventaCount(...a),
    },
    tenant: { findUnique: (...a: unknown[]) => tenantFindUnique(...a) },
    consultorio: { findFirst: vi.fn(async () => null) },
    atencionMedica: { findMany: vi.fn(async () => []) },
  },
  auth: { api: { getSession: vi.fn() } },
}))

vi.mock("../../../src/core/hono-context.js", async () => {
  const real = await vi.importActual<typeof import("../../../src/core/hono-context.js")>(
    "../../../src/core/hono-context.js",
  )
  return {
    ...real,
    requireAuth: async (c: any, next: any) => {
      c.set("session", { user: { id: USER }, session: { activeOrganizationId: TENANT } })
      await next()
    },
  }
})

const { ventaRouter } = await import("../../../src/modules/ventas/adapters/venta.rest.js")
const { requireAuth, requireTenantActivo } = await import("../../../src/core/hono-context.js")
const { OpenAPIHono } = await import("@hono/zod-openapi")

const app = new OpenAPIHono<any>()
app.use("*", requireAuth, requireTenantActivo)
app.route("/ventas", ventaRouter)

/** Configura quién está pidiendo. */
function como(rol: string, miembroId = "tm-vendedor", estado = "ACTIVO") {
  tenantMemberFindUnique.mockResolvedValue({
    id: miembroId,
    role: rol,
    tenant: { estado },
  })
}

/** El `where` con el que se llamó a `venta.findMany`. */
function whereDeLaConsulta(): Record<string, unknown> {
  expect(ventaFindMany).toHaveBeenCalled()
  return (ventaFindMany.mock.calls[0][0] as any).where
}

beforeEach(() => {
  vi.clearAllMocks()
  ventaFindMany.mockResolvedValue([])
  ventaCount.mockResolvedValue(0)
  tenantFindUnique.mockResolvedValue({ esConsultorio: false })
})

describe("GET /ventas — alcance (contracts §A.2, FR-016)", () => {
  it("un rol operativo solo consulta lo suyo", async () => {
    como("VENDEDOR", "tm-vendedor")
    const res = await app.request("/ventas")
    expect(res.status).toBe(200)
    expect(whereDeLaConsulta()).toMatchObject({ tenantId: TENANT, tenantMemberId: "tm-vendedor" })
  })

  it("PROPIETARIO no filtra por miembro: las ventas sin autor se cuentan (FR-019)", async () => {
    como("owner", "tm-dueno")
    await app.request("/ventas")
    expect(whereDeLaConsulta()).not.toHaveProperty("tenantMemberId")
  })

  it("ADMIN tampoco filtra por miembro", async () => {
    como("ADMIN", "tm-admin")
    await app.request("/ventas")
    expect(whereDeLaConsulta()).not.toHaveProperty("tenantMemberId")
  })

  it("el rol no reconocido cierra: ve solo lo suyo", async () => {
    // `TenantMember.role` tiene @default("member"): este caso no es teórico.
    como("member", "tm-nuevo")
    await app.request("/ventas")
    expect(whereDeLaConsulta()).toMatchObject({ tenantMemberId: "tm-nuevo" })
  })

  it("NUNCA arma un OR que incluya las ventas sin autor (FR-019)", async () => {
    como("VENDEDOR", "tm-vendedor")
    await app.request("/ventas")
    const where = whereDeLaConsulta()
    expect(where).not.toHaveProperty("OR")
    expect(JSON.stringify(where)).not.toContain("null")
  })

  it("el alcance se aplica ADEMÁS de los filtros del cliente, no en lugar de", async () => {
    como("VENDEDOR", "tm-vendedor")
    await app.request("/ventas?estadoPago=PAGADO&tipoPago=EFECTIVO")
    expect(whereDeLaConsulta()).toMatchObject({
      tenantId: TENANT,
      tenantMemberId: "tm-vendedor",
      estadoPago: "PAGADO",
      tipoPago: "EFECTIVO",
    })
  })

  it("un tenantMemberId enviado por el cliente se ignora en silencio", async () => {
    // Sin 400: un 400 revelaría que el parámetro existe (contracts, "Principio
    // que gobierna los cuatro").
    como("VENDEDOR", "tm-vendedor")
    const res = await app.request("/ventas?tenantMemberId=tm-de-un-companero")
    expect(res.status).toBe(200)
    expect(whereDeLaConsulta().tenantMemberId).toBe("tm-vendedor")
  })

  it("un PROPIETARIO tampoco puede pedir los números de otro por query string", async () => {
    como("owner", "tm-dueno")
    await app.request("/ventas?tenantMemberId=tm-vendedor")
    expect(whereDeLaConsulta()).not.toHaveProperty("tenantMemberId")
  })
})

describe("GET /ventas/reporte-consolidado — alcance (contracts §A.1)", () => {
  it("un VENDEDOR recibe 200, no 403: el guard de rol se fue (R-06)", async () => {
    como("VENDEDOR", "tm-vendedor")
    const res = await app.request("/ventas/reporte-consolidado")
    expect(res.status).toBe(200)
  })

  it("sin ventas propias en el período devuelve 200 con data vacía (FR-018)", async () => {
    como("VENDEDOR", "tm-vendedor")
    ventaFindMany.mockResolvedValue([])
    const res = await app.request("/ventas/reporte-consolidado?fechaDesde=2026-01-01")
    expect(res.status).toBe(200)
    expect((await res.json()).data).toEqual([])
  })

  it("recorta el consolidado al miembro que pregunta", async () => {
    como("VENDEDOR", "tm-vendedor")
    await app.request("/ventas/reporte-consolidado")
    expect(whereDeLaConsulta()).toMatchObject({ tenantMemberId: "tm-vendedor" })
  })

  it("PROPIETARIO recibe todo el negocio", async () => {
    como("PROPIETARIO", "tm-dueno")
    await app.request("/ventas/reporte-consolidado")
    expect(whereDeLaConsulta()).not.toHaveProperty("tenantMemberId")
  })

  it("respeta el rango de fechas que manda el cliente", async () => {
    como("ADMIN", "tm-admin")
    await app.request("/ventas/reporte-consolidado?fechaDesde=2026-06-01&fechaHasta=2026-06-30")
    const where = whereDeLaConsulta()
    expect(where.fecha).toBeDefined()
  })
})

describe("resolverMiembroActivo — negocio dado de baja (FR-024)", () => {
  it("responde 403 NEGOCIO_ELIMINADO y no consulta nada más", async () => {
    como("PROPIETARIO", "tm-dueno", "ELIMINADO")
    const res = await app.request("/ventas")
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe("NEGOCIO_ELIMINADO")
    expect(ventaFindMany).not.toHaveBeenCalled()
  })

  it("quien no es miembro del negocio recibe 403", async () => {
    tenantMemberFindUnique.mockResolvedValue(null)
    const res = await app.request("/ventas")
    expect(res.status).toBe(403)
  })
})
