import type { IAlmacenNotificador } from "../domain/ports/IAlmacenNotificador.js"
import { NullAlmacenNotificador } from "./null-almacen.notificador.js"

let _notificador: IAlmacenNotificador = new NullAlmacenNotificador()

export function setAlmacenNotificador(n: IAlmacenNotificador): void {
  _notificador = n
}

export function getAlmacenNotificador(): IAlmacenNotificador {
  return _notificador
}
