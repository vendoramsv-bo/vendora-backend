import type { Server } from "socket.io"
import type { IConsultorioPublicoNotificador } from "../domain/ports/IConsultorioPublicoNotificador.js"
import pino from "pino"

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" })

export class ConsultorioPublicoSocketNotificador implements IConsultorioPublicoNotificador {
  constructor(private readonly io: Server) {}

  emitirNuevaCitaOnline(tenantId: string, payload: { consultorioSlug: string; citaId: string; fechaHora: Date; medicoId: string }): void {
    logger.info({ tenantId, slug: payload.consultorioSlug }, "[socket] consultorio:nueva-cita-online")
    this.io.to(`tenant:${tenantId}`).to(`tenant:${tenantId}:consultorio`).emit("consultorio:nueva-cita-online", payload)
  }

  emitirPerfilActualizado(tenantId: string, payload: { consultorioSlug: string }): void {
    logger.info({ tenantId, slug: payload.consultorioSlug }, "[socket] consultorio:perfil-actualizado")
    this.io.to(`tenant:${tenantId}`).to(`tenant:${tenantId}:consultorio`).emit("consultorio:perfil-actualizado", payload)
  }
}
