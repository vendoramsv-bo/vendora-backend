import type { IRestauranteNotificador, ReservaEventoPayload, ReservaActualizadaPayload, PlatoCocinaPayload } from "../domain/ports/IRestauranteNotificador.js"

export class NullRestauranteNotificador implements IRestauranteNotificador {
  reservaCreada(_tenantId: string, _payload: ReservaEventoPayload): void {}
  reservaActualizada(_tenantId: string, _payload: ReservaActualizadaPayload): void {}
  platoCocinaActualizado(_tenantId: string, _payload: PlatoCocinaPayload): void {}
}
