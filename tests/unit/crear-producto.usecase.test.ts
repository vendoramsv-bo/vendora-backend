import { describe, it, expect, beforeEach } from "vitest"
import { CrearProductoUseCase } from "../../src/modules/catalogo/application/producto/crear-producto.usecase.js"
import { ProductoCodigoDuplicado, ProductoNombreDuplicado } from "../../src/modules/catalogo/domain/catalogo.errors.js"
import { FakeProductoRepository } from "../helpers/fake-producto.repository.js"
import { FakeCatalogoNotificador } from "../helpers/fake-catalogo.notificador.js"

const TENANT = "t1"
const USER = "u1"

const baseData = {
  actividadId: "act1",
  categoriaId: "cat1",
  unidadId: "uni1",
  codigo: "PROD-001",
  nombre: "Producto de prueba",
  precio: 100,
}

describe("CrearProductoUseCase", () => {
  let repo: FakeProductoRepository
  let notificador: FakeCatalogoNotificador
  let useCase: CrearProductoUseCase

  beforeEach(() => {
    repo = new FakeProductoRepository()
    notificador = new FakeCatalogoNotificador()
    useCase = new CrearProductoUseCase(repo, notificador)
  })

  it("crea producto exitosamente y emite evento", async () => {
    const producto = await useCase.ejecutar(baseData, TENANT, USER)
    expect(producto.codigo).toBe("PROD-001")
    expect(producto.nombre).toBe("Producto de prueba")
    expect(notificador.tieneEvento("catalogo:producto:creado")).toBe(true)
  })

  it("lanza ProductoCodigoDuplicado cuando el repo lanza error de codigo único", async () => {
    const repoFail = {
      ...repo,
      crear: async () => { throw new Error("catalogo_actividadId_categoriaId_codigo unique") },
      obtener: async () => null,
    } as unknown as FakeProductoRepository

    const uc = new CrearProductoUseCase(repoFail, notificador)
    await expect(uc.ejecutar(baseData, TENANT, USER)).rejects.toThrow(ProductoCodigoDuplicado)
    expect(notificador.tieneEvento("catalogo:producto:creado")).toBe(false)
  })

  it("lanza ProductoNombreDuplicado cuando el repo lanza error de nombre único", async () => {
    const repoFail = {
      ...repo,
      crear: async () => { throw new Error("catalogo_actividadId_categoriaId_nombre unique") },
      obtener: async () => null,
    } as unknown as FakeProductoRepository

    const uc = new CrearProductoUseCase(repoFail, notificador)
    await expect(uc.ejecutar(baseData, TENANT, USER)).rejects.toThrow(ProductoNombreDuplicado)
  })
})
