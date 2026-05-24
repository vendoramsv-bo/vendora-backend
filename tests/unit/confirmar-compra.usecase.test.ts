import { describe, it, expect, beforeEach } from "vitest"
import { ConfirmarCompraUseCase } from "../../src/modules/ventas/application/compra/confirmar-compra.usecase.js"
import { FakeCompraRepository } from "../helpers/fake-compra.repository.js"
import { FakeVentasNotificador } from "../helpers/fake-ventas.notificador.js"
import { CompraYaConfirmadaError } from "../../src/modules/ventas/domain/ventas.errors.js"
import type { CompraData } from "../../src/modules/ventas/domain/ports/ICompraRepository.js"

const TENANT = "t1"

const baseCompra: CompraData = {
  id: "compra-1",
  tenantId: TENANT,
  fecha: new Date(),
  descripcion: null,
  proveedorId: "prov-1",
  totalCantidad: 5,
  totalCompra: 25000,
  totalCostoAdicional: 0,
  estado: "PENDIENTE",
  createdAt: new Date(),
  updatedAt: null,
  createdById: null,
  updatedById: null,
  detalles: [
    {
      id: "det-1",
      compraId: "compra-1",
      productoId: "prod-1",
      varianteId: "var-1",
      etiquetaVariante: null,
      cantidad: 5,
      precio: 5000,
      total: 25000,
      precioEstimadoVenta: 8000,
      createdAt: new Date(),
    },
  ],
  costosAdicionales: [],
}

describe("ConfirmarCompraUseCase", () => {
  let compraRepo: FakeCompraRepository
  let notificador: FakeVentasNotificador
  let useCase: ConfirmarCompraUseCase

  beforeEach(() => {
    compraRepo = new FakeCompraRepository()
    notificador = new FakeVentasNotificador()
    useCase = new ConfirmarCompraUseCase(compraRepo, notificador)
    compraRepo.seed(baseCompra)
  })

  it("confirma la compra y retorna estado CONFIRMADA", async () => {
    const { compra } = await useCase.execute({ id: "compra-1", tenantId: TENANT })
    expect(compra.estado).toBe("CONFIRMADA")
  })

  it("emite evento compraConfirmada con tenantId y compraId", async () => {
    await useCase.execute({ id: "compra-1", tenantId: TENANT })
    const ev = notificador.events[0]
    expect(ev.event).toBe("compraConfirmada")
    expect(ev.tenantId).toBe(TENANT)
    expect(ev.payload.compraId).toBe("compra-1")
  })

  it("retorna advertencias del repositorio", async () => {
    const { advertencias } = await useCase.execute({ id: "compra-1", tenantId: TENANT })
    expect(Array.isArray(advertencias)).toBe(true)
  })

  it("lanza CompraYaConfirmadaError si la compra ya estaba confirmada", async () => {
    compraRepo.seed({ ...baseCompra, estado: "CONFIRMADA" })
    await expect(
      useCase.execute({ id: "compra-1", tenantId: TENANT })
    ).rejects.toThrow(CompraYaConfirmadaError)
  })
})
