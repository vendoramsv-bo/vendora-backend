import { describe, it, expect, beforeEach } from "vitest"
import { CrearOfertaUseCase } from "../../src/modules/catalogo/application/producto/crear-oferta.usecase.js"
import { OfertaSolapada } from "../../src/modules/catalogo/domain/catalogo.errors.js"
import { FakeProductoRepository } from "../helpers/fake-producto.repository.js"
import { FakeCatalogoNotificador } from "../helpers/fake-catalogo.notificador.js"

const TENANT = "t1"
const USER = "u1"

describe("CrearOfertaUseCase", () => {
  let repo: FakeProductoRepository
  let notificador: FakeCatalogoNotificador
  let useCase: CrearOfertaUseCase
  let productoId: string

  beforeEach(async () => {
    repo = new FakeProductoRepository()
    notificador = new FakeCatalogoNotificador()
    useCase = new CrearOfertaUseCase(repo, notificador)
    const producto = await repo.crear(
      { actividadId: "act1", categoriaId: "cat1", unidadId: "uni1", codigo: "P1", nombre: "TV 55", precio: 599.99 },
      TENANT,
      USER,
    )
    productoId = producto.id
  })

  it("crea oferta cuando no hay solapamiento", async () => {
    const oferta = await useCase.ejecutar(
      productoId,
      { fechaInicio: "2026-06-01T00:00:00Z", fechaFin: "2026-06-30T23:59:59Z", precioOferta: 549.99 },
      TENANT,
    )
    expect(oferta).toBeDefined()
  })

  it("lanza OfertaSolapada cuando fechas se solapan con oferta existente activa", async () => {
    await useCase.ejecutar(
      productoId,
      { fechaInicio: "2026-06-01T00:00:00Z", fechaFin: "2026-06-30T23:59:59Z", precioOferta: 549.99 },
      TENANT,
    )
    await expect(
      useCase.ejecutar(
        productoId,
        { fechaInicio: "2026-06-15T00:00:00Z", fechaFin: "2026-07-15T23:59:59Z", precioOferta: 499.99 },
        TENANT,
      ),
    ).rejects.toThrow(OfertaSolapada)
  })

  it("emite catalogo:oferta:creada al crear oferta exitosamente", async () => {
    await useCase.ejecutar(
      productoId,
      { fechaInicio: "2026-06-01T00:00:00Z", fechaFin: "2026-06-30T23:59:59Z", precioOferta: 549.99 },
      TENANT,
    )
    expect(notificador.tieneEvento("catalogo:oferta:creada")).toBe(true)
  })

  it("permite ofertas en periodos no solapados", async () => {
    await useCase.ejecutar(
      productoId,
      { fechaInicio: "2026-01-01T00:00:00Z", fechaFin: "2026-01-31T23:59:59Z", precioOferta: 499.99 },
      TENANT,
    )
    const oferta2 = await useCase.ejecutar(
      productoId,
      { fechaInicio: "2026-06-01T00:00:00Z", fechaFin: "2026-06-30T23:59:59Z", precioOferta: 549.99 },
      TENANT,
    )
    expect(oferta2).toBeDefined()
  })
})
