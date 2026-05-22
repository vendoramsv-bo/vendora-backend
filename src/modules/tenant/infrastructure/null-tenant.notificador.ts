import type { ITenantNotificador } from "../domain/ports/ITenantNotificador.js"
import type { TenantEntity } from "../domain/tenant.entity.js"

// Notificador sin efectos — stub por defecto hasta que US5 conecte TenantSocketNotificador.
export class NullTenantNotificador implements ITenantNotificador {
  tenantActualizado(_tenantId: string, _datos: Partial<TenantEntity>): void {}
  tenantEliminado(_tenantId: string): void {}
  miembroUnido(_tenantId: string, _userId: string): void {}
  miembroRemovido(_tenantId: string, _userId: string): void {}
}

export const notificador = new NullTenantNotificador()
