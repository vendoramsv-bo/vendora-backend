export interface IRestauranteSocialNotificador {
  notificarNuevaValoracion(tenantId: string, payload: { restauranteSlug: string; puntuacion: number; promedio: number }): void
  notificarNuevoComentario(tenantId: string, payload: { restauranteSlug: string; comentarioId: string }): void
  notificarNuevaPregunta(tenantId: string, payload: { restauranteSlug: string; preguntaId: string }): void
  notificarNuevoSeguidor(tenantId: string, payload: { restauranteSlug: string; totalSeguidores: number }): void
  notificarNuevaReaccion(tenantId: string, payload: { restauranteSlug: string; tipo: string; reacciones: { tipo: string; total: number }[] }): void
}
