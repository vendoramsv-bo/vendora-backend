import type { IConsultorioNotificador, CitaEventoPayload, CitaEstadoPayload, AtencionEstadoPayload, RecetaEmitidaPayload, HistoriaCreadePayload } from "../domain/ports/IConsultorioNotificador.js"

export class NullConsultorioNotificador implements IConsultorioNotificador {
  citaCreada(_tenantId: string, _payload: CitaEventoPayload): void {}
  citaCambiada(_tenantId: string, _payload: CitaEstadoPayload): void {}
  atencionCambiada(_tenantId: string, _payload: AtencionEstadoPayload): void {}
  recetaEmitida(_tenantId: string, _payload: RecetaEmitidaPayload): void {}
  async historiaCreada(_payload: HistoriaCreadePayload): Promise<void> {}
}

export const notificador = new NullConsultorioNotificador()
