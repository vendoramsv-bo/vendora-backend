import type { IConsultorioSocialNotificador } from "../domain/ports/IConsultorioSocialNotificador.js"

class NullConsultorioSocialNotificador implements IConsultorioSocialNotificador {
  emitirNuevaValoracion(): void {}
  emitirNuevoComentario(): void {}
  emitirNuevaPregunta(): void {}
  emitirNuevoSeguidor(): void {}
  emitirNuevaPublicacion(): void {}
}

let _notificador: IConsultorioSocialNotificador = new NullConsultorioSocialNotificador()

export function setConsultorioSocialNotificador(n: IConsultorioSocialNotificador): void {
  _notificador = n
}

export function getConsultorioSocialNotificador(): IConsultorioSocialNotificador {
  return _notificador
}
