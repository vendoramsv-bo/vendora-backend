import type { ITenantNotificador } from "../domain/ports/ITenantNotificador.js"
import { NullTenantNotificador } from "./null-tenant.notificador.js"

let _notificador: ITenantNotificador = new NullTenantNotificador()

export function setTenantNotificador(n: ITenantNotificador): void {
  _notificador = n
}

export function getTenantNotificador(): ITenantNotificador {
  return _notificador
}
