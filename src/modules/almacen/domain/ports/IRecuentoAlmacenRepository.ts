import type { QueryParams } from "../../../../core/query-params.js"

export interface RecuentoAlmacenDetalleDTO {
  insumoId: string
  stockFisico: number
}

export interface RegistrarRecuentoAlmacenDTO {
  tenantId: string
  observacion?: string
  detalles: RecuentoAlmacenDetalleDTO[]
  tenantMemberId?: string
  createdById?: string
}

export interface RecuentoAlmacenDetalleResultado {
  insumoId: string
  insumoNombre: string
  stockSistema: number
  stockFisico: number
  diferencia: number
  stockMinimo: number
}

export interface RecuentoAlmacenResultado {
  recuentoId: string
  detalles: RecuentoAlmacenDetalleResultado[]
}

export interface IRecuentoAlmacenRepository {
  create(dto: RegistrarRecuentoAlmacenDTO): Promise<RecuentoAlmacenResultado>
  findById(id: string, tenantId: string): Promise<unknown | null>
  listar(tenantId: string, params: QueryParams): Promise<{ data: unknown[]; total: number }>
}
