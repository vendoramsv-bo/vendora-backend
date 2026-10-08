/**
 * Eliminar ingresos y salidas de almacén pendientes (spec 033, B-02).
 *
 * Un pendiente nunca tocó el stock: se borra con sus líneas (cascada). Uno aprobado no se
 * elimina — su efecto ya está en el stock y en los movimientos.
 */
import { describe, it, expect, vi } from "vitest"
import { IngresoAlmacenPrismaRepository } from "../../../../src/modules/almacen/infrastructure/ingreso-almacen.prisma.repository.js"
import { SalidaAlmacenPrismaRepository } from "../../../../src/modules/almacen/infrastructure/salida-almacen.prisma.repository.js"
import { EliminarIngresoUseCase } from "../../../../src/modules/almacen/application/almacen/eliminar-ingreso.usecase.js"
import { EliminarSalidaUseCase } from "../../../../src/modules/almacen/application/almacen/eliminar-salida.usecase.js"
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
  return { ingresoAlmacen: modelo(), salidaAlmacen: modelo() }
}

describe.each([
  ["ingreso", "ingresoAlmacen", "INGRESO_NO_ENCONTRADO", (db: unknown) => new EliminarIngresoUseCase(new IngresoAlmacenPrismaRepository(db))],
  ["salida", "salidaAlmacen", "SALIDA_NO_ENCONTRADO", (db: unknown) => new EliminarSalidaUseCase(new SalidaAlmacenPrismaRepository(db))],
] as const)("eliminar un %s", (_tipo, modelo, codigo, crear) => {
  it("un pendiente se borra, buscándolo dentro del tenant", async () => {
    const db = dbFalsa("PENDIENTE")
    await crear(db).execute("d1", "t")
    expect(db[modelo].findFirst).toHaveBeenCalledWith({ where: { id: "d1", tenantId: "t" } })
    expect(db[modelo].delete).toHaveBeenCalledWith({ where: { id: "d1" } })
  })

  it("uno aprobado no se borra", async () => {
    const db = dbFalsa("APROBADO")
    await expect(crear(db).execute("d1", "t")).rejects.toBeInstanceOf(DocumentoYaAprobadoError)
    expect(db[modelo].delete).not.toHaveBeenCalled()
  })

  it("uno que no existe en el tenant responde no encontrado", async () => {
    const db = dbFalsa(null)
    const err = await crear(db).execute("d1", "t").catch((e) => e)
    expect(err).toBeInstanceOf(DocumentoNoEncontradoError)
    expect(err.code).toBe(codigo)
  })
})
