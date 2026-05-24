import type { QueryParams } from "../../../../core/query-params.js"

export interface GastoData {
  id: string
  tenantId: string
  tenantMemberId: string | null
  fecha: Date
  motivo: string
  totalGasto: number
  estado: string
  createdById: string | null
  updatedById: string | null
  createdAt: Date
  updatedAt: Date | null
}

export interface CrearGastoDTO {
  tenantId: string
  tenantMemberId?: string | null
  fecha: Date
  motivo: string
  totalGasto: number
  createdById?: string | null
}

export interface ActualizarGastoDTO {
  fecha?: Date
  motivo?: string
  totalGasto?: number
  updatedById?: string | null
}

export interface IGastosRepository {
  crear(dto: CrearGastoDTO): Promise<GastoData>
  obtener(id: string, tenantId: string): Promise<GastoData | null>
  actualizar(id: string, tenantId: string, dto: ActualizarGastoDTO): Promise<GastoData>
  eliminar(id: string, tenantId: string, updatedById?: string | null): Promise<void>
  listar(tenantId: string, params: QueryParams, incluirEliminados?: boolean): Promise<{ data: GastoData[]; total: number }>
}
