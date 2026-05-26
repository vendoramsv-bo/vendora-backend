import type { ISocialNotificador } from "../domain/ports/ISocialNotificador.js"
import { NullSocialNotificador } from "./social.null.notificador.js"

let _notificador: ISocialNotificador = new NullSocialNotificador()

export function setSocialNotificador(n: ISocialNotificador): void {
  _notificador = n
}

export function getSocialNotificador(): ISocialNotificador {
  return _notificador
}
