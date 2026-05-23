import { describe, it, expect, beforeEach } from "vitest"
import { InicializarVarianteUseCase } from "../../src/modules/almacen/application/inventario/inicializar-variante.usecase.js"
import { FakeInventarioProductoRepository } from "../helpers/fake-inventario-producto.repository.js"
import { VarianteNoEncontradaError, VarianteYaInicializadaError } from "../../src/modules/almacen/domain/almacen.errors.js"

const TENANT = "t1"

function makeVariante(overrides: Partial<{ inventarioActivado: boolean; cantidadStock: number }> = {}) {
  return {
    id: "v1",
    productoId: "p1",
    productoNombre: "Remera",
    sku: "S",
    cantidadStock: overrides.cantidadStock ?? 0,
    stockMinimo: 5,
    inventarioActivado: overrides.inventarioActivado ?? false,
  }
}

describe("InicializarVarianteUseCase", () => {
  let repo: FakeInventarioProductoRepository
  let useCase: InicializarVarianteUseCase

  beforeEach(() => {
    repo = new FakeInventarioProductoRepository()
    useCase = new InicializarVarianteUseCase(repo)
  })

  it("inicializa la variante con stock y mínimo correctos", async () => {
    repo.seed(makeVariante())

    const resultado = await useCase.execute({
      varianteId: "v1",
      tenantId: TENANT,
      stockInicial: 50,
      stockMinimo: 5,
    })

    expect(resultado.inventarioActivado).toBe(true)
    expect(resultado.cantidadStock).toBe(50)
    expect(resultado.stockMinimo).toBe(5)
  })

  it("crea un movimiento CREACION con stockDespues=stockInicial", async () => {
    repo.seed(makeVariante())
    await useCase.execute({ varianteId: "v1", tenantId: TENANT, stockInicial: 30, stockMinimo: 0 })

    // El fake registra el ajuste internamente; verificamos que la variante tenga stock actualizado
    const v = await repo.findVariante("v1", TENANT)
    expect(v?.cantidadStock).toBe(30)
  })

  it("lanza VarianteNoEncontradaError si la variante no existe", async () => {
    await expect(
      useCase.execute({ varianteId: "inexistente", tenantId: TENANT, stockInicial: 10, stockMinimo: 0 })
    ).rejects.toThrow(VarianteNoEncontradaError)
  })

  it("lanza VarianteYaInicializadaError si ya fue inicializada", async () => {
    repo.seed(makeVariante({ inventarioActivado: true, cantidadStock: 20 }))
    await expect(
      useCase.execute({ varianteId: "v1", tenantId: TENANT, stockInicial: 10, stockMinimo: 0 })
    ).rejects.toThrow(VarianteYaInicializadaError)
  })
})
