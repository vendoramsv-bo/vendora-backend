import { describe, it, expect, beforeEach } from "vitest"
import { CrearVarianteUseCase } from "../../src/modules/catalogo/application/producto/crear-variante.usecase.js"
import { VarianteSkuDuplicado, VarianteAtributosDuplicados } from "../../src/modules/catalogo/domain/catalogo.errors.js"
import { FakeProductoRepository } from "../helpers/fake-producto.repository.js"

const TENANT = "t1"
const USER = "u1"

describe("CrearVarianteUseCase", () => {
  let repo: FakeProductoRepository
  let useCase: CrearVarianteUseCase
  let productoId: string

  beforeEach(async () => {
    repo = new FakeProductoRepository()
    useCase = new CrearVarianteUseCase(repo)
    const producto = await repo.crear(
      { actividadId: "act1", categoriaId: "cat1", unidadId: "uni1", codigo: "P1", nombre: "Remera" },
      TENANT,
      USER,
    )
    productoId = producto.id
  })

  it("crea variante exitosamente con combinación nueva", async () => {
    const variante = await useCase.ejecutar(productoId, { sku: "REM-S", precio: 29.99, atributoValorIds: ["val-s"] }, TENANT)
    expect((variante as { sku: string }).sku).toBe("REM-S")
  })

  it("lanza VarianteSkuDuplicado si sku ya existe en el producto", async () => {
    await useCase.ejecutar(productoId, { sku: "REM-S", atributoValorIds: ["val-s"] }, TENANT)
    await expect(
      useCase.ejecutar(productoId, { sku: "REM-S", atributoValorIds: ["val-m"] }, TENANT),
    ).rejects.toThrow(VarianteSkuDuplicado)
  })

  it("lanza VarianteAtributosDuplicados si misma combinación de atributos ya existe", async () => {
    await useCase.ejecutar(productoId, { sku: "REM-S", atributoValorIds: ["val-s"] }, TENANT)
    await expect(
      useCase.ejecutar(productoId, { sku: "REM-S-2", atributoValorIds: ["val-s"] }, TENANT),
    ).rejects.toThrow(VarianteAtributosDuplicados)
  })

  it("permite variantes con diferentes combinaciones", async () => {
    const v1 = await useCase.ejecutar(productoId, { sku: "REM-S", atributoValorIds: ["val-s"] }, TENANT)
    const v2 = await useCase.ejecutar(productoId, { sku: "REM-M", atributoValorIds: ["val-m"] }, TENANT)
    expect((v1 as { sku: string }).sku).toBe("REM-S")
    expect((v2 as { sku: string }).sku).toBe("REM-M")
  })
})
