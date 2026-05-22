import type { IConsultorioNotificador } from "../domain/ports/IConsultorioNotificador.js"
import { NullConsultorioNotificador } from "./null-consultorio.notificador.js"

let _notificador: IConsultorioNotificador = new NullConsultorioNotificador()

export function setConsultorioNotificador(n: IConsultorioNotificador): void {
  _notificador = n
}

export function getConsultorioNotificador(): IConsultorioNotificador {
  return _notificador
}
