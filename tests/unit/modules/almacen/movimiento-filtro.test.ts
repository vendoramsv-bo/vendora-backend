import { describe, it, expect } from "vitest"
import { convertirValorFiltro, normalizarFiltro } from "../../../../src/modules/almacen/domain/movimiento-filtro.js"
import { FiltroInvalidoError } from "../../../../src/modules/almacen/domain/almacen.errors.js"

describe("convertirValorFiltro", () => {
  it("cantidad: convierte a número", () => {
    expect(convertirValorFiltro("cantidad", "5")).toBe(5)
    expect(convertirValorFiltro("cantidad", "-2.5")).toBe(-2.5)
  })

  it("cantidad: rechaza lo que no es número", () => {
    expect(() => convertirValorFiltro("cantidad", "abc")).toThrow(FiltroInvalidoError)
    expect(() => convertirValorFiltro("cantidad", "")).toThrow(FiltroInvalidoError)
  })

  it("createdAt: convierte a Date", () => {
    const d = convertirValorFiltro("createdAt", "2026-09-30")
    expect(d).toBeInstanceOf(Date)
    expect((d as Date).toISOString()).toBe("2026-09-30T00:00:00.000Z")
  })

  it("createdAt: rechaza fechas inválidas", () => {
    expect(() => convertirValorFiltro("createdAt", "nope")).toThrow(FiltroInvalidoError)
  })

  it("motivo: pasa el string tal cual", () => {
    expect(convertirValorFiltro("motivo", "Ingreso INS-1")).toBe("Ingreso INS-1")
  })

  it("tipo y origen: pasan el string tal cual", () => {
    expect(convertirValorFiltro("tipo", "ENTRADA")).toBe("ENTRADA")
    expect(convertirValorFiltro("origen", "INSUMO")).toBe("INSUMO")
  })

  it("el error lleva code FILTRO_INVALIDO y nombra el campo", () => {
    try {
      convertirValorFiltro("cantidad", "x")
      expect.unreachable()
    } catch (err) {
      expect((err as FiltroInvalidoError).code).toBe("FILTRO_INVALIDO")
      expect((err as Error).message).toContain("cantidad")
    }
  })
})

describe("normalizarFiltro", () => {
  it("sin filtro → null", () => {
    expect(normalizarFiltro(undefined, undefined, undefined)).toBeNull()
  })

  it("filtro incompleto → error", () => {
    expect(() => normalizarFiltro("tipo", undefined, "ENTRADA")).toThrow(FiltroInvalidoError)
    expect(() => normalizarFiltro(undefined, "equals", "x")).toThrow(FiltroInvalidoError)
  })

  it("convierte el valor según el campo", () => {
    expect(normalizarFiltro("cantidad", "gt", "5")).toEqual({ campo: "cantidad", op: "gt", valor: 5, esTexto: false })
  })

  it("marca los operadores de texto", () => {
    expect(normalizarFiltro("motivo", "contains", "ajuste")?.esTexto).toBe(true)
  })

  it.each([
    ["cantidad", "contains"],
    ["createdAt", "startsWith"],
    ["tipo", "gt"],
    ["tipo", "contains"],
    ["origen", "lt"],
    ["motivo", "gt"],
  ] as const)("rechaza %s con %s", (campo, op) => {
    expect(() => normalizarFiltro(campo, op, "1")).toThrow(FiltroInvalidoError)
  })
})
