import type { QueryParams } from "../../../../core/query-params.js"

export interface SalidaDetalleDTO {
  insumoId: string
  cantidad: number
}

export interface CrearSalidaDTO {
  tenantId: string
  descripcion?: string
  detalles: SalidaDetalleDTO[]
  tenantMemberId?: string
  createdById?: string
  forzar?: boolean
}

export interface SalidaDetalleResultado {
  insumoId: string
  insumoNombre: string
  cantidad: number
  stockAntes: number
  stockDespues: number
  stockMinimo: number
}

export interface SalidaResultado {
  salidaId: string
  detalles: SalidaDetalleResultado[]
}

export interface ISalidaAlmacenRepository {
  create(dto: CrearSalidaDTO): Promise<SalidaResultado>
  findById(id: string, tenantId: string): Promise<unknown | null>
  listar(tenantId: string, params: QueryParams): Promise<{ data: unknown[]; total: number }>
}
