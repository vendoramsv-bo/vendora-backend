import type { QueryParams } from "../../../../core/query-params.js"

export interface SalidaDetalleDTO {
  insumoId: string
  cantidad: number
}

export interface CrearSalidaDTO {
  tenantId: string
  motivo?: string
  descripcion?: string
  detalles: SalidaDetalleDTO[]
  tenantMemberId?: string
  createdById?: string
  forzar?: boolean
}

export interface ActualizarSalidaDTO {
  motivo?: string
  descripcion?: string
  detalles?: SalidaDetalleDTO[]
  updatedById?: string
}

export interface AprobarSalidaDTO {
  salidaId: string
  tenantId: string
  version: number
  aprobadoPorId?: string
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
  estado: string
  version: number
  detalles: SalidaDetalleResultado[]
}

export interface SalidaDoc {
  id: string
  tenantId: string
  motivo?: string | null
  descripcion?: string | null
  estado: string
  version: number
  detalles: Array<{
    insumoId: string
    cantidad: number
  }>
}

export interface ISalidaAlmacenRepository {
  create(dto: CrearSalidaDTO): Promise<{ salidaId: string; estado: string; version: number; detalles: unknown[] }>
  obtenerSalida(id: string, tenantId: string): Promise<SalidaDoc | null>
  actualizarSalida(id: string, tenantId: string, dto: ActualizarSalidaDTO): Promise<SalidaDoc>
  aprobarSalida(dto: AprobarSalidaDTO): Promise<SalidaResultado>
  findById(id: string, tenantId: string): Promise<unknown | null>
  listar(tenantId: string, params: QueryParams): Promise<{ data: unknown[]; total: number }>
}
