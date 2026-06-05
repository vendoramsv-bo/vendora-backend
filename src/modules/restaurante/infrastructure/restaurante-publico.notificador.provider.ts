import type { IRestaurantePublicoNotificador } from "../domain/ports/IRestaurantePublicoNotificador.js"
import { NullRestaurantePublicoNotificador } from "./restaurante-publico.null.notificador.js"

let _notificador: IRestaurantePublicoNotificador = new NullRestaurantePublicoNotificador()

export function setRestaurantePublicoNotificador(n: IRestaurantePublicoNotificador): void {
  _notificador = n
}

export function getRestaurantePublicoNotificador(): IRestaurantePublicoNotificador {
  return _notificador
}
