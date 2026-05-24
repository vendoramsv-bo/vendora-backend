import type { QueryParams } from "../../../../core/query-params.js"

export interface IngresoCajaData {
  id: string
  aperturaCierreCajaId: string
  motivo: string
  montoIngreso: number
}

export interface EgresoCajaData {
  id: string
  aperturaCierreCajaId: string
  motivo: string
  montoEgreso: number
}

export interface CajaAbiertaData {
  id: string
  tenantId: string
  puntoVentaId: string
  turnoId: string
  tenantMemberId: string
  fecha: Date
  montoIngresos: number
  montoEgresos: number
  montoVentas: number
  montoDescuentos: number
  montoArqueoCaja: number
  estadoCaja: string
  createdById: string | null
  updatedById: string | null
  createdAt: Date
  updatedAt: Date | null
  ingresos?: IngresoCajaData[]
  egresos?: EgresoCajaData[]
}

export interface AbrirCajaDTO {
  tenantId: string
  puntoVentaId: string
  turnoId: string
  tenantMemberId: string
  montoInicial: number
  createdById?: string | null
}

export interface ICajaRepository {
  abrir(dto: AbrirCajaDTO): Promise<CajaAbiertaData>
  cerrar(id: string, tenantId: string, montoArqueoCaja: number, updatedById?: string | null): Promise<CajaAbiertaData>
  registrarIngreso(id: string, tenantId: string, motivo: string, montoIngreso: number): Promise<IngresoCajaData>
  registrarEgreso(id: string, tenantId: string, motivo: string, montoEgreso: number): Promise<EgresoCajaData>
  obtener(id: string, tenantId: string): Promise<CajaAbiertaData | null>
  listar(tenantId: string, params: QueryParams, estadoCaja?: string, puntoVentaId?: string): Promise<{ data: CajaAbiertaData[]; total: number }>
}
