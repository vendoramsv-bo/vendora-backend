import { describe, it, expect, beforeEach } from "vitest"
import { DefinirRecetaUseCase } from "../../src/modules/almacen/application/receta/definir-receta.usecase.js"
import { FakeRecetaProductoRepository } from "../helpers/fake-receta-producto.repository.js"
import { FakeInsumoRepository } from "../helpers/fake-insumo.repository.js"
import { InsumoNoEncontradoError } from "../../src/modules/almacen/domain/almacen.errors.js"

const TENANT = "t1"

function makeInsumo(id: string) {
  return {
    id,
    tenantId: TENANT,
    nombre: `Insumo ${id}`,
    unidadMedidaId: "um-1",
    cantidadStock: 100,
    stockMinimo: 5,
    costoUnitario: 10,
    fechaVencimiento: null,
    estado: "ACTIVO",
    createdAt: new Date(),
  }
}

describe("DefinirRecetaUseCase", () => {
  let recetaRepo: FakeRecetaProductoRepository
  let insumoRepo: FakeInsumoRepository
  let useCase: DefinirRecetaUseCase

  beforeEach(() => {
    recetaRepo = new FakeRecetaProductoRepository()
    insumoRepo = new FakeInsumoRepository()
    useCase = new DefinirRecetaUseCase(recetaRepo, insumoRepo)
  })

  it("define la receta de un producto correctamente", async () => {
    insumoRepo.seed(makeInsumo("ins-1"))
    insumoRepo.seed(makeInsumo("ins-2"))

    const result = await useCase.execute({
      tenantId: TENANT,
      productoId: "p1",
      varianteId: null,
      lineas: [
        { insumoId: "ins-1", cantidad: 2 },
        { insumoId: "ins-2", cantidad: 0.5 },
      ],
    })

    expect(result).toHaveLength(2)
    expect(result[0].insumoId).toBe("ins-1")
  })

  it("lanza InsumoNoEncontradoError si un insumo de la receta no existe", async () => {
    insumoRepo.seed(makeInsumo("ins-1"))

    await expect(
      useCase.execute({
        tenantId: TENANT,
        productoId: "p1",
        varianteId: null,
        lineas: [
          { insumoId: "ins-1", cantidad: 1 },
          { insumoId: "no-existe", cantidad: 1 },
        ],
      })
    ).rejects.toThrow(InsumoNoEncontradoError)
  })

  it("reemplaza la receta preexistente por la nueva", async () => {
    insumoRepo.seed(makeInsumo("ins-1"))
    insumoRepo.seed(makeInsumo("ins-2"))

    await useCase.execute({
      tenantId: TENANT,
      productoId: "p1",
      varianteId: null,
      lineas: [{ insumoId: "ins-1", cantidad: 1 }],
    })

    const result = await useCase.execute({
      tenantId: TENANT,
      productoId: "p1",
      varianteId: null,
      lineas: [{ insumoId: "ins-2", cantidad: 3 }],
    })

    expect(result).toHaveLength(1)
    expect(result[0].insumoId).toBe("ins-2")
  })
})
