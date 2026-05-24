import type { QueryParams } from "../../../../core/query-params.js"

export interface PuntoVentaData {
  id: string
  tenantId: string
  nombre: string
  tipo: string
  direccion: string | null
  telefono: string | null
  sucursal: string | null
  estado: string
  createdById: string | null
  updatedById: string | null
  createdAt: Date
  updatedAt: Date | null
}

export interface CrearPuntoVentaDTO {
  tenantId: string
  nombre: string
  tipo?: string
  direccion?: string | null
  telefono?: string | null
  sucursal?: string | null
  createdById?: string | null
}

export interface ActualizarPuntoVentaDTO {
  nombre?: string
  tipo?: string
  direccion?: string | null
  telefono?: string | null
  sucursal?: string | null
  updatedById?: string | null
}

export interface IPuntoVentaRepository {
  crear(dto: CrearPuntoVentaDTO): Promise<PuntoVentaData>
  actualizar(id: string, tenantId: string, dto: ActualizarPuntoVentaDTO): Promise<PuntoVentaData>
  cambiarEstado(id: string, tenantId: string, estado: string, updatedById?: string | null): Promise<PuntoVentaData>
  obtener(id: string, tenantId: string): Promise<PuntoVentaData | null>
  listar(tenantId: string, params: QueryParams): Promise<{ data: PuntoVentaData[]; total: number }>
}
