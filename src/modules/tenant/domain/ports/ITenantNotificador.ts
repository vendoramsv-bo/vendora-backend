import type { TenantEntity } from "../tenant.entity.js"

export interface ITenantNotificador {
  tenantActualizado(tenantId: string, datos: Partial<TenantEntity>): void
  tenantEliminado(tenantId: string): void
  miembroUnido(tenantId: string, userId: string): void
  miembroRemovido(tenantId: string, userId: string): void
}
