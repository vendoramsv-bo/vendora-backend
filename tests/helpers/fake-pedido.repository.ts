import type {
  IPedidoRepository,
  PedidoData,
  CrearPedidoDTO,
  ConvertirPedidoEnVentaDTO,
} from "../../src/modules/ventas/domain/ports/IPedidoRepository.js"
import type { VentaData } from "../../src/modules/ventas/domain/ports/IVentaRepository.js"
import type { QueryParams } from "../../src/core/query-params.js"
import { PedidoNoEncontradoError, PedidoTerminalError } from "../../src/modules/ventas/domain/ventas.errors.js"

const TRANSICIONES: Record<string, string[]> = {
  PENDIENTE: ["ELABORADO", "RECHAZADO"],
  ELABORADO: ["FINALIZADO", "RECHAZADO"],
  FINALIZADO: [],
  RECHAZADO: [],
}

let idCounter = 1

export class FakePedidoRepository implements IPedidoRepository {
  readonly pedidos: PedidoData[] = []
  readonly ventas: VentaData[] = []

  async crear(dto: CrearPedidoDTO): Promise<PedidoData> {
    const pedido: PedidoData = {
      id: `pedido-${idCounter++}`,
      tenantId: dto.tenantId,
      userId: dto.userId,
      fecha: new Date(),
      totalCantidad: dto.totalCantidad,
      totalPedido: dto.totalPedido,
      respuesta: dto.respuesta ?? null,
      estado: "PENDIENTE",
      createdById: dto.createdById ?? null,
      updatedById: null,
      createdAt: new Date(),
      updatedAt: null,
      detalles: dto.detalles.map((d, i) => ({
        id: `pdet-${i}-${idCounter}`,
        pedidoId: `pedido-${idCounter - 1}`,
        productoId: d.productoId,
        varianteId: d.varianteId ?? null,
        etiquetaVariante: d.etiquetaVariante ?? null,
        precioVolumenId: d.precioVolumenId ?? null,
        etiquetaVolumen: d.etiquetaVolumen ?? null,
        precio: d.precio,
        cantidad: d.cantidad,
        total: d.precio * d.cantidad,
      })),
    }
    this.pedidos.push(pedido)
    return pedido
  }

  async actualizarEstado(id: string, tenantId: string, estado: string, respuesta?: string | null): Promise<PedidoData> {
    const pedido = this.pedidos.find((p) => p.id === id && p.tenantId === tenantId)
    if (!pedido) throw new PedidoNoEncontradoError(id)

    const transicionesValidas = TRANSICIONES[pedido.estado] ?? []
    if (!transicionesValidas.includes(estado)) throw new PedidoTerminalError()

    pedido.estado = estado
    pedido.respuesta = respuesta ?? pedido.respuesta
    pedido.updatedAt = new Date()
    return pedido
  }

  async convertirEnVenta(dto: ConvertirPedidoEnVentaDTO): Promise<{ pedido: PedidoData; venta: VentaData }> {
    const pedido = this.pedidos.find((p) => p.id === dto.pedidoId && p.tenantId === dto.tenantId)
    if (!pedido) throw new PedidoNoEncontradoError(dto.pedidoId)

    const terminales = ["FINALIZADO", "RECHAZADO"]
    if (terminales.includes(pedido.estado)) throw new PedidoTerminalError()

    const venta: VentaData = {
      id: `venta-from-pedido-${idCounter++}`,
      tenantId: dto.tenantId,
      puntoVentaId: dto.puntoVentaId,
      turnoId: dto.turnoId,
      tenantMemberId: dto.tenantMemberId,
      aperturaCierreCajaId: dto.aperturaCierreCajaId,
      fecha: new Date(),
      clienteId: null,
      clienteNombre: null,
      clienteTipoDocumento: null,
      clienteNroDocumento: null,
      clienteEmail: null,
      totalCantidad: pedido.totalCantidad,
      totalVenta: pedido.totalPedido,
      totalDescuento: 0,
      efectivo: dto.efectivo,
      diferencia: dto.efectivo - pedido.totalPedido,
      tipoPago: dto.tipoPago,
      estadoPago: dto.estadoPago,
      referenciaId: pedido.id,
      referenciaTipo: "PEDIDO",
      createdById: dto.updatedById ?? null,
      updatedById: null,
      createdAt: new Date(),
      updatedAt: null,
    }
    this.ventas.push(venta)

    pedido.estado = "FINALIZADO"
    pedido.updatedAt = new Date()

    return { pedido, venta }
  }

  async obtener(id: string, tenantId: string): Promise<PedidoData | null> {
    return this.pedidos.find((p) => p.id === id && p.tenantId === tenantId) ?? null
  }

  async listar(tenantId: string, _params: QueryParams): Promise<{ data: PedidoData[]; total: number }> {
    const data = this.pedidos.filter((p) => p.tenantId === tenantId)
    return { data, total: data.length }
  }
}
