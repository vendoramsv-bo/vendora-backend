import { describe, it, expect } from "vitest"
import { validarReordenamiento } from "../../../../../src/modules/tenant/domain/lista-ordenada.js"
import { OrdenDesactualizadoError } from "../../../../../src/modules/tenant/domain/tenant.errors.js"

describe("validarReordenamiento", () => {
  const actuales = ["a", "b", "c"]

  it("acepta una permutación exacta", () => {
    expect(() => validarReordenamiento(actuales, ["c", "a", "b"])).not.toThrow()
  })

  it.each([
    ["faltantes", ["a", "b"]],
    ["repetidos", ["a", "a", "b", "c"]],
    ["repetido que mantiene el largo", ["a", "a", "b"]],
    ["un id ajeno", ["a", "b", "x"]],
    ["un id de más", ["a", "b", "c", "x"]],
    ["vacía con elementos existentes", []],
  ])("rechaza %s", (_caso, enviados) => {
    expect(() => validarReordenamiento(actuales, enviados)).toThrow(OrdenDesactualizadoError)
  })
})
