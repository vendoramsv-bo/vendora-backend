import type {
  IPedidoRepository,
  PedidoData,
  PedidoDetalleData,
  CrearPedidoDTO,
  ConvertirPedidoEnVentaDTO,
} from "../domain/ports/IPedidoRepository.js"
import type { VentaData } from "../domain/ports/IVentaRepository.js"
import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs } from "../../../core/query-params.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDetalleData(raw: any): PedidoDetalleData {
  return {
    id: raw.id,
    pedidoId: raw.pedidoId,
    productoId: raw.productoId,
    varianteId: raw.varianteId ?? null,
    etiquetaVariante: raw.etiquetaVariante ?? null,
    precioVolumenId: raw.precioVolumenId ?? null,
    etiquetaVolumen: raw.etiquetaVolumen ?? null,
    precio: Number(raw.precio),
    cantidad: raw.cantidad,
    total: Number(raw.total),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPedidoData(raw: any): PedidoData {
  return {
    id: raw.id,
    tenantId: raw.tenantId,
    userId: raw.userId,
    fecha: raw.fecha,
    totalCantidad: raw.totalCantidad,
    totalPedido: Number(raw.totalPedido),
    respuesta: raw.respuesta ?? null,
    estado: raw.estado,
    createdById: raw.createdById ?? null,
    updatedById: raw.updatedById ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt ?? null,
    detalles: raw.pedidoDetalle ? raw.pedidoDetalle.map(toDetalleData) : undefined,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toVentaData(raw: any): VentaData {
  return {
    id: raw.id,
    tenantId: raw.tenantId,
    puntoVentaId: raw.puntoVentaId,
    turnoId: raw.turnoId,
    tenantMemberId: raw.tenantMemberId,
    aperturaCierreCajaId: raw.aperturaCierreCajaId,
    fecha: raw.fecha,
    clienteId: raw.clienteId ?? null,
    clienteNombre: raw.clienteNombre ?? null,
    clienteTipoDocumento: raw.clienteTipoDocumento ?? null,
    clienteNroDocumento: raw.clienteNroDocumento ?? null,
    clienteEmail: raw.clienteEmail ?? null,
    totalCantidad: raw.totalCantidad,
    totalVenta: Number(raw.totalVenta),
    totalDescuento: Number(raw.totalDescuento ?? 0),
    efectivo: Number(raw.efectivo ?? 0),
    diferencia: Number(raw.diferencia ?? 0),
    tipoPago: raw.tipoPago,
    estadoPago: raw.estadoPago,
    referenciaId: raw.referenciaId ?? null,
    referenciaTipo: raw.referenciaTipo,
    createdById: raw.createdById ?? null,
    updatedById: raw.updatedById ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt ?? null,
  }
}

export class PedidoPrismaRepository implements IPedidoRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  async crear(dto: CrearPedidoDTO): Promise<PedidoData> {
    const raw = await this.db.pedido.create({
      data: {
        tenantId: dto.tenantId,
        userId: dto.userId,
        fecha: new Date(),
        totalCantidad: dto.totalCantidad,
        totalPedido: dto.totalPedido,
        respuesta: dto.respuesta ?? null,
        estado: "PENDIENTE",
        createdById: dto.createdById ?? null,
        pedidoDetalle: {
          create: dto.detalles.map((d) => ({
            productoId: d.productoId,
            varianteId: d.varianteId ?? null,
            etiquetaVariante: d.etiquetaVariante ?? null,
            precioVolumenId: d.precioVolumenId ?? null,
            etiquetaVolumen: d.etiquetaVolumen ?? null,
            precio: d.precio,
            cantidad: d.cantidad,
            total: d.precio * d.cantidad,
          })),
        },
      },
      include: { pedidoDetalle: true },
    })
    return toPedidoData(raw)
  }

  async actualizarEstado(
    id: string,
    tenantId: string,
    estado: string,
    respuesta?: string | null,
    updatedById?: string | null,
  ): Promise<PedidoData> {
    const raw = await this.db.pedido.update({
      where: { id, tenantId },
      data: {
        estado,
        ...(respuesta !== undefined && { respuesta }),
        updatedById: updatedById ?? null,
      },
      include: { pedidoDetalle: true },
    })
    return toPedidoData(raw)
  }

  async convertirEnVenta(dto: ConvertirPedidoEnVentaDTO): Promise<{ pedido: PedidoData; venta: VentaData }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.db.$transaction(async (tx: any) => {
      const pedidoRaw = await tx.pedido.findFirst({
        where: { id: dto.pedidoId, tenantId: dto.tenantId },
        include: { pedidoDetalle: true },
      })

      const venta = await tx.venta.create({
        data: {
          tenantId: dto.tenantId,
          puntoVentaId: dto.puntoVentaId,
          turnoId: dto.turnoId,
          tenantMemberId: dto.tenantMemberId,
          aperturaCierreCajaId: dto.aperturaCierreCajaId,
          fecha: new Date(),
          totalCantidad: pedidoRaw.totalCantidad,
          totalVenta: pedidoRaw.totalPedido,
          totalDescuento: 0,
          efectivo: dto.efectivo,
          diferencia: dto.efectivo - Number(pedidoRaw.totalPedido),
          tipoPago: dto.tipoPago,
          estadoPago: dto.estadoPago,
          referenciaId: dto.pedidoId,
          referenciaTipo: "PEDIDO",
          createdById: dto.updatedById ?? null,
          ventaDetalle: {
            create: pedidoRaw.pedidoDetalle.map((d: any) => ({
              productoId: d.productoId,
              varianteId: d.varianteId ?? null,
              etiquetaVariante: d.etiquetaVariante ?? null,
              precioVolumenId: d.precioVolumenId ?? null,
              etiquetaVolumen: d.etiquetaVolumen ?? null,
              precio: d.precio,
              cantidad: d.cantidad,
              descuento: 0,
              total: Number(d.total),
              notaVenta: null,
            })),
          },
        },
      })

      const pedidoActualizado = await tx.pedido.update({
        where: { id: dto.pedidoId },
        data: { estado: "FINALIZADO", updatedById: dto.updatedById ?? null },
        include: { pedidoDetalle: true },
      })

      return { pedido: toPedidoData(pedidoActualizado), venta: toVentaData(venta) }
    })
  }

  async obtener(id: string, tenantId: string): Promise<PedidoData | null> {
    const raw = await this.db.pedido.findFirst({
      where: { id, tenantId },
      include: { pedidoDetalle: true },
    })
    return raw ? toPedidoData(raw) : null
  }

  async listar(
    tenantId: string,
    params: QueryParams,
    filters?: { estado?: string; userId?: string },
  ): Promise<{ data: PedidoData[]; total: number }> {
    const args = toPrismaArgs(params)
    const where = {
      ...args.where,
      tenantId,
      ...(filters?.estado && { estado: filters.estado }),
      ...(filters?.userId && { userId: filters.userId }),
    }
    const [data, total] = await Promise.all([
      this.db.pedido.findMany({ where, take: args.take, skip: args.skip, orderBy: args.orderBy }),
      this.db.pedido.count({ where }),
    ])
    return { data: data.map(toPedidoData), total }
  }
}
