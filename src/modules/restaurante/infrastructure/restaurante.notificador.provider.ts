import type { IRestauranteNotificador } from "../domain/ports/IRestauranteNotificador.js"
import { NullRestauranteNotificador } from "./restaurante.null.notificador.js"

let _notificador: IRestauranteNotificador = new NullRestauranteNotificador()

export function setRestauranteNotificador(n: IRestauranteNotificador): void {
  _notificador = n
}

export function getRestauranteNotificador(): IRestauranteNotificador {
  return _notificador
}
