import { describe, it, expect } from "vitest"
import { derivarAlcance, whereDeAlcance } from "../../../src/core/alcance.js"

const MIEMBRO = "tm_123"

describe("derivarAlcance", () => {
  it.each(["PROPIETARIO", "owner", "ADMIN"])(
    "%s ve todo el negocio",
    (rol) => {
      expect(derivarAlcance(rol, MIEMBRO)).toEqual({ tipo: "negocio" })
    },
  )

  it.each(["VENDEDOR", "BODEGUERO", "MEDICO", "RECEPCIONISTA", "ENCARGADO", "CHEF", "MESERO"])(
    "el rol operativo %s ve solo lo suyo",
    (rol) => {
      expect(derivarAlcance(rol, MIEMBRO)).toEqual({ tipo: "propio", tenantMemberId: MIEMBRO })
    },
  )

  it.each([
    ["member", "el default de Prisma"],
    ["", "cadena vacía"],
    ["SUPERADMIN", "un rol inventado"],
  ])("el rol no reconocido %s (%s) cierra, no abre", (rol) => {
    expect(derivarAlcance(rol, MIEMBRO)).toEqual({ tipo: "propio", tenantMemberId: MIEMBRO })
  })

  it("null y undefined también cierran", () => {
    expect(derivarAlcance(null, MIEMBRO)).toEqual({ tipo: "propio", tenantMemberId: MIEMBRO })
    expect(derivarAlcance(undefined, MIEMBRO)).toEqual({ tipo: "propio", tenantMemberId: MIEMBRO })
  })
})

describe("whereDeAlcance — FR-019", () => {
  it("el alcance propio filtra por igualdad", () => {
    expect(whereDeAlcance({ tipo: "propio", tenantMemberId: MIEMBRO })).toEqual({
      tenantMemberId: MIEMBRO,
    })
  })

  it("NUNCA genera un OR que incluya las filas sin autor", () => {
    // La igualdad SQL excluye los NULL, y eso es lo que FR-019 pide. Un
    // `OR: [{ tenantMemberId: id }, { tenantMemberId: null }]` le atribuiría a
    // una persona operaciones que no registró.
    const where = whereDeAlcance({ tipo: "propio", tenantMemberId: MIEMBRO })
    expect(where).not.toHaveProperty("OR")
    expect(JSON.stringify(where)).not.toContain("null")
  })

  it("el alcance de negocio no filtra por miembro: las filas sin autor se cuentan", () => {
    expect(whereDeAlcance({ tipo: "negocio" })).toEqual({})
  })
})
