import { describe, it, expect, beforeEach } from "vitest"
import { CambiarEstadoInsumoUseCase } from "../../src/modules/almacen/application/insumo/cambiar-estado-insumo.usecase.js"
import { FakeInsumoRepository } from "../helpers/fake-insumo.repository.js"
import type { IRecetaProductoRepository } from "../../src/modules/almacen/domain/ports/IRecetaProductoRepository.js"
import { InsumoNoEncontradoError, InsumoEnUsoEnRecetaError } from "../../src/modules/almacen/domain/almacen.errors.js"

const TENANT = "t1"

function makeInsumo(id: string, estado = "ACTIVO") {
  return {
    id,
    tenantId: TENANT,
    nombre: `Insumo ${id}`,
    unidadMedidaId: "um-1",
    cantidadStock: 10,
    stockMinimo: 2,
    costoUnitario: 50,
    fechaVencimiento: null,
    estado,
    createdAt: new Date(),
  }
}

function makeFakeRecetaRepo(productoIds: string[] = []): IRecetaProductoRepository {
  return {
    findByProducto: async () => [],
    findByVariante: async () => [],
    upsert: async () => [],
    delete: async () => {},
    findReferencingProducts: async () => productoIds,
  }
}

describe("CambiarEstadoInsumoUseCase", () => {
  let insumoRepo: FakeInsumoRepository
  let recetaRepo: IRecetaProductoRepository
  let useCase: CambiarEstadoInsumoUseCase

  beforeEach(() => {
    insumoRepo = new FakeInsumoRepository()
    recetaRepo = makeFakeRecetaRepo()
    useCase = new CambiarEstadoInsumoUseCase(insumoRepo, recetaRepo)
  })

  it("cambia el estado a INACTIVO cuando no hay recetas activas", async () => {
    insumoRepo.seed(makeInsumo("ins-1"))

    const result = await useCase.execute("ins-1", TENANT, "INACTIVO")

    expect(result.estado).toBe("INACTIVO")
  })

  it("cambia el estado a ACTIVO sin verificar recetas", async () => {
    insumoRepo.seed(makeInsumo("ins-1", "INACTIVO"))
    recetaRepo = makeFakeRecetaRepo(["p1", "p2"])
    useCase = new CambiarEstadoInsumoUseCase(insumoRepo, recetaRepo)

    const result = await useCase.execute("ins-1", TENANT, "ACTIVO")

    expect(result.estado).toBe("ACTIVO")
  })

  it("lanza InsumoNoEncontradoError si el insumo no existe", async () => {
    await expect(
      useCase.execute("no-existe", TENANT, "INACTIVO")
    ).rejects.toThrow(InsumoNoEncontradoError)
  })

  it("lanza InsumoEnUsoEnRecetaError al intentar desactivar con recetas activas", async () => {
    insumoRepo.seed(makeInsumo("ins-1"))
    recetaRepo = makeFakeRecetaRepo(["p1", "p2"])
    useCase = new CambiarEstadoInsumoUseCase(insumoRepo, recetaRepo)

    await expect(
      useCase.execute("ins-1", TENANT, "INACTIVO")
    ).rejects.toThrow(InsumoEnUsoEnRecetaError)
  })
})
