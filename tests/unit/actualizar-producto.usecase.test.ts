import { describe, it, expect, beforeEach } from "vitest"
import { ActualizarProductoUseCase } from "../../src/modules/catalogo/application/producto/actualizar-producto.usecase.js"
import { FakeProductoRepository } from "../helpers/fake-producto.repository.js"
import { FakeCatalogoNotificador } from "../helpers/fake-catalogo.notificador.js"

const TENANT = "t1"
const USER = "u1"

describe("ActualizarProductoUseCase", () => {
  let repo: FakeProductoRepository
  let notificador: FakeCatalogoNotificador
  let useCase: ActualizarProductoUseCase
  let productoId: string

  beforeEach(async () => {
    repo = new FakeProductoRepository()
    notificador = new FakeCatalogoNotificador()
    useCase = new ActualizarProductoUseCase(repo, notificador)
    const producto = await repo.crear(
      { actividadId: "act1", categoriaId: "cat1", unidadId: "uni1", codigo: "P1", nombre: "Producto", precio: 100 },
      TENANT,
      USER,
    )
    productoId = producto.id
  })

  it("crea historial cuando el precio cambia", async () => {
    await useCase.ejecutar(productoId, { precio: 200 }, TENANT, USER)
    const historico = repo.getHistorico()
    expect(historico).toHaveLength(1)
    const entrada = historico[0] as { precioAnterior: string; precioNuevo: string }
    expect(entrada.precioAnterior).toBe("100")
    expect(entrada.precioNuevo).toBe("200")
  })

  it("NO crea historial cuando el precio no cambia", async () => {
    await useCase.ejecutar(productoId, { precio: 100 }, TENANT, USER)
    expect(repo.getHistorico()).toHaveLength(0)
  })

  it("NO crea historial cuando el update no incluye precio", async () => {
    await useCase.ejecutar(productoId, { nombre: "Nuevo nombre" }, TENANT, USER)
    expect(repo.getHistorico()).toHaveLength(0)
  })

  it("emite catalogo:producto:actualizado con precio actualizado", async () => {
    await useCase.ejecutar(productoId, { precio: 150 }, TENANT, USER)
    expect(
      notificador.tieneEvento("catalogo:producto:actualizado", (p) => (p as { precio: string }).precio === "150"),
    ).toBe(true)
  })
})
