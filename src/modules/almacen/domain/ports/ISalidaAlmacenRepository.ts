import type { QueryParams } from "../../../../core/query-params.js"

export interface SalidaDetalleDTO {
  insumoId: string
  cantidad: number
}

export interface CrearSalidaDTO {
  tenantId: string
  motivo?: string
  descripcion?: string
  /** Ausente = la base pone ahora. */
  fecha?: Date
  detalles: SalidaDetalleDTO[]
  tenantMemberId?: string
  createdById?: string
  forzar?: boolean
}

export interface ActualizarSalidaDTO {
  /** `null` vacía el campo. */
  motivo?: string | null
  descripcion?: string | null
  fecha?: Date
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
  fecha: Date
  motivo?: string | null
  descripcion?: string | null
  estado: string
  version: number
  detalles: Array<{
    insumoId: string
    insumoNombre: string
    unidad: string
    stockActual: number
    cantidad: number
  }>
}

export interface ISalidaAlmacenRepository {
  create(dto: CrearSalidaDTO): Promise<{ salidaId: string; estado: string; version: number; detalles: unknown[] }>
  obtenerSalida(id: string, tenantId: string): Promise<SalidaDoc | null>
  actualizarSalida(id: string, tenantId: string, dto: ActualizarSalidaDTO): Promise<SalidaDoc>
  aprobarSalida(dto: AprobarSalidaDTO): Promise<SalidaResultado>
  /** Solo un pendiente (spec 033, B-02); las líneas se borran en cascada. */
  eliminarSalida(id: string, tenantId: string): Promise<void>
  findById(id: string, tenantId: string): Promise<unknown | null>
  listar(tenantId: string, params: QueryParams): Promise<{ data: unknown[]; total: number }>
}
