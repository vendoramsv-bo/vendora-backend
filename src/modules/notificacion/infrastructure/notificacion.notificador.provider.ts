import type { INotificacionNotificador } from "../domain/ports/INotificacionNotificador.js"
import { NullNotificacionNotificador } from "./null-notificacion.notificador.js"

let _notificador: INotificacionNotificador = new NullNotificacionNotificador()

export function setNotificacionNotificador(n: INotificacionNotificador): void {
  _notificador = n
}

export function getNotificacionNotificador(): INotificacionNotificador {
  return _notificador
}
