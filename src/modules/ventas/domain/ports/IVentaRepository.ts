import type { QueryParams } from "../../../../core/query-params.js"

export interface VentaDetalleData {
  id: string
  ventaId: string
  productoId: string
  varianteId: string | null
  etiquetaVariante: string | null
  precioVolumenId: string | null
  etiquetaVolumen: string | null
  precio: number
  cantidad: number
  descuento: number
  total: number
  notaVenta: string | null
}

export interface VentaData {
  id: string
  tenantId: string
  puntoVentaId: string
  turnoId: string
  tenantMemberId: string
  aperturaCierreCajaId: string
  fecha: Date
  clienteId: string | null
  clienteNombre: string | null
  clienteTipoDocumento: string | null
  clienteNroDocumento: string | null
  clienteEmail: string | null
  totalCantidad: number
  totalVenta: number
  totalDescuento: number
  efectivo: number
  diferencia: number
  tipoPago: string
  estadoPago: string
  referenciaId: string | null
  referenciaTipo: string
  createdById: string | null
  updatedById: string | null
  createdAt: Date
  updatedAt: Date | null
  detalles?: VentaDetalleData[]
}

export interface VentaDetalleInput {
  productoId: string
  varianteId?: string | null
  etiquetaVariante?: string | null
  precioVolumenId?: string | null
  etiquetaVolumen?: string | null
  precio: number
  cantidad: number
  descuento?: number
  notaVenta?: string | null
}

export interface CrearVentaDTO {
  tenantId: string
  puntoVentaId: string
  turnoId: string
  tenantMemberId: string
  aperturaCierreCajaId: string
  fecha?: Date
  clienteId?: string | null
  clienteNombre?: string | null
  clienteTipoDocumento?: string | null
  clienteNroDocumento?: string | null
  clienteEmail?: string | null
  totalCantidad: number
  totalVenta: number
  totalDescuento: number
  efectivo: number
  diferencia: number
  tipoPago: string
  estadoPago: string
  referenciaId?: string | null
  referenciaTipo: string
  detalles: VentaDetalleInput[]
  createdById?: string | null
}

export interface ConfirmarVentaResultado {
  venta: VentaData
  advertencias: string[]
}

export interface IVentaRepository {
  crear(dto: CrearVentaDTO): Promise<VentaData>
  confirmar(id: string, tenantId: string, updatedById?: string | null): Promise<ConfirmarVentaResultado>
  obtener(id: string, tenantId: string): Promise<VentaData | null>
  listar(tenantId: string, params: QueryParams, filters?: { fecha?: Date; estadoPago?: string; tipoPago?: string; puntoVentaId?: string; turnoId?: string; clienteId?: string }): Promise<{ data: VentaData[]; total: number }>
}
