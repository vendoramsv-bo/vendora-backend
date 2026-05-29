import { describe, it, expect, beforeEach } from "vitest"
import { CrearIngresoUseCase } from "../../src/modules/almacen/application/almacen/crear-ingreso.usecase.js"
import { FakeInsumoRepository } from "../helpers/fake-insumo.repository.js"
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

function makeFakeIngresoRepo(): IIngresoAlmacenRepository {
  return {
    create: async (_dto) => ({
      ingresoId: "ingreso-1",
      estado: "PENDIENTE",
      version: 0,
      detalles: [],
    }),
    obtenerIngreso: async () => null,
    actualizarIngreso: async () => { throw new Error("not implemented") },
    aprobarIngreso: async () => { throw new Error("not implemented") },
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

  beforeEach(() => {
    insumoRepo = new FakeInsumoRepository()
  })

  it("crea el ingreso correctamente", async () => {
    insumoRepo.seed(makeInsumo("ins-1", 10, 5))
    const ingresoRepo = makeFakeIngresoRepo()
    const db = makeFakeDb(true)
    const useCase = new CrearIngresoUseCase(ingresoRepo, insumoRepo, db)

    const result = await useCase.execute({
      tenantId: TENANT,
      proveedorId: PROVEEDOR_ID,
      detalles: [{ insumoId: "ins-1", cantidad: 10 }],
    })

    expect(result.ingresoId).toBe("ingreso-1")
    expect(result.estado).toBe("PENDIENTE")
  })

  it("lanza DetalleVacioError si no hay detalles", async () => {
    const ingresoRepo = makeFakeIngresoRepo()
    const db = makeFakeDb(true)
    const useCase = new CrearIngresoUseCase(ingresoRepo, insumoRepo, db)

    await expect(
      useCase.execute({ tenantId: TENANT, proveedorId: PROVEEDOR_ID, detalles: [] })
    ).rejects.toThrow(DetalleVacioError)
  })

  it("lanza ProveedorNoEncontradoError si el proveedor no pertenece al tenant", async () => {
    const ingresoRepo = makeFakeIngresoRepo()
    const db = makeFakeDb(false)
    const useCase = new CrearIngresoUseCase(ingresoRepo, insumoRepo, db)

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
    const useCase = new CrearIngresoUseCase(ingresoRepo, insumoRepo, db)

    await expect(
      useCase.execute({
        tenantId: TENANT,
        proveedorId: PROVEEDOR_ID,
        detalles: [{ insumoId: "no-existe", cantidad: 10 }],
      })
    ).rejects.toThrow(InsumoNoEncontradoError)
  })

  it("crea borrador sin aplicar stock cuando los insumos existen", async () => {
    insumoRepo.seed(makeInsumo("ins-1", 2, 10))
    const ingresoRepo = makeFakeIngresoRepo()
    const db = makeFakeDb(true)
    const useCase = new CrearIngresoUseCase(ingresoRepo, insumoRepo, db)

    const result = await useCase.execute({
      tenantId: TENANT,
      proveedorId: PROVEEDOR_ID,
      detalles: [{ insumoId: "ins-1", cantidad: 13 }],
    })

    expect(result.estado).toBe("PENDIENTE")
  })

  it("no emite eventos al crear (las notificaciones ocurren al aprobar)", async () => {
    insumoRepo.seed(makeInsumo("ins-1", 20, 5))
    const ingresoRepo = makeFakeIngresoRepo()
    const db = makeFakeDb(true)
    const useCase = new CrearIngresoUseCase(ingresoRepo, insumoRepo, db)

    const result = await useCase.execute({
      tenantId: TENANT,
      proveedorId: PROVEEDOR_ID,
      detalles: [{ insumoId: "ins-1", cantidad: 10 }],
    })

    expect(result.estado).toBe("PENDIENTE")
  })
})
