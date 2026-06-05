import type { Server } from "socket.io"
import type { ITiendaNotificador } from "../domain/ports/ITiendaNotificador.js"
import pino from "pino"

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" })

export class TiendaSocketNotificador implements ITiendaNotificador {
  constructor(private readonly io: Server) {}

  configuracionActualizada(tenantId: string, tiendaId: string): void {
    logger.info({ tenantId, tiendaId }, "[socket] emit:tienda:configuracion:actualizada")
    this.io.to(`tenant:${tenantId}`).emit("tienda:configuracion:actualizada", { tiendaId })
  }

  destacadosActualizados(tenantId: string, tiendaId: string): void {
    logger.info({ tenantId, tiendaId }, "[socket] emit:tienda:destacados:actualizados")
    this.io.to(`tenant:${tenantId}`).emit("tienda:destacados:actualizados", { tiendaId })
  }

  nuevaValoracion(tenantId: string, tiendaId: string, userId: string, puntuacion: number): void {
    logger.info({ tenantId, tiendaId, userId }, "[socket] emit:tienda:nueva:valoracion")
    this.io.to(`tenant:${tenantId}`).emit("tienda:nueva:valoracion", { tiendaId, userId, puntuacion })
  }

  nuevoComentario(tenantId: string, tiendaId: string, comentarioId: string): void {
    logger.info({ tenantId, tiendaId, comentarioId }, "[socket] emit:tienda:nuevo:comentario")
    this.io.to(`tenant:${tenantId}`).emit("tienda:nuevo:comentario", { tiendaId, comentarioId })
  }

  nuevaPregunta(tenantId: string, tiendaId: string, preguntaId: string): void {
    logger.info({ tenantId, tiendaId, preguntaId }, "[socket] emit:tienda:nueva:pregunta")
    this.io.to(`tenant:${tenantId}`).emit("tienda:nueva:pregunta", { tiendaId, preguntaId })
  }

  nuevoSeguidor(tenantId: string, tiendaId: string, userId: string): void {
    logger.info({ tenantId, tiendaId, userId }, "[socket] emit:tienda:nuevo:seguidor")
    this.io.to(`tenant:${tenantId}`).emit("tienda:nuevo:seguidor", { tiendaId, userId })
  }
}
