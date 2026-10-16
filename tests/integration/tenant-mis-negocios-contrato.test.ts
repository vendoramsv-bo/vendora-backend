/**
 * Cambio B2 de la spec 037 — GET /api/tenant/mis-negocios.
 *
 * El caso de uso se prueba con un doble de Prisma que aplica el `where` que
 * recibe, así un filtro que se cayera (estado de la membresía, negocio
 * eliminado) haría aparecer la fila que no corresponde. La ruta se prueba
 * contra la app completa: spec OpenAPI y 401 sin sesión.
 */
import { describe, it, expect, vi } from "vitest"
import { MisNegociosUseCase } from "../../src/modules/tenant/application/mis-negocios.usecase.js"
import { crearAppCompleta } from "../../src/server/app.js"

const tenant = (id: string, estado: string, extra: Record<string, unknown> = {}) => ({
  id,
  slug: `slug-${id}`,
  name: `Negocio ${id}`,
  logo: null,
  estado,
  esTienda: true,
  esConsultorio: false,
  esRestaurante: false,
  ...extra,
})

const MEMBRESIAS = [
  { userId: "u1", role: "owner", estado: "ACTIVO", createdAt: 1, tenant: tenant("t1", "FINALIZADO", { logo: "https://r2/logo.webp" }) },
  { userId: "u1", role: "VENDEDOR", estado: "ACTIVO", createdAt: 2, tenant: tenant("t2", "FINALIZADO") },
  { userId: "u1", role: "ADMIN", estado: "INACTIVO", createdAt: 3, tenant: tenant("t3", "FINALIZADO") },
  { userId: "u1", role: "ADMIN", estado: "ACTIVO", createdAt: 4, tenant: tenant("t4", "ELIMINADO") },
  { userId: "otra", role: "owner", estado: "ACTIVO", createdAt: 5, tenant: tenant("t5", "FINALIZADO") },
]

type Where = { userId: string; estado: string; tenant: { estado: { not: string } } }

function crearDb() {
  return {
    tenantMember: {
      findMany: vi.fn(async (args: unknown) => {
        const { where } = args as { where: Where }
        return MEMBRESIAS.filter(
          (m) =>
            m.userId === where.userId &&
            m.estado === where.estado &&
            m.tenant.estado !== where.tenant.estado.not,
        )
          .sort((a, b) => a.createdAt - b.createdAt)
          .map(({ role, tenant: t }) => ({ role, tenant: t }))
      }),
    },
  }
}

describe("MisNegociosUseCase", () => {
  it("devuelve solo las membresías ACTIVO, con el rol normalizado", async () => {
    const negocios = await new MisNegociosUseCase(crearDb()).ejecutar("u1")

    expect(negocios.map((n) => n.id)).toEqual(["t1", "t2"])
    expect(negocios[0]).toEqual({
      id: "t1",
      slug: "slug-t1",
      nombre: "Negocio t1",
      logoUrl: "https://r2/logo.webp",
      rol: "PROPIETARIO",
      esTienda: true,
      esConsultorio: false,
      esRestaurante: false,
    })
    expect(negocios[1].rol).toBe("VENDEDOR")
  })

  it("excluye los negocios ELIMINADO", async () => {
    const negocios = await new MisNegociosUseCase(crearDb()).ejecutar("u1")
    expect(negocios.find((n) => n.id === "t4")).toBeUndefined()
  })
})

describe("GET /api/tenant/mis-negocios", () => {
  it("está en el spec con su operationId y el schema MiNegocio", async () => {
    const res = await crearAppCompleta().request("/api/openapi.json")
    const spec = await res.json()
    const op = spec.paths["/api/tenant/mis-negocios"]?.get
    expect(op?.operationId).toBe("tenant_get_mis_negocios")
    const props = Object.keys(spec.components.schemas.MiNegocio.properties).sort()
    expect(props).toEqual(
      ["esConsultorio", "esRestaurante", "esTienda", "id", "logoUrl", "nombre", "rol", "slug"],
    )
  })

  it("responde 401 sin sesión", async () => {
    const res = await crearAppCompleta().request("/api/tenant/mis-negocios")
    expect(res.status).toBe(401)
  })
})
