import type { ITiendaNotificador } from "../domain/ports/ITiendaNotificador.js"

let _notificador: ITiendaNotificador | null = null

export function setTiendaNotificador(n: ITiendaNotificador): void {
  _notificador = n
}

export function getTiendaNotificador(): ITiendaNotificador | null {
  return _notificador
}
