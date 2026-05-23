import { describe, it, expect, beforeEach } from "vitest"
import { RegistrarRecuentoUseCase } from "../../src/modules/almacen/application/inventario/registrar-recuento.usecase.js"
import { FakeInventarioProductoRepository } from "../helpers/fake-inventario-producto.repository.js"
import { FakeAlmacenNotificador } from "../helpers/fake-almacen-notificador.js"
import {
  VarianteNoInicializadaError,
  DetalleVacioError,
} from "../../src/modules/almacen/domain/almacen.errors.js"

const TENANT = "t1"

function makeVariante(id: string, stock: number, minimo: number, activada = true) {
  return {
    id,
    productoId: "p1",
    productoNombre: "Remera",
    sku: id,
    cantidadStock: stock,
    stockMinimo: minimo,
    inventarioActivado: activada,
  }
}

describe("RegistrarRecuentoUseCase", () => {
  let repo: FakeInventarioProductoRepository
  let notif: FakeAlmacenNotificador
  let useCase: RegistrarRecuentoUseCase

  beforeEach(() => {
    repo = new FakeInventarioProductoRepository()
    notif = new FakeAlmacenNotificador()
    useCase = new RegistrarRecuentoUseCase(repo, notif)
  })

  it("ajusta el stock al valor físico contado", async () => {
    repo.seed(makeVariante("v1", 50, 5))

    const resultado = await useCase.execute({
      tenantId: TENANT,
      observacion: "Recuento semanal",
      detalles: [{ productoId: "p1", varianteId: "v1", stockFisico: 47 }],
    })

    expect(resultado.detalles[0].stockAntes).toBe(50)
    expect(resultado.detalles[0].stockDespues).toBe(47)
    expect(resultado.detalles[0].diferencia).toBe(-3)
  })

  it("crea recuento con diferencia=0 cuando el stock coincide", async () => {
    repo.seed(makeVariante("v1", 20, 5))

    const resultado = await useCase.execute({
      tenantId: TENANT,
      detalles: [{ productoId: "p1", varianteId: "v1", stockFisico: 20 }],
    })

    expect(resultado.detalles[0].diferencia).toBe(0)
    expect(resultado.recuentoId).toBeDefined()
  })

  it("lanza DetalleVacioError si no hay detalles", async () => {
    await expect(
      useCase.execute({ tenantId: TENANT, detalles: [] })
    ).rejects.toThrow(DetalleVacioError)
  })

  it("lanza VarianteNoInicializadaError si la variante no está inicializada", async () => {
    repo.seed(makeVariante("v1", 0, 5, false))

    await expect(
      useCase.execute({
        tenantId: TENANT,
        detalles: [{ productoId: "p1", varianteId: "v1", stockFisico: 10 }],
      })
    ).rejects.toThrow(VarianteNoInicializadaError)
  })

  it("emite stockCritico cuando el recuento deja el stock por debajo del mínimo", async () => {
    repo.seed(makeVariante("v1", 8, 5))

    await useCase.execute({
      tenantId: TENANT,
      detalles: [{ productoId: "p1", varianteId: "v1", stockFisico: 3 }],
    })

    expect(notif.tieneEvento("almacen:stock:critico")).toBe(true)
  })

  it("emite stockNormalizado cuando el recuento recupera stock sobre el mínimo", async () => {
    repo.seed(makeVariante("v1", 2, 5))

    await useCase.execute({
      tenantId: TENANT,
      detalles: [{ productoId: "p1", varianteId: "v1", stockFisico: 10 }],
    })

    expect(notif.tieneEvento("almacen:stock:normalizado")).toBe(true)
  })
})
