import type { INotificacionNotificador } from "../domain/ports/INotificacionNotificador.js"

/** Sin servidor de sockets —tests, scripts— no se emite nada y nadie se entera. */
export class NullNotificacionNotificador implements INotificacionNotificador {
  contadorNoLeidas(): void {}
}
