import type { QueryParams } from "../../../../core/query-params.js"

export interface InsumoData {
  id: string
  tenantId: string
  nombre: string
  unidadMedidaId: string
  cantidadStock: number
  stockMinimo: number
  costoUnitario: number
  fechaVencimiento: Date | null
  estado: string
  createdAt: Date
}

export interface CrearInsumoDTO {
  tenantId: string
  nombre: string
  unidadMedidaId: string
  stockMinimo?: number
  costoUnitario?: number
  fechaVencimiento?: Date
  createdById?: string
}

export interface ActualizarInsumoDTO {
  nombre?: string
  unidadMedidaId?: string
  stockMinimo?: number
  costoUnitario?: number
  fechaVencimiento?: Date | null
  updatedById?: string
}

export interface AjusteInsumoDTO {
  insumoId: string
  tenantId: string
  cantidadAjuste: number
  motivo: string
  createdById?: string
}

export interface AjusteInsumoResultado {
  insumoId: string
  insumoNombre: string
  stockAntes: number
  stockDespues: number
  stockMinimo: number
}

export interface IInsumoRepository {
  findById(id: string, tenantId: string): Promise<InsumoData | null>
  findByNombre(nombre: string, tenantId: string): Promise<InsumoData | null>
  create(dto: CrearInsumoDTO): Promise<InsumoData>
  update(id: string, tenantId: string, dto: ActualizarInsumoDTO): Promise<InsumoData>
  delete(id: string, tenantId: string): Promise<void>
  cambiarEstado(id: string, tenantId: string, estado: string, updatedById?: string): Promise<InsumoData>
  registrarAjuste(dto: AjusteInsumoDTO): Promise<AjusteInsumoResultado>
  listar(tenantId: string, params: QueryParams, stockCritico?: boolean): Promise<{ data: unknown[]; total: number }>
  listarMovimientos(insumoId: string, tenantId: string, params: QueryParams): Promise<{ data: unknown[]; total: number }>
}
