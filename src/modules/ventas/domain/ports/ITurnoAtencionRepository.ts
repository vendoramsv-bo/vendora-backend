import type { QueryParams } from "../../../../core/query-params.js"

export interface TurnoAtencionData {
  id: string
  tenantId: string
  turno: string
  descripcion: string | null
  estado: string
  createdById: string | null
  updatedById: string | null
  createdAt: Date
  updatedAt: Date | null
}

export interface CrearTurnoAtencionDTO {
  tenantId: string
  turno: string
  descripcion?: string | null
  createdById?: string | null
}

export interface ActualizarTurnoAtencionDTO {
  turno?: string
  descripcion?: string | null
  updatedById?: string | null
}

export interface ITurnoAtencionRepository {
  crear(dto: CrearTurnoAtencionDTO): Promise<TurnoAtencionData>
  actualizar(id: string, tenantId: string, dto: ActualizarTurnoAtencionDTO): Promise<TurnoAtencionData>
  cambiarEstado(id: string, tenantId: string, estado: string, updatedById?: string | null): Promise<TurnoAtencionData>
  obtener(id: string, tenantId: string): Promise<TurnoAtencionData | null>
  listar(tenantId: string, params: QueryParams): Promise<{ data: TurnoAtencionData[]; total: number }>
}
