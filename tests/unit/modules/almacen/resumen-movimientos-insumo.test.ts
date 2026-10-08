/**
 * Resumen del historial de un insumo (spec 033, B-04).
 *
 * El signo de `MovimientoAlmacen.cantidad` no es uniforme —SALIDA la guarda positiva,
 * AJUSTE y RECUENTO con signo—, así que las sumas salen de `stockDespues − stockAntes`,
 * que sí es consistente en todos los tipos (research R-07).
 */
import { describe, it, expect, vi } from "vitest"
import { InsumosPrismaRepository } from "../../../../src/modules/almacen/infrastructure/insumo.prisma.repository.js"
import { ResumenMovimientosInsumoUseCase } from "../../../../src/modules/almacen/application/insumo/resumen-movimientos-insumo.usecase.js"
import { InsumoNoEncontradoError } from "../../../../src/modules/almacen/domain/almacen.errors.js"

const movimientos = [
  { tipo: "CREACION", cantidad: "5", stockAntes: "0", stockDespues: "5" },
  { tipo: "INGRESO", cantidad: "10", stockAntes: "5", stockDespues: "15" },
  // SALIDA guarda la cantidad positiva: el delta es lo que dice la verdad.
  { tipo: "SALIDA", cantidad: "4", stockAntes: "15", stockDespues: "11" },
  { tipo: "AJUSTE", cantidad: "-1.5", stockAntes: "11", stockDespues: "9.5" },
  { tipo: "RECUENTO", cantidad: "0.5", stockAntes: "9.5", stockDespues: "10" },
]

function dbFalsa(insumo: unknown = { id: "i1", cantidadStock: "10.0000", unidadMedida: { sigla: "kg" } }) {
  return {
    insumo: { findFirst: vi.fn().mockResolvedValue(insumo) },
    movimientoAlmacen: { findMany: vi.fn().mockResolvedValue(movimientos) },
  }
}

describe("ResumenMovimientosInsumoUseCase", () => {
  it("suma entradas y salidas por delta, con CREACION como entrada", async () => {
    const db = dbFalsa()
    const r = await new ResumenMovimientosInsumoUseCase(new InsumosPrismaRepository(db)).execute("i1", "t")
    expect(r).toEqual({ entradas: 15.5, salidas: -5.5, stockActual: 10, unidad: "kg" })
    expect(db.movimientoAlmacen.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { insumoId: "i1", tenantId: "t" } }),
    )
  })

  it("entradas + salidas explica el stock cuando el historial está completo", async () => {
    const r = await new ResumenMovimientosInsumoUseCase(new InsumosPrismaRepository(dbFalsa())).execute("i1", "t")
    expect(r.entradas + r.salidas).toBe(r.stockActual)
  })

  it("un insumo que no existe en el tenant responde no encontrado", async () => {
    await expect(
      new ResumenMovimientosInsumoUseCase(new InsumosPrismaRepository(dbFalsa(null))).execute("i1", "t"),
    ).rejects.toBeInstanceOf(InsumoNoEncontradoError)
  })
})
