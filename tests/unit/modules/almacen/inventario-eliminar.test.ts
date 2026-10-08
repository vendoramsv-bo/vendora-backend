/**
 * Eliminar ajustes y recuentos pendientes (spec 032, B-01).
 *
 * Un pendiente nunca tocó el stock: se borra con sus líneas (cascada). Uno aprobado no se
 * elimina — su efecto ya está en el stock y en los movimientos.
 */
import { describe, it, expect, vi } from "vitest"
import { InventarioProductoPrismaRepository } from "../../../../src/modules/almacen/infrastructure/inventario-producto.prisma.repository.js"
import { EliminarAjusteUseCase } from "../../../../src/modules/almacen/application/inventario/eliminar-ajuste.usecase.js"
import { EliminarRecuentoUseCase } from "../../../../src/modules/almacen/application/inventario/eliminar-recuento.usecase.js"
import {
  DocumentoNoEncontradoError,
  DocumentoYaAprobadoError,
} from "../../../../src/modules/almacen/domain/almacen.errors.js"

function dbFalsa(estado: "PENDIENTE" | "APROBADO" | null) {
  const doc = estado ? { id: "d1", tenantId: "t", estado } : null
  const modelo = () => ({
    findFirst: vi.fn().mockResolvedValue(doc),
    delete: vi.fn().mockResolvedValue(doc),
  })
  return { ajusteInventario: modelo(), recuentoInventario: modelo() }
}

describe.each([
  ["ajuste", "ajusteInventario", EliminarAjusteUseCase],
  ["recuento", "recuentoInventario", EliminarRecuentoUseCase],
] as const)("eliminar un %s", (_tipo, modelo, UseCase) => {
  it("un pendiente se borra, buscándolo dentro del tenant", async () => {
    const db = dbFalsa("PENDIENTE")
    await new UseCase(new InventarioProductoPrismaRepository(db)).execute("d1", "t")
    expect(db[modelo].findFirst).toHaveBeenCalledWith({ where: { id: "d1", tenantId: "t" } })
    expect(db[modelo].delete).toHaveBeenCalledWith({ where: { id: "d1" } })
  })

  it("uno aprobado no se borra", async () => {
    const db = dbFalsa("APROBADO")
    await expect(new UseCase(new InventarioProductoPrismaRepository(db)).execute("d1", "t")).rejects.toBeInstanceOf(
      DocumentoYaAprobadoError,
    )
    expect(db[modelo].delete).not.toHaveBeenCalled()
  })

  it("uno inexistente (o de otro tenant) da no encontrado", async () => {
    const db = dbFalsa(null)
    await expect(new UseCase(new InventarioProductoPrismaRepository(db)).execute("d1", "t")).rejects.toBeInstanceOf(
      DocumentoNoEncontradoError,
    )
    expect(db[modelo].delete).not.toHaveBeenCalled()
  })
})
