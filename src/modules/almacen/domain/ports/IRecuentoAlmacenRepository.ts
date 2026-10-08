import type { QueryParams } from "../../../../core/query-params.js"

export interface RecuentoAlmacenDetalleDTO {
  insumoId: string
  stockFisico: number
}

export interface RegistrarRecuentoAlmacenDTO {
  tenantId: string
  observacion?: string
  /** Ausente = la base pone ahora. */
  fecha?: Date
  detalles: RecuentoAlmacenDetalleDTO[]
  tenantMemberId?: string
  createdById?: string
}

export interface ActualizarRecuentoAlmacenDTO {
  /** `null` vacía la observación. */
  observacion?: string | null
  fecha?: Date
  /** Reemplaza todas las líneas y vuelve a fotografiar el stock del sistema. */
  detalles?: RecuentoAlmacenDetalleDTO[]
  updatedById?: string
}

export interface AprobarRecuentoAlmacenDTO {
  recuentoId: string
  tenantId: string
  version: number
  aprobadoPorId?: string
}

/** Un recuento de almacén tal como lo lee la pantalla (spec 033, B-05). */
export interface RecuentoAlmacenDoc {
  id: string
  fecha: Date
  observacion: string | null
  estado: string
  version: number
  detalles: Array<{
    insumoId: string
    insumoNombre: string
    unidad: string
    stockSistema: number
    stockFisico: number
    diferencia: number
  }>
}

/** Lo que cambió en cada insumo al aprobar: para las notificaciones de stock. */
export interface CambioStockRecuento {
  insumoId: string
  insumoNombre: string
  stockAntes: number
  stockDespues: number
  stockMinimo: number
}

export interface AprobarRecuentoAlmacenResultado {
  doc: RecuentoAlmacenDoc
  cambios: CambioStockRecuento[]
}

/**
 * Recuentos de almacén con ciclo pendiente → aprobado (spec 033, B-05).
 *
 * Registrar deja el recuento **pendiente**: guarda lo contado y una foto del stock del
 * sistema, sin tocar el stock ni escribir movimientos. Aprobar es lo que fija el stock en
 * lo contado y deja un movimiento RECUENTO por insumo.
 */
export interface IRecuentoAlmacenRepository {
  create(dto: RegistrarRecuentoAlmacenDTO): Promise<RecuentoAlmacenDoc>
  obtener(id: string, tenantId: string): Promise<RecuentoAlmacenDoc | null>
  actualizar(id: string, tenantId: string, dto: ActualizarRecuentoAlmacenDTO): Promise<RecuentoAlmacenDoc>
  /** Solo un pendiente; las líneas se borran en cascada. */
  eliminar(id: string, tenantId: string): Promise<void>
  aprobar(dto: AprobarRecuentoAlmacenDTO): Promise<AprobarRecuentoAlmacenResultado>
  findById(id: string, tenantId: string): Promise<unknown | null>
  listar(tenantId: string, params: QueryParams): Promise<{ data: unknown[]; total: number }>
}
