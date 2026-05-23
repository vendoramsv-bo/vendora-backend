import { describe, it, expect, beforeEach } from "vitest"
import { CrearInsumoUseCase } from "../../src/modules/almacen/application/insumo/crear-insumo.usecase.js"
import { FakeInsumoRepository } from "../helpers/fake-insumo.repository.js"
import { InsumoNombreDuplicadoError } from "../../src/modules/almacen/domain/almacen.errors.js"

const TENANT = "t1"

describe("CrearInsumoUseCase", () => {
  let repo: FakeInsumoRepository
  let useCase: CrearInsumoUseCase

  beforeEach(() => {
    repo = new FakeInsumoRepository()
    useCase = new CrearInsumoUseCase(repo)
  })

  it("crea un insumo nuevo correctamente", async () => {
    const result = await useCase.execute({
      tenantId: TENANT,
      nombre: "Harina",
      unidadMedidaId: "um-1",
      stockMinimo: 5,
      costoUnitario: 100,
    })

    expect(result.id).toBeDefined()
    expect(result.nombre).toBe("Harina")
    expect(result.cantidadStock).toBe(0)
    expect(result.estado).toBe("ACTIVO")
  })

  it("lanza InsumoNombreDuplicadoError si ya existe un insumo con el mismo nombre", async () => {
    repo.seed({
      id: "ins-1",
      tenantId: TENANT,
      nombre: "Harina",
      unidadMedidaId: "um-1",
      cantidadStock: 0,
      stockMinimo: 5,
      costoUnitario: 100,
      fechaVencimiento: null,
      estado: "ACTIVO",
      createdAt: new Date(),
    })

    await expect(
      useCase.execute({ tenantId: TENANT, nombre: "Harina", unidadMedidaId: "um-1" })
    ).rejects.toThrow(InsumoNombreDuplicadoError)
  })

  it("permite crear insumos con el mismo nombre en distintos tenants", async () => {
    repo.seed({
      id: "ins-1",
      tenantId: "t2",
      nombre: "Harina",
      unidadMedidaId: "um-1",
      cantidadStock: 0,
      stockMinimo: 0,
      costoUnitario: 0,
      fechaVencimiento: null,
      estado: "ACTIVO",
      createdAt: new Date(),
    })

    await expect(
      useCase.execute({ tenantId: TENANT, nombre: "Harina", unidadMedidaId: "um-1" })
    ).resolves.toBeDefined()
  })
})
