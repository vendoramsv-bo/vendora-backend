export interface IConsultorioSocialNotificador {
  emitirNuevaValoracion(tenantId: string, payload: { consultorioSlug: string; promedio: number; total: number }): void
  emitirNuevoComentario(tenantId: string, payload: { consultorioSlug: string; comentarioId: string }): void
  emitirNuevaPregunta(tenantId: string, payload: { consultorioSlug: string; preguntaId: string }): void
  emitirNuevoSeguidor(tenantId: string, payload: { consultorioSlug: string; totalSeguidores: number }): void
  emitirNuevaPublicacion(tenantId: string, payload: { consultorioSlug: string; publicacionId: string }): void
}
