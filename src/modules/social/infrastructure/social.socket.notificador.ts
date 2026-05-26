import type { Server } from "socket.io"
import type { ISocialNotificador, ReaccionPayload, ComentarioPayload, ValoracionPayload, PublicacionNuevaPayload } from "../domain/ports/ISocialNotificador.js"
import pino from "pino"

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" })

export class SocialSocketNotificador implements ISocialNotificador {
  constructor(private readonly io: Server) {}

  reaccionCreada(tenantId: string, payload: ReaccionPayload): void {
    logger.info({ tenantId, elementoTipo: payload.elementoTipo, elementoId: payload.elementoId }, "[socket] emit:social:reaccion")
    const sala = this.subsala(payload.elementoTipo, payload.elementoId, tenantId)
    this.io.to(`tenant:${tenantId}`).to(sala).emit("social:reaccion", payload)
  }

  comentarioCreado(tenantId: string, payload: ComentarioPayload): void {
    logger.info({ tenantId, elementoTipo: payload.elementoTipo, comentarioId: payload.comentarioId }, "[socket] emit:social:comentario")
    const sala = this.subsala(payload.elementoTipo, payload.elementoId, tenantId)
    this.io.to(`tenant:${tenantId}`).to(sala).emit("social:comentario", payload)
  }

  valoracionCreada(tenantId: string, payload: ValoracionPayload): void {
    logger.info({ tenantId, elementoTipo: payload.elementoTipo, elementoId: payload.elementoId }, "[socket] emit:social:valoracion")
    const sala = this.subsala(payload.elementoTipo, payload.elementoId, tenantId)
    this.io.to(`tenant:${tenantId}`).to(sala).emit("social:valoracion", payload)
  }

  publicacionNueva(tenantId: string, payload: PublicacionNuevaPayload): void {
    logger.info({ tenantId, publicacionId: payload.publicacionId }, "[socket] emit:social:publicacion-nueva")
    this.io.to(`tenant:${tenantId}`).emit("social:publicacion-nueva", payload)
  }

  private subsala(elementoTipo: string, elementoId: string, tenantId: string): string {
    if (elementoTipo === "PRODUCTO") return `tenant:${tenantId}:producto:${elementoId}`
    if (elementoTipo === "PUBLICACION") return `tenant:${tenantId}:publicacion:${elementoId}`
    return `tenant:${tenantId}`
  }
}
