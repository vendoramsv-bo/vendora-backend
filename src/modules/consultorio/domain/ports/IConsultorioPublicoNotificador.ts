export interface IConsultorioPublicoNotificador {
  emitirNuevaCitaOnline(tenantId: string, payload: { consultorioSlug: string; citaId: string; fechaHora: Date; medicoId: string }): void
  emitirPerfilActualizado(tenantId: string, payload: { consultorioSlug: string }): void
}
