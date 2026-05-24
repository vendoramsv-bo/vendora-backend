import { describe, it, expect, beforeEach } from "vitest"
import { ConvertirPedidoEnVentaUseCase } from "../../src/modules/ventas/application/pedido/convertir-pedido-en-venta.usecase.js"
import { FakePedidoRepository } from "../helpers/fake-pedido.repository.js"
import { FakeVentasNotificador } from "../helpers/fake-ventas.notificador.js"
import { PedidoTerminalError } from "../../src/modules/ventas/domain/ventas.errors.js"
import type { PedidoData } from "../../src/modules/ventas/domain/ports/IPedidoRepository.js"

const TENANT = "t1"

const basePedido: PedidoData = {
  id: "pedido-1",
  tenantId: TENANT,
  userId: "user-1",
  fecha: new Date(),
  totalCantidad: 2,
  totalPedido: 200,
  respuesta: null,
  estado: "PENDIENTE",
  createdById: null,
  updatedById: null,
  createdAt: new Date(),
  updatedAt: null,
  detalles: [
    {
      id: "pdet-1",
      pedidoId: "pedido-1",
      productoId: "prod-1",
      varianteId: null,
      etiquetaVariante: null,
      precioVolumenId: null,
      etiquetaVolumen: null,
      precio: 100,
      cantidad: 2,
      total: 200,
    },
  ],
}

const convertirInput = {
  pedidoId: "pedido-1",
  tenantId: TENANT,
  aperturaCierreCajaId: "caja-1",
  puntoVentaId: "pv-1",
  turnoId: "turno-1",
  tenantMemberId: "member-1",
  tipoPago: "EFECTIVO",
  estadoPago: "PAGADO",
  efectivo: 200,
  updatedById: null,
}

describe("ConvertirPedidoEnVentaUseCase", () => {
  let pedidoRepo: FakePedidoRepository
  let notificador: FakeVentasNotificador
  let useCase: ConvertirPedidoEnVentaUseCase

  beforeEach(() => {
    pedidoRepo = new FakePedidoRepository()
    notificador = new FakeVentasNotificador()
    useCase = new ConvertirPedidoEnVentaUseCase(pedidoRepo, notificador)
    pedidoRepo.pedidos.push({ ...basePedido, detalles: [...(basePedido.detalles ?? [])] })
  })

  it("crea venta con referenciaTipo=PEDIDO y actualiza pedido a FINALIZADO", async () => {
    const { pedido, venta } = await useCase.execute(convertirInput)
    expect(pedido.estado).toBe("FINALIZADO")
    expect(venta.referenciaTipo).toBe("PEDIDO")
    expect(venta.referenciaId).toBe("pedido-1")
  })

  it("lanza PedidoTerminalError si el pedido ya está FINALIZADO", async () => {
    pedidoRepo.pedidos[0]!.estado = "FINALIZADO"
    await expect(useCase.execute(convertirInput)).rejects.toThrow(PedidoTerminalError)
  })

  it("lanza PedidoTerminalError si el pedido está RECHAZADO", async () => {
    pedidoRepo.pedidos[0]!.estado = "RECHAZADO"
    await expect(useCase.execute(convertirInput)).rejects.toThrow(PedidoTerminalError)
  })

  it("emite pedidoActualizado con estado FINALIZADO", async () => {
    await useCase.execute(convertirInput)
    const ev = notificador.events[0]
    expect(ev.event).toBe("pedidoActualizado")
    expect((ev.payload as { estado: string }).estado).toBe("FINALIZADO")
  })
})
