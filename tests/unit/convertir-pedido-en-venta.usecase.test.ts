import { describe, it, expect, beforeEach } from "vitest"
import { ConvertirPedidoEnVentaUseCase } from "../../src/modules/ventas/application/pedido/convertir-pedido-en-venta.usecase.js"
import { FakePedidoRepository } from "../helpers/fake-pedido.repository.js"
import { FakeVentasNotificador } from "../helpers/fake-ventas.notificador.js"
import { PedidoTerminalError, VarianteRequeridaError } from "../../src/modules/ventas/domain/ventas.errors.js"
import type { PedidoData } from "../../src/modules/ventas/domain/ports/IPedidoRepository.js"
import type { IAlmacenInventarioPort, SalidaVentaDetalle } from "../../src/modules/ventas/domain/ports/IAlmacenInventarioPort.js"

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

// Fake del puerto de almacén: registra las llamadas, y puede tardar o fallar
class FakeAlmacenPort implements IAlmacenInventarioPort {
  readonly salidas: Array<{ ventaId: string; detalles: SalidaVentaDetalle[] }> = []
  fallar = false

  async registrarSalidaVenta(ventaId: string, _tenantId: string, detalles: SalidaVentaDetalle[]): Promise<void> {
    await new Promise((r) => setTimeout(r, 5))
    if (this.fallar) throw new Error("fallo de inventario")
    this.salidas.push({ ventaId, detalles })
  }

  async inicializarProducto(): Promise<void> {}
}

describe("ConvertirPedidoEnVentaUseCase — variante requerida y salida de almacén (spec 027)", () => {
  let pedidoRepo: FakePedidoRepository
  let almacen: FakeAlmacenPort
  let useCase: ConvertirPedidoEnVentaUseCase

  beforeEach(() => {
    pedidoRepo = new FakePedidoRepository()
    almacen = new FakeAlmacenPort()
    useCase = new ConvertirPedidoEnVentaUseCase(pedidoRepo, new FakeVentasNotificador(), almacen)
    pedidoRepo.pedidos.push({ ...basePedido, estado: "PENDIENTE", detalles: [...(basePedido.detalles ?? [])] })
  })

  it("rechaza con VarianteRequeridaError una línea sin variante de un producto con variantes y no convierte", async () => {
    pedidoRepo.productosConVariante = ["prod-1"]

    const err = await useCase.execute(convertirInput).catch((e) => e)
    expect(err).toBeInstanceOf(VarianteRequeridaError)
    expect((err as VarianteRequeridaError).productoIds).toEqual(["prod-1"])
    expect(pedidoRepo.ventas).toHaveLength(0)
    expect(pedidoRepo.pedidos[0]!.estado).toBe("PENDIENTE")
    expect(almacen.salidas).toHaveLength(0)
  })

  it("con líneas válidas espera la salida de almacén antes de devolver", async () => {
    const { venta } = await useCase.execute(convertirInput)
    expect(almacen.salidas).toHaveLength(1)
    expect(almacen.salidas[0]!.ventaId).toBe(venta.id)
    expect(almacen.salidas[0]!.detalles).toEqual([{ productoId: "prod-1", varianteId: undefined, cantidad: 2 }])
  })

  it("si la salida de almacén falla, igual devuelve la venta (no relanza)", async () => {
    almacen.fallar = true
    const { venta } = await useCase.execute(convertirInput)
    expect(venta.id).toBeTruthy()
  })
})
