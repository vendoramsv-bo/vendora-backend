/**
 * Ciclo del recuento de almacén: pendiente → aprobado (spec 033, B-05).
 *
 * Antes registrar aplicaba lo contado al stock en el mismo paso. Ahora registrar solo
 * guarda; aprobar fija el stock, escribe un movimiento RECUENTO por línea y avisa los
 * cruces del stock mínimo.
 */
import { describe, it, expect, vi } from "vitest"
import { RecuentoAlmacenPrismaRepository } from "../../../../src/modules/almacen/infrastructure/recuento-almacen.prisma.repository.js"
import { RegistrarRecuentoAlmacenUseCase } from "../../../../src/modules/almacen/application/almacen/registrar-recuento-almacen.usecase.js"
import {
  ActualizarRecuentoAlmacenUseCase,
  AprobarRecuentoAlmacenUseCase,
  EliminarRecuentoAlmacenUseCase,
  ObtenerRecuentoAlmacenUseCase,
} from "../../../../src/modules/almacen/application/almacen/recuento-almacen.usecases.js"
import {
  ConflictoVersionError,
  DocumentoNoEncontradoError,
  DocumentoYaAprobadoError,
  FechaFuturaError,
} from "../../../../src/modules/almacen/domain/almacen.errors.js"
import type { IAlmacenNotificador } from "../../../../src/modules/almacen/domain/ports/IAlmacenNotificador.js"

const MANANA = new Date(Date.now() + 24 * 60 * 60 * 1000)

const azucar = { id: "i1", tenantId: "t", nombre: "Azúcar", cantidadStock: "10.0000", stockMinimo: 5 }

function recuentoCrudo(estado: "PENDIENTE" | "APROBADO", version = 0) {
  return {
    id: "r1",
    tenantId: "t",
    fecha: new Date("2026-10-06T04:00:00.000Z"),
    observacion: "Mensual",
    estado,
    version,
    recuentosAlmacenDetalle: [
      { id: "d1", insumoId: "i1", stockSistema: "10", stockFisico: "3", diferencia: "-7", insumo: { ...azucar, unidadMedida: { sigla: "kg" } } },
    ],
  }
}

function dbFalsa(estado: "PENDIENTE" | "APROBADO" | null = "PENDIENTE", version = 0) {
  const tx = {
    insumo: { findFirst: vi.fn().mockResolvedValue(azucar), update: vi.fn() },
    movimientoAlmacen: { upsert: vi.fn() },
    recuentoAlmacenDetalle: { update: vi.fn() },
    recuentoAlmacen: { update: vi.fn() },
  }
  const crudo = estado ? recuentoCrudo(estado, version) : null
  return {
    tx,
    insumo: { findFirst: vi.fn().mockResolvedValue(azucar), update: vi.fn() },
    movimientoAlmacen: { create: vi.fn(), upsert: vi.fn() },
    recuentoAlmacen: {
      create: vi.fn().mockResolvedValue(recuentoCrudo("PENDIENTE")),
      findFirst: vi.fn().mockResolvedValue(crudo),
      update: vi.fn().mockResolvedValue(crudo),
      delete: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (t: unknown) => unknown) => fn(tx)),
  }
}

function notificador() {
  return { insumoStockCritico: vi.fn(), insumoStockNormalizado: vi.fn() } as unknown as IAlmacenNotificador &
    Record<string, ReturnType<typeof vi.fn>>
}

describe("registrar", () => {
  it("crea el recuento pendiente con la foto del stock, sin movimientos ni cambio de stock", async () => {
    const db = dbFalsa()
    const doc = await new RegistrarRecuentoAlmacenUseCase(new RecuentoAlmacenPrismaRepository(db)).execute({
      tenantId: "t",
      detalles: [{ insumoId: "i1", stockFisico: 3 }],
    })
    const data = db.recuentoAlmacen.create.mock.calls[0]![0].data
    expect(data.estado).toBe("PENDIENTE")
    expect(data.recuentosAlmacenDetalle.create).toEqual([
      { insumoId: "i1", stockSistema: 10, stockFisico: 3, diferencia: -7 },
    ])
    expect(db.movimientoAlmacen.create).not.toHaveBeenCalled()
    expect(db.insumo.update).not.toHaveBeenCalled()
    expect(doc.id).toBe("r1")
    expect(doc.detalles[0]).toMatchObject({ insumoNombre: "Azúcar", unidad: "kg", stockFisico: 3 })
  })

  it("una fecha futura se rechaza", async () => {
    const db = dbFalsa()
    await expect(
      new RegistrarRecuentoAlmacenUseCase(new RecuentoAlmacenPrismaRepository(db)).execute({
        tenantId: "t",
        fecha: MANANA,
        detalles: [{ insumoId: "i1", stockFisico: 3 }],
      }),
    ).rejects.toBeInstanceOf(FechaFuturaError)
  })
})

describe("obtener, actualizar y eliminar", () => {
  it("obtener uno que no existe responde RECUENTO_ALMACEN_NO_ENCONTRADO", async () => {
    const err = await new ObtenerRecuentoAlmacenUseCase(new RecuentoAlmacenPrismaRepository(dbFalsa(null)))
      .execute("r1", "t")
      .catch((e) => e)
    expect(err).toBeInstanceOf(DocumentoNoEncontradoError)
    expect(err.code).toBe("RECUENTO_ALMACEN_NO_ENCONTRADO")
  })

  it("actualizar reemplaza las líneas y vuelve a fotografiar el stock", async () => {
    const db = dbFalsa()
    await new ActualizarRecuentoAlmacenUseCase(new RecuentoAlmacenPrismaRepository(db)).execute("r1", "t", {
      observacion: null,
      detalles: [{ insumoId: "i1", stockFisico: 12 }],
    })
    const data = db.recuentoAlmacen.update.mock.calls[0]![0].data
    expect(data.observacion).toBeNull()
    expect(data.recuentosAlmacenDetalle).toEqual({
      deleteMany: {},
      create: [{ insumoId: "i1", stockSistema: 10, stockFisico: 12, diferencia: 2 }],
    })
  })

  it("no se edita ni se elimina uno aprobado", async () => {
    const repo = new RecuentoAlmacenPrismaRepository(dbFalsa("APROBADO"))
    await expect(new ActualizarRecuentoAlmacenUseCase(repo).execute("r1", "t", {})).rejects.toBeInstanceOf(
      DocumentoYaAprobadoError,
    )
    await expect(new EliminarRecuentoAlmacenUseCase(repo).execute("r1", "t")).rejects.toBeInstanceOf(
      DocumentoYaAprobadoError,
    )
  })

  it("eliminar un pendiente lo borra", async () => {
    const db = dbFalsa()
    await new EliminarRecuentoAlmacenUseCase(new RecuentoAlmacenPrismaRepository(db)).execute("r1", "t")
    expect(db.recuentoAlmacen.delete).toHaveBeenCalledWith({ where: { id: "r1" } })
  })
})

describe("aprobar", () => {
  it("fija el stock en lo contado, escribe el movimiento y sube la versión", async () => {
    const db = dbFalsa()
    const n = notificador()
    await new AprobarRecuentoAlmacenUseCase(new RecuentoAlmacenPrismaRepository(db), n).execute({
      recuentoId: "r1",
      tenantId: "t",
      version: 0,
    })
    const mov = db.tx.movimientoAlmacen.upsert.mock.calls[0]![0].create
    expect(mov).toMatchObject({ tipo: "RECUENTO", cantidad: -7, stockAntes: 10, stockDespues: 3, referenciaId: "r1" })
    expect(db.tx.insumo.update).toHaveBeenCalledWith({ where: { id: "i1" }, data: { cantidadStock: 3 } })
    expect(db.tx.recuentoAlmacen.update.mock.calls[0]![0].data).toMatchObject({ estado: "APROBADO", version: 1 })
    // De 10 a 3 con mínimo 5: cruzó el mínimo.
    expect(n.insumoStockCritico).toHaveBeenCalledWith("t", expect.objectContaining({ insumoId: "i1", stockActual: 3 }))
  })

  it("dos veces no: el segundo intento responde ya aprobado", async () => {
    const repo = new RecuentoAlmacenPrismaRepository(dbFalsa("APROBADO"))
    await expect(
      new AprobarRecuentoAlmacenUseCase(repo, notificador()).execute({ recuentoId: "r1", tenantId: "t", version: 0 }),
    ).rejects.toBeInstanceOf(DocumentoYaAprobadoError)
  })

  it("con otra versión responde conflicto, sin tocar nada", async () => {
    const db = dbFalsa("PENDIENTE", 2)
    await expect(
      new AprobarRecuentoAlmacenUseCase(new RecuentoAlmacenPrismaRepository(db), notificador()).execute({
        recuentoId: "r1",
        tenantId: "t",
        version: 0,
      }),
    ).rejects.toBeInstanceOf(ConflictoVersionError)
    expect(db.$transaction).not.toHaveBeenCalled()
  })
})
