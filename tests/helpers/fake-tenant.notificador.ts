import type { ITenantNotificador } from "../../src/modules/tenant/domain/ports/ITenantNotificador.js"
import type { TenantEntity } from "../../src/modules/tenant/domain/tenant.entity.js"

// T052 — Spy de ITenantNotificador que registra llamadas para assertions en tests

type EventoNotificador =
  | { tipo: "tenantActualizado"; tenantId: string; datos: Partial<TenantEntity> }
  | { tipo: "tenantEliminado"; tenantId: string }
  | { tipo: "miembroUnido"; tenantId: string; userId: string }
  | { tipo: "miembroRemovido"; tenantId: string; userId: string }

export class FakeTenantNotificador implements ITenantNotificador {
  readonly eventos: EventoNotificador[] = []

  tenantActualizado(tenantId: string, datos: Partial<TenantEntity>): void {
    this.eventos.push({ tipo: "tenantActualizado", tenantId, datos })
  }

  tenantEliminado(tenantId: string): void {
    this.eventos.push({ tipo: "tenantEliminado", tenantId })
  }

  miembroUnido(tenantId: string, userId: string): void {
    this.eventos.push({ tipo: "miembroUnido", tenantId, userId })
  }

  miembroRemovido(tenantId: string, userId: string): void {
    this.eventos.push({ tipo: "miembroRemovido", tenantId, userId })
  }

  limpiar(): void {
    this.eventos.length = 0
  }

  tieneEvento(tipo: EventoNotificador["tipo"]): boolean {
    return this.eventos.some((e) => e.tipo === tipo)
  }
}
