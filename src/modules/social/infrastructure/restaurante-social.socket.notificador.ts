import type { Server } from "socket.io"
import type { IRestauranteSocialNotificador } from "../domain/ports/IRestauranteSocialNotificador.js"
import pino from "pino"

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" })

export class RestauranteSocialSocketNotificador implements IRestauranteSocialNotificador {
  constructor(private readonly io: Server) {}

  notificarNuevaValoracion(tenantId: string, payload: { restauranteSlug: string; puntuacion: number; promedio: number }): void {
    logger.info({ tenantId, slug: payload.restauranteSlug }, "[socket] restaurante:nueva-valoracion")
    this.io.to(`tenant:${tenantId}`).to(`tenant:${tenantId}:restaurante`).emit("restaurante:nueva-valoracion", payload)
  }

  notificarNuevoComentario(tenantId: string, payload: { restauranteSlug: string; comentarioId: string }): void {
    logger.info({ tenantId, slug: payload.restauranteSlug }, "[socket] restaurante:nuevo-comentario")
    this.io.to(`tenant:${tenantId}`).to(`tenant:${tenantId}:restaurante`).emit("restaurante:nuevo-comentario", payload)
  }

  notificarNuevaPregunta(tenantId: string, payload: { restauranteSlug: string; preguntaId: string }): void {
    logger.info({ tenantId, slug: payload.restauranteSlug }, "[socket] restaurante:nueva-pregunta")
    this.io.to(`tenant:${tenantId}`).to(`tenant:${tenantId}:restaurante`).emit("restaurante:nueva-pregunta", payload)
  }

  notificarNuevoSeguidor(tenantId: string, payload: { restauranteSlug: string; totalSeguidores: number }): void {
    logger.info({ tenantId, slug: payload.restauranteSlug }, "[socket] restaurante:nuevo-seguidor")
    this.io.to(`tenant:${tenantId}`).to(`tenant:${tenantId}:restaurante`).emit("restaurante:nuevo-seguidor", payload)
  }

  notificarNuevaReaccion(tenantId: string, payload: { restauranteSlug: string; tipo: string; reacciones: { tipo: string; total: number }[] }): void {
    logger.info({ tenantId, slug: payload.restauranteSlug }, "[socket] restaurante:nueva-reaccion")
    this.io.to(`tenant:${tenantId}`).to(`tenant:${tenantId}:restaurante`).emit("restaurante:nueva-reaccion", payload)
  }
}
