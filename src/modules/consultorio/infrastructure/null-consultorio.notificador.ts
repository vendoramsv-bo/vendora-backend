import type { IConsultorioNotificador, CitaEventoPayload, CitaEstadoPayload, AtencionEstadoPayload, RecetaEmitidaPayload } from "../domain/ports/IConsultorioNotificador.js"

export class NullConsultorioNotificador implements IConsultorioNotificador {
  citaCreada(_tenantId: string, _payload: CitaEventoPayload): void {}
  citaCambiada(_tenantId: string, _payload: CitaEstadoPayload): void {}
  atencionCambiada(_tenantId: string, _payload: AtencionEstadoPayload): void {}
  recetaEmitida(_tenantId: string, _payload: RecetaEmitidaPayload): void {}
}

export const notificador = new NullConsultorioNotificador()
