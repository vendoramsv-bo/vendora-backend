import type { QueryParams } from "../../../../core/query-params.js"
import type { VentaData, VentaDetalleInput } from "./IVentaRepository.js"

export interface PedidoDetalleData {
  id: string
  pedidoId: string
  productoId: string
  varianteId: string | null
  etiquetaVariante: string | null
  precioVolumenId: string | null
  etiquetaVolumen: string | null
  precio: number
  cantidad: number
  total: number
}

export interface PedidoData {
  id: string
  tenantId: string
  userId: string
  fecha: Date
  totalCantidad: number
  totalPedido: number
  respuesta: string | null
  estado: string
  createdById: string | null
  updatedById: string | null
  createdAt: Date
  updatedAt: Date | null
  detalles?: PedidoDetalleData[]
}

export interface PedidoDetalleInput {
  productoId: string
  varianteId?: string | null
  etiquetaVariante?: string | null
  precioVolumenId?: string | null
  etiquetaVolumen?: string | null
  precio: number
  cantidad: number
}

export interface CrearPedidoDTO {
  tenantId: string
  userId: string
  totalCantidad: number
  totalPedido: number
  respuesta?: string | null
  detalles: PedidoDetalleInput[]
  createdById?: string | null
}

export interface ConvertirPedidoEnVentaDTO {
  pedidoId: string
  tenantId: string
  aperturaCierreCajaId: string
  puntoVentaId: string
  turnoId: string
  tenantMemberId: string
  tipoPago: string
  estadoPago: string
  efectivo: number
  updatedById?: string | null
}

export interface IPedidoRepository {
  crear(dto: CrearPedidoDTO): Promise<PedidoData>
  actualizarEstado(id: string, tenantId: string, estado: string, respuesta?: string | null, updatedById?: string | null): Promise<PedidoData>
  convertirEnVenta(dto: ConvertirPedidoEnVentaDTO): Promise<{ pedido: PedidoData; venta: VentaData }>
  obtener(id: string, tenantId: string): Promise<PedidoData | null>
  listar(tenantId: string, params: QueryParams, filters?: { estado?: string; userId?: string }): Promise<{ data: PedidoData[]; total: number }>
}

export { VentaDetalleInput }
