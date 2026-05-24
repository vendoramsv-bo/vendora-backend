import type { QueryParams } from "../../../../core/query-params.js"

export interface CompraDetalleData {
  id: string
  compraId: string
  productoId: string
  varianteId: string | null
  etiquetaVariante: string | null
  cantidad: number
  precio: number
  total: number
  precioEstimadoVenta: number
  createdAt: Date
}

export interface CompraCostoData {
  id: string
  compraId: string
  motivo: string
  costo: number
  createdAt: Date
}

export interface CompraData {
  id: string
  tenantId: string
  fecha: Date
  descripcion: string | null
  proveedorId: string
  proveedor?: { id: string; nombre: string } | null
  totalCantidad: number
  totalCompra: number
  totalCostoAdicional: number
  estado: string
  createdAt: Date
  updatedAt?: Date | null
  createdById: string | null
  updatedById: string | null
  detalles?: CompraDetalleData[]
  costosAdicionales?: CompraCostoData[]
}

export interface CompraDetalleInput {
  productoId: string
  varianteId?: string | null
  etiquetaVariante?: string | null
  cantidad: number
  precio: number
  precioEstimadoVenta: number
}

export interface CompraCostoInput {
  motivo: string
  costo: number
}

export interface CrearCompraDTO {
  tenantId: string
  proveedorId: string
  fecha?: Date
  descripcion?: string | null
  detalles: CompraDetalleInput[]
  costosAdicionales?: CompraCostoInput[]
  createdById?: string | null
}

export interface ActualizarCompraDTO {
  proveedorId?: string
  fecha?: Date
  descripcion?: string | null
  updatedById?: string | null
}

export interface ActualizarDetalleDTO {
  cantidad?: number
  precio?: number
  precioEstimadoVenta?: number
}

export interface ConfirmarResultado {
  compra: CompraData
  advertencias: string[]
}

export interface ICompraRepository {
  crear(dto: CrearCompraDTO): Promise<CompraData>
  obtenerPorId(id: string, tenantId: string): Promise<CompraData | null>
  actualizar(id: string, tenantId: string, dto: ActualizarCompraDTO): Promise<CompraData>
  eliminar(id: string, tenantId: string): Promise<void>
  confirmar(id: string, tenantId: string, updatedById?: string | null): Promise<ConfirmarResultado>
  listar(tenantId: string, params: QueryParams, estado?: string, proveedorId?: string): Promise<{ data: CompraData[]; total: number }>
  agregarDetalle(compraId: string, tenantId: string, detalle: CompraDetalleInput): Promise<CompraDetalleData>
  actualizarDetalle(compraId: string, detalleId: string, tenantId: string, dto: ActualizarDetalleDTO): Promise<CompraDetalleData>
  eliminarDetalle(compraId: string, detalleId: string, tenantId: string): Promise<void>
  agregarCosto(compraId: string, tenantId: string, costo: CompraCostoInput): Promise<CompraCostoData>
  actualizarCosto(compraId: string, costoId: string, tenantId: string, costo: number): Promise<CompraCostoData>
  eliminarCosto(compraId: string, costoId: string, tenantId: string): Promise<void>
}
