import type { IConsultorioPublicoNotificador } from "../domain/ports/IConsultorioPublicoNotificador.js"

class NullConsultorioPublicoNotificador implements IConsultorioPublicoNotificador {
  emitirNuevaCitaOnline(): void {}
  emitirPerfilActualizado(): void {}
}

let _notificador: IConsultorioPublicoNotificador = new NullConsultorioPublicoNotificador()

export function setConsultorioPublicoNotificador(n: IConsultorioPublicoNotificador): void {
  _notificador = n
}

export function getConsultorioPublicoNotificador(): IConsultorioPublicoNotificador {
  return _notificador
}
