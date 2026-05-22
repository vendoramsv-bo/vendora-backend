export interface CitaEventoPayload {
  citaId: string
  medicoId: string
  pacienteId: string
  fechaHora: string
  estado: string
  tenantId: string
}

export interface CitaEstadoPayload {
  citaId: string
  medicoId: string
  pacienteId: string
  estadoAnterior: string
  estadoNuevo: string
  tenantId: string
}

export interface AtencionEstadoPayload {
  atencionId: string
  pacienteId: string
  medicoId: string
  estadoPago: string
  estado: string
  total: string
  tenantId: string
}

export interface RecetaEmitidaPayload {
  recetaId: string
  numeroReceta: string
  medicoId: string
  pacienteId: string
  atencionId: string
  tenantId: string
}

export interface IConsultorioNotificador {
  citaCreada(tenantId: string, payload: CitaEventoPayload): void
  citaCambiada(tenantId: string, payload: CitaEstadoPayload): void
  atencionCambiada(tenantId: string, payload: AtencionEstadoPayload): void
  recetaEmitida(tenantId: string, payload: RecetaEmitidaPayload): void
}
