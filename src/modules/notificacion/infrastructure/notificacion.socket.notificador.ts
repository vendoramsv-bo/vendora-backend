import type { Server } from "socket.io"
import type { INotificacionNotificador } from "../domain/ports/INotificacionNotificador.js"
import pino from "pino"

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" })

/**
 * Emite al room PERSONAL del usuario (`user:{id}`), no al del tenant.
 *
 * Una notificación le concierne a una persona: mandarla a la sala del comercio
 * la haría llegar a todos sus miembros (spec 019 FR-032).
 */
export class NotificacionSocketNotificador implements INotificacionNotificador {
  constructor(private readonly io: Server) {}

  contadorNoLeidas(userId: string, count: number): void {
    logger.info({ userId, count }, "[socket] emit:notifications:unread:count")
    this.io.to(`user:${userId}`).emit("notifications:unread:count", { count })
  }
}
