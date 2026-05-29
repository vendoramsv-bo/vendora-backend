export interface ITiendaNotificador {
  configuracionActualizada(tenantId: string, tiendaId: string): void
  destacadosActualizados(tenantId: string, tiendaId: string): void
  nuevaValoracion(tenantId: string, tiendaId: string, userId: string, puntuacion: number): void
  nuevoComentario(tenantId: string, tiendaId: string, comentarioId: string): void
  nuevaPregunta(tenantId: string, tiendaId: string, preguntaId: string): void
  nuevoSeguidor(tenantId: string, tiendaId: string, userId: string): void
}
