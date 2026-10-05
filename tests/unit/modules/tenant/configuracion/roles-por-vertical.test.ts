import { describe, it, expect } from "vitest"
import {
  rolesAsignables,
  normalizarRol,
  validarCambioDeRol,
} from "../../../../../src/modules/tenant/domain/roles-por-vertical.js"
import { SoloPropietarioError, UnicoPropietarioError } from "../../../../../src/modules/tenant/domain/tenant.errors.js"

describe("rolesAsignables", () => {
  it("solo tienda", () => {
    expect(rolesAsignables(["tienda"])).toEqual(["PROPIETARIO", "ADMIN", "VENDEDOR", "BODEGUERO"])
  })

  it("tienda + consultorio = la unión, sin repetidos", () => {
    expect(rolesAsignables(["tienda", "consultorio"])).toEqual([
      "PROPIETARIO", "ADMIN", "VENDEDOR", "BODEGUERO", "MEDICO", "RECEPCIONISTA",
    ])
  })

  it("sin verticales → solo los de administración", () => {
    expect(rolesAsignables([])).toEqual(["PROPIETARIO", "ADMIN"])
  })
})

describe("normalizarRol", () => {
  it("owner (Better-Auth) ≡ PROPIETARIO", () => {
    expect(normalizarRol("owner")).toBe("PROPIETARIO")
    expect(normalizarRol("VENDEDOR")).toBe("VENDEDOR")
  })
})

describe("validarCambioDeRol", () => {
  it("un ADMIN no puede asignar PROPIETARIO", () => {
    expect(() => validarCambioDeRol("ADMIN", "VENDEDOR", "PROPIETARIO", 1)).toThrow(SoloPropietarioError)
  })

  it("un ADMIN no puede tocar a un propietario (ni bajarlo ni quitarlo)", () => {
    expect(() => validarCambioDeRol("ADMIN", "PROPIETARIO", "VENDEDOR", 2)).toThrow(SoloPropietarioError)
    expect(() => validarCambioDeRol("ADMIN", "PROPIETARIO", null, 2)).toThrow(SoloPropietarioError)
  })

  it("no se puede bajar ni quitar al último propietario", () => {
    expect(() => validarCambioDeRol("PROPIETARIO", "PROPIETARIO", "ADMIN", 1)).toThrow(UnicoPropietarioError)
    expect(() => validarCambioDeRol("PROPIETARIO", "PROPIETARIO", null, 1)).toThrow(UnicoPropietarioError)
  })

  it("con dos propietarios, uno puede bajar al otro", () => {
    expect(() => validarCambioDeRol("PROPIETARIO", "PROPIETARIO", "ADMIN", 2)).not.toThrow()
  })

  it("owner cuenta como PROPIETARIO", () => {
    expect(() => validarCambioDeRol("owner", "VENDEDOR", "PROPIETARIO", 1)).not.toThrow()
    expect(() => validarCambioDeRol("PROPIETARIO", "owner", null, 1)).toThrow(UnicoPropietarioError)
  })

  it("un ADMIN gestiona roles comunes", () => {
    expect(() => validarCambioDeRol("ADMIN", "VENDEDOR", "BODEGUERO", 1)).not.toThrow()
    expect(() => validarCambioDeRol("ADMIN", "VENDEDOR", null, 1)).not.toThrow()
  })
})
