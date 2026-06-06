import type { Server } from "socket.io"
import type { IConsultorioSocialNotificador } from "../domain/ports/IConsultorioSocialNotificador.js"
import pino from "pino"

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" })

export class ConsultorioSocialSocketNotificador implements IConsultorioSocialNotificador {
  constructor(private readonly io: Server) {}

  emitirNuevaValoracion(tenantId: string, payload: { consultorioSlug: string; promedio: number; total: number }): void {
    logger.info({ tenantId, slug: payload.consultorioSlug }, "[socket] consultorio:nueva-valoracion")
    this.io.to(`tenant:${tenantId}`).to(`tenant:${tenantId}:consultorio`).emit("consultorio:nueva-valoracion", payload)
  }

  emitirNuevoComentario(tenantId: string, payload: { consultorioSlug: string; comentarioId: string }): void {
    logger.info({ tenantId, slug: payload.consultorioSlug }, "[socket] consultorio:nuevo-comentario")
    this.io.to(`tenant:${tenantId}`).to(`tenant:${tenantId}:consultorio`).emit("consultorio:nuevo-comentario", payload)
  }

  emitirNuevaPregunta(tenantId: string, payload: { consultorioSlug: string; preguntaId: string }): void {
    logger.info({ tenantId, slug: payload.consultorioSlug }, "[socket] consultorio:nueva-pregunta")
    this.io.to(`tenant:${tenantId}`).to(`tenant:${tenantId}:consultorio`).emit("consultorio:nueva-pregunta", payload)
  }

  emitirNuevoSeguidor(tenantId: string, payload: { consultorioSlug: string; totalSeguidores: number }): void {
    logger.info({ tenantId, slug: payload.consultorioSlug }, "[socket] consultorio:nuevo-seguidor")
    this.io.to(`tenant:${tenantId}`).to(`tenant:${tenantId}:consultorio`).emit("consultorio:nuevo-seguidor", payload)
  }

  emitirNuevaPublicacion(tenantId: string, payload: { consultorioSlug: string; publicacionId: string }): void {
    logger.info({ tenantId, slug: payload.consultorioSlug }, "[socket] consultorio:nueva-publicacion")
    this.io.to(`tenant:${tenantId}`).to(`tenant:${tenantId}:consultorio`).emit("consultorio:nueva-publicacion", payload)
  }
}
