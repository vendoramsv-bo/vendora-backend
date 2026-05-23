import type { QueryParams } from "../../../../core/query-params.js"

export interface VarianteStockData {
  id: string
  productoId: string
  productoNombre: string
  sku: string | null
  cantidadStock: number
  stockMinimo: number
  inventarioActivado: boolean
}

export interface InicializarVarianteDTO {
  varianteId: string
  tenantId: string
  stockInicial: number
  stockMinimo: number
  createdById?: string
}

export interface AjusteDetalleDTO {
  productoId: string
  varianteId?: string
  cantidadAjuste: number
}

export interface RegistrarAjusteDTO {
  tenantId: string
  motivo?: string
  detalles: AjusteDetalleDTO[]
  tenantMemberId?: string
  createdById?: string
}

export interface RecuentoDetalleDTO {
  productoId: string
  varianteId?: string
  stockFisico: number
}

export interface RegistrarRecuentoDTO {
  tenantId: string
  observacion?: string
  detalles: RecuentoDetalleDTO[]
  tenantMemberId?: string
  createdById?: string
}

export interface AjusteResultado {
  ajusteId: string
  detalles: Array<{
    varianteId: string
    stockAntes: number
    stockDespues: number
    stockMinimo: number
    productoId: string
    productoNombre: string
    sku: string | null
  }>
}

export interface RecuentoResultado {
  recuentoId: string
  detalles: Array<{
    varianteId: string
    stockAntes: number
    stockDespues: number
    stockMinimo: number
    productoId: string
    productoNombre: string
    sku: string | null
    diferencia: number
  }>
}

export interface IInventarioProductoRepository {
  findVariante(varianteId: string, tenantId: string): Promise<VarianteStockData | null>
  registrarAjuste(dto: RegistrarAjusteDTO): Promise<AjusteResultado>
  registrarRecuento(dto: RegistrarRecuentoDTO): Promise<RecuentoResultado>
  listarAjustes(tenantId: string, params: QueryParams): Promise<{ data: unknown[]; total: number }>
  listarRecuentos(tenantId: string, params: QueryParams): Promise<{ data: unknown[]; total: number }>
  listarMovimientos(varianteId: string, tenantId: string, params: QueryParams): Promise<{ data: unknown[]; total: number }>
}
