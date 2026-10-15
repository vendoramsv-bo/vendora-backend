import { describe, it, expect } from "vitest"
import {
  camposIdentidad,
  conflictoIdentidad,
} from "../../../../src/modules/tenant/adapters/identidad-negocio.js"

// Spec 036 del frontend, B1: el PATCH /api/tenant/config descartaba `name` y
// `logo` porque el schema no los declaraba. La configuración del negocio no
// podía guardar ni el nombre ni el logo.

describe("camposIdentidad", () => {
  it("toma name y logo del cuerpo", () => {
    expect(camposIdentidad({ name: "Tienda Ana", logo: "https://cdn/logoTenant/a.webp" })).toEqual({
      name: "Tienda Ana",
      logo: "https://cdn/logoTenant/a.webp",
    })
  })

  it("logo null quita el logo", () => {
    expect(camposIdentidad({ logo: null })).toEqual({ logo: null })
  })

  it("lo no enviado no se toca", () => {
    expect(camposIdentidad({})).toEqual({})
    expect(camposIdentidad({ name: "Tienda Ana" })).toEqual({ name: "Tienda Ana" })
  })
})

describe("conflictoIdentidad", () => {
  const p2002 = (target: unknown) => ({ code: "P2002", meta: { target } })

  it("un nombre repetido se informa en el campo nombre", () => {
    expect(conflictoIdentidad(p2002(["name"]))).toEqual({
      error: "CONFLICTO_UNICIDAD",
      message: "Ya existe un negocio con ese nombre.",
      fieldErrors: { nombre: "Ya existe un negocio con ese nombre." },
    })
  })

  it("un nombre largo repetido se informa en el campo nombreLargo", () => {
    expect(conflictoIdentidad(p2002("Tenant_nombreLargo_key"))?.fieldErrors).toEqual({
      nombreLargo: "Ya existe un negocio con ese nombre largo.",
    })
  })

  it("otro error no es un conflicto de identidad", () => {
    expect(conflictoIdentidad(new Error("x"))).toBeNull()
    expect(conflictoIdentidad(p2002(["slug"]))).toBeNull()
  })
})
