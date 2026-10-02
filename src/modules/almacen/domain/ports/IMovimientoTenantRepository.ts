import type { MovimientoTenant } from "../movimiento-tenant.js"
import type { CampoFiltroMovimiento, OperadorFiltro } from "../movimiento-filtro.js"

export interface QueryParamsMovimientosTenant {
  take: number
  skip: number
  orderBy?: "tipo" | "cantidad" | "createdAt"
  order: "asc" | "desc"
  search?: string
  filterField?: CampoFiltroMovimiento
  filterOp?: OperadorFiltro
  filterValue?: string
}

export interface IMovimientoTenantRepository {
  listar(tenantId: string, params: QueryParamsMovimientosTenant): Promise<{ data: MovimientoTenant[]; total: number }>
}
