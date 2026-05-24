import type { IVentasNotificador } from "../domain/ports/IVentasNotificador.js"
import { NullVentasNotificador } from "./null-ventas.notificador.js"

let _notificador: IVentasNotificador = new NullVentasNotificador()

export function setVentasNotificador(n: IVentasNotificador): void {
  _notificador = n
}

export function getVentasNotificador(): IVentasNotificador {
  return _notificador
}
