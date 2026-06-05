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

export interface ActualizarIngresoDTO {
  proveedorId?: string
  descripcion?: string
  detalles?: IngresoDetalleDTO[]
  updatedById?: string
}

export interface AprobarIngresoDTO {
  ingresoId: string
  tenantId: string
  version: number
  aprobadoPorId?: string
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
  estado: string
  version: number
  detalles: IngresoDetalleResultado[]
}

export interface IngresoDoc {
  id: string
  tenantId: string
  proveedorId: string
  descripcion?: string | null
  estado: string
  version: number
  detalles: Array<{
    insumoId: string
    cantidad: number
    costoUnitario: number
    lote?: string | null
    fechaVencimiento?: Date | null
    observaciones?: string | null
  }>
}

export interface IIngresoAlmacenRepository {
  create(dto: CrearIngresoDTO): Promise<{ ingresoId: string; estado: string; version: number; detalles: unknown[] }>
  obtenerIngreso(id: string, tenantId: string): Promise<IngresoDoc | null>
  actualizarIngreso(id: string, tenantId: string, dto: ActualizarIngresoDTO): Promise<IngresoDoc>
  aprobarIngreso(dto: AprobarIngresoDTO): Promise<IngresoResultado>
  findById(id: string, tenantId: string): Promise<unknown | null>
  listar(tenantId: string, params: QueryParams): Promise<{ data: unknown[]; total: number }>
}
