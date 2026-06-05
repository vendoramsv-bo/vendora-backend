import type { IRestaurantePublicoNotificador } from "../domain/ports/IRestaurantePublicoNotificador.js"

export class NullRestaurantePublicoNotificador implements IRestaurantePublicoNotificador {
  notificarPerfilActualizado(_tenantId: string, _slug: string, _campo?: string): void {}
  notificarNuevaReserva(_tenantId: string, _reservaId: string, _codigo: string, _slug: string): void {}
  notificarReservaActualizada(_tenantId: string, _reservaId: string, _codigo: string, _estado: string, _slug: string): void {}
}
