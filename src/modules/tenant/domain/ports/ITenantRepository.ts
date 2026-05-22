import type { TenantEntity } from "../tenant.entity.js"
import type { QueryParams } from "../../../../core/query-params.js"

export interface MiembroDTO {
  id: string
  userId: string
  role: string
  estado: string
  createdAt: Date
  usuario: { name: string; email: string; image?: string | null }
}

export interface InvitacionDTO {
  id: string
  email: string
  role?: string | null
  status: string
  expiresAt: Date
  createdAt: Date
  invitador: { name: string; email: string }
}

export interface ListResult<T> {
  data: T[]
  total: number
}

export interface ITenantRepository {
  obtener(id: string): Promise<TenantEntity>
  listarPorUsuario(userId: string, params: QueryParams): Promise<ListResult<{ tenant: TenantEntity; miRol: string }>>
  listarMiembros(tenantId: string, params: QueryParams): Promise<ListResult<MiembroDTO>>
  listarInvitaciones(tenantId: string, params: QueryParams): Promise<ListResult<InvitacionDTO>>
}
