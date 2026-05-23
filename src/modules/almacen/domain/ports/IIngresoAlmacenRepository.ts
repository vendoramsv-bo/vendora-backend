import type { QueryParams } from "../../../../core/query-params.js"

export interface IngresoDetalleDTO {
  insumoId: string
  cantidad: number
  costoUnitario?: number
  lote?: string
  fechaVencimiento?: Date
  observaciones?: string
}

export interface CrearIngresoDTO {
  tenantId: string
  proveedorId: string
  descripcion?: string
  detalles: IngresoDetalleDTO[]
  tenantMemberId?: string
  createdById?: string
}

export interface IngresoDetalleResultado {
  insumoId: string
  insumoNombre: string
  cantidad: number
  stockAntes: number
  stockDespues: number
  stockMinimo: number
}

export interface IngresoResultado {
  ingresoId: string
  detalles: IngresoDetalleResultado[]
}

export interface IIngresoAlmacenRepository {
  create(dto: CrearIngresoDTO): Promise<IngresoResultado>
  findById(id: string, tenantId: string): Promise<unknown | null>
  listar(tenantId: string, params: QueryParams): Promise<{ data: unknown[]; total: number }>
}
