import { describe, it, expect, beforeEach } from "vitest"
import { CrearIngresoUseCase } from "../../src/modules/almacen/application/almacen/crear-ingreso.usecase.js"
import { FakeInsumoRepository } from "../helpers/fake-insumo.repository.js"
import { FakeAlmacenNotificador } from "../helpers/fake-almacen-notificador.js"
import type { IIngresoAlmacenRepository } from "../../src/modules/almacen/domain/ports/IIngresoAlmacenRepository.js"
import { ProveedorNoEncontradoError, InsumoNoEncontradoError, DetalleVacioError } from "../../src/modules/almacen/domain/almacen.errors.js"

const TENANT = "t1"
const PROVEEDOR_ID = "prov-1"

function makeInsumo(id: string, stock: number, minimo: number) {
  return {
    id,
    tenantId: TENANT,
    nombre: `Insumo ${id}`,
    unidadMedidaId: "um-1",
    cantidadStock: stock,
    stockMinimo: minimo,
    costoUnitario: 50,
    fechaVencimiento: null,
    estado: "ACTIVO",
    createdAt: new Date(),
  }
}

function makeFakeIngresoRepo(stockDespuesMap: Record<string, number> = {}): IIngresoAlmacenRepository {
  return {
    create: async (dto) => ({
      ingresoId: "ingreso-1",
      detalles: dto.detalles.map((d) => ({
        insumoId: d.insumoId,
        insumoNombre: `Insumo ${d.insumoId}`,
        cantidad: d.cantidad,
        stockAntes: 0,
        stockDespues: stockDespuesMap[d.insumoId] ?? d.cantidad,
        stockMinimo: 5,
      })),
    }),
    findById: async () => null,
    listar: async () => ({ data: [], total: 0 }),
  }
}

function makeFakeDb(proveedorExists: boolean) {
  return {
    proveedor: {
      findFirst: async () => (proveedorExists ? { id: PROVEEDOR_ID } : null),
    },
  }
}

describe("CrearIngresoUseCase", () => {
  let insumoRepo: FakeInsumoRepository
  let notif: FakeAlmacenNotificador

  beforeEach(() => {
    insumoRepo = new FakeInsumoRepository()
    notif = new FakeAlmacenNotificador()
  })

  it("crea el ingreso correctamente", async () => {
    insumoRepo.seed(makeInsumo("ins-1", 10, 5))
    const ingresoRepo = makeFakeIngresoRepo({ "ins-1": 20 })
    const db = makeFakeDb(true)
    const useCase = new CrearIngresoUseCase(ingresoRepo, insumoRepo, db, notif)

    const result = await useCase.execute({
      tenantId: TENANT,
      proveedorId: PROVEEDOR_ID,
      detalles: [{ insumoId: "ins-1", cantidad: 10 }],
    })

    expect(result.ingresoId).toBe("ingreso-1")
    expect(result.detalles).toHaveLength(1)
  })

  it("lanza DetalleVacioError si no hay detalles", async () => {
    const ingresoRepo = makeFakeIngresoRepo()
    const db = makeFakeDb(true)
    const useCase = new CrearIngresoUseCase(ingresoRepo, insumoRepo, db, notif)

    await expect(
      useCase.execute({ tenantId: TENANT, proveedorId: PROVEEDOR_ID, detalles: [] })
    ).rejects.toThrow(DetalleVacioError)
  })

  it("lanza ProveedorNoEncontradoError si el proveedor no pertenece al tenant", async () => {
    const ingresoRepo = makeFakeIngresoRepo()
    const db = makeFakeDb(false)
    const useCase = new CrearIngresoUseCase(ingresoRepo, insumoRepo, db, notif)

    await expect(
      useCase.execute({
        tenantId: TENANT,
        proveedorId: PROVEEDOR_ID,
        detalles: [{ insumoId: "ins-1", cantidad: 10 }],
      })
    ).rejects.toThrow(ProveedorNoEncontradoError)
  })

  it("lanza InsumoNoEncontradoError si un insumo no existe", async () => {
    const ingresoRepo = makeFakeIngresoRepo()
    const db = makeFakeDb(true)
    const useCase = new CrearIngresoUseCase(ingresoRepo, insumoRepo, db, notif)

    await expect(
      useCase.execute({
        tenantId: TENANT,
        proveedorId: PROVEEDOR_ID,
        detalles: [{ insumoId: "no-existe", cantidad: 10 }],
      })
    ).rejects.toThrow(InsumoNoEncontradoError)
  })

  it("emite insumoStockNormalizado cuando el stock sube por encima del mínimo", async () => {
    insumoRepo.seed(makeInsumo("ins-1", 2, 10))
    // stockDespues=15 cruza el mínimo 10 desde abajo
    const ingresoRepo = makeFakeIngresoRepo({ "ins-1": 15 })
    const db = makeFakeDb(true)
    const useCase = new CrearIngresoUseCase(ingresoRepo, insumoRepo, db, notif)

    await useCase.execute({
      tenantId: TENANT,
      proveedorId: PROVEEDOR_ID,
      detalles: [{ insumoId: "ins-1", cantidad: 13 }],
    })

    expect(notif.tieneEvento("almacen:insumo:stock:normalizado")).toBe(true)
  })

  it("no emite eventos cuando el stock ya superaba el mínimo", async () => {
    insumoRepo.seed(makeInsumo("ins-1", 20, 5))
    const ingresoRepo = makeFakeIngresoRepo({ "ins-1": 30 })
    const db = makeFakeDb(true)
    const useCase = new CrearIngresoUseCase(ingresoRepo, insumoRepo, db, notif)

    await useCase.execute({
      tenantId: TENANT,
      proveedorId: PROVEEDOR_ID,
      detalles: [{ insumoId: "ins-1", cantidad: 10 }],
    })

    expect(notif.eventos).toHaveLength(0)
  })
})
