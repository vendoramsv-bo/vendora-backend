import type { IRestauranteSocialNotificador } from "../domain/ports/IRestauranteSocialNotificador.js"

class NullRestauranteSocialNotificador implements IRestauranteSocialNotificador {
  notificarNuevaValoracion(): void {}
  notificarNuevoComentario(): void {}
  notificarNuevaPregunta(): void {}
  notificarNuevoSeguidor(): void {}
  notificarNuevaReaccion(): void {}
}

let _notificador: IRestauranteSocialNotificador = new NullRestauranteSocialNotificador()

export function setRestauranteSocialNotificador(n: IRestauranteSocialNotificador): void {
  _notificador = n
}

export function getRestauranteSocialNotificador(): IRestauranteSocialNotificador {
  return _notificador
}
