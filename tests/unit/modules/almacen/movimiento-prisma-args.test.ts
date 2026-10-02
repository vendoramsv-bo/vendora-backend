import { describe, it, expect } from "vitest"
import {
  argsListadoMovimientos,
  TIPOS_MOVIMIENTO_ALMACEN,
} from "../../../../src/modules/almacen/infrastructure/movimiento-prisma-args.js"
import { FiltroInvalidoError } from "../../../../src/modules/almacen/domain/almacen.errors.js"

const base = { take: 20, skip: 0, order: "desc" as const }

describe("argsListadoMovimientos", () => {
  it("orden por defecto createdAt desc, desempatado por id", () => {
    expect(argsListadoMovimientos(base, TIPOS_MOVIMIENTO_ALMACEN).orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }])
  })

  it("respeta orderBy/order y desempata en la misma dirección", () => {
    const { orderBy } = argsListadoMovimientos({ ...base, orderBy: "cantidad", order: "asc" }, TIPOS_MOVIMIENTO_ALMACEN)
    expect(orderBy).toEqual([{ cantidad: "asc" }, { id: "asc" }])
  })

  it("convierte cantidad a número", () => {
    const { where } = argsListadoMovimientos(
      { ...base, filterField: "cantidad", filterOp: "gt", filterValue: "5" },
      TIPOS_MOVIMIENTO_ALMACEN,
    )
    expect(where.cantidad).toEqual({ gt: 5 })
  })

  it("convierte createdAt a Date", () => {
    const { where } = argsListadoMovimientos(
      { ...base, filterField: "createdAt", filterOp: "gte", filterValue: "2026-09-01" },
      TIPOS_MOVIMIENTO_ALMACEN,
    )
    expect((where.createdAt as { gte: Date }).gte).toBeInstanceOf(Date)
  })

  it("texto sobre motivo es case-insensitive", () => {
    const { where } = argsListadoMovimientos(
      { ...base, filterField: "motivo", filterOp: "contains", filterValue: "Ajuste" },
      TIPOS_MOVIMIENTO_ALMACEN,
    )
    expect(where.motivo).toEqual({ contains: "Ajuste", mode: "insensitive" })
  })

  it("un tipo fuera del enum de la tabla no matchea nada, en vez de romper Prisma", () => {
    const { where } = argsListadoMovimientos(
      { ...base, filterField: "tipo", filterOp: "equals", filterValue: "ENTRADA" },
      TIPOS_MOVIMIENTO_ALMACEN, // insumos usan INGRESO
    )
    expect(where.tipo).toEqual({ in: [] })
  })

  it("search sigue funcionando sobre motivo", () => {
    const { where } = argsListadoMovimientos({ ...base, search: "inv" }, TIPOS_MOVIMIENTO_ALMACEN)
    expect(where.OR).toEqual([{ motivo: { contains: "inv", mode: "insensitive" } }])
  })

  it("operador incompatible → FiltroInvalidoError", () => {
    expect(() =>
      argsListadoMovimientos({ ...base, filterField: "cantidad", filterOp: "contains", filterValue: "1" }, TIPOS_MOVIMIENTO_ALMACEN),
    ).toThrow(FiltroInvalidoError)
  })
})
