import { describe, it, expect, beforeEach } from "vitest"
import { RegistrarAjusteUseCase } from "../../src/modules/almacen/application/inventario/registrar-ajuste.usecase.js"
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

describe("RegistrarAjusteUseCase", () => {
  let repo: FakeInventarioProductoRepository
  let notif: FakeAlmacenNotificador
  let useCase: RegistrarAjusteUseCase

  beforeEach(() => {
    repo = new FakeInventarioProductoRepository()
    notif = new FakeAlmacenNotificador()
    useCase = new RegistrarAjusteUseCase(repo, notif)
  })

  it("ajusta el stock de una variante correctamente", async () => {
    repo.seed(makeVariante("v1", 50, 5))

    const resultado = await useCase.execute({
      tenantId: TENANT,
      motivo: "Carga inicial",
      detalles: [{ productoId: "p1", varianteId: "v1", cantidadAjuste: -3 }],
    })

    expect(resultado.detalles[0].stockAntes).toBe(50)
    expect(resultado.detalles[0].stockDespues).toBe(47)
  })

  it("ajusta múltiples variantes en un solo ajuste", async () => {
    repo.seed(makeVariante("v1", 20, 3))
    repo.seed(makeVariante("v2", 10, 2))

    const resultado = await useCase.execute({
      tenantId: TENANT,
      detalles: [
        { productoId: "p1", varianteId: "v1", cantidadAjuste: 5 },
        { productoId: "p1", varianteId: "v2", cantidadAjuste: -2 },
      ],
    })

    expect(resultado.detalles[0].stockDespues).toBe(25)
    expect(resultado.detalles[1].stockDespues).toBe(8)
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
        detalles: [{ productoId: "p1", varianteId: "v1", cantidadAjuste: 10 }],
      })
    ).rejects.toThrow(VarianteNoInicializadaError)
  })

  it("emite evento stockCritico cuando el stock cae por debajo del mínimo", async () => {
    repo.seed(makeVariante("v1", 6, 5))

    await useCase.execute({
      tenantId: TENANT,
      detalles: [{ productoId: "p1", varianteId: "v1", cantidadAjuste: -2 }],
    })

    expect(notif.tieneEvento("almacen:stock:critico")).toBe(true)
    expect(notif.tieneEvento("almacen:stock:normalizado")).toBe(false)
  })

  it("emite evento stockNormalizado cuando el stock se recupera sobre el mínimo", async () => {
    repo.seed(makeVariante("v1", 3, 5))

    await useCase.execute({
      tenantId: TENANT,
      detalles: [{ productoId: "p1", varianteId: "v1", cantidadAjuste: 5 }],
    })

    expect(notif.tieneEvento("almacen:stock:normalizado")).toBe(true)
    expect(notif.tieneEvento("almacen:stock:critico")).toBe(false)
  })

  it("no emite eventos si el stock no cruza el umbral", async () => {
    repo.seed(makeVariante("v1", 20, 5))

    await useCase.execute({
      tenantId: TENANT,
      detalles: [{ productoId: "p1", varianteId: "v1", cantidadAjuste: -3 }],
    })

    expect(notif.eventos).toHaveLength(0)
  })
})
