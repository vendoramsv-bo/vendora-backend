import type { ICatalogoNotificador } from "../domain/ports/ICatalogoNotificador.js"
import { NullCatalogoNotificador } from "./null-catalogo.notificador.js"

let _notificador: ICatalogoNotificador = new NullCatalogoNotificador()

export function setCatalogoNotificador(n: ICatalogoNotificador): void {
  _notificador = n
}

export function getCatalogoNotificador(): ICatalogoNotificador {
  return _notificador
}
