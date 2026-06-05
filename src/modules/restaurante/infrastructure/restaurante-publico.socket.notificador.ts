import type { Server } from "socket.io"
import type { IRestaurantePublicoNotificador } from "../domain/ports/IRestaurantePublicoNotificador.js"
import pino from "pino"

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" })

export class RestaurantePublicoSocketNotificador implements IRestaurantePublicoNotificador {
  constructor(private readonly io: Server) {}

  notificarPerfilActualizado(tenantId: string, slug: string, campo?: string): void {
    logger.info({ tenantId, slug, campo }, "[socket] emit:restaurante:perfil_actualizado")
    this.io.to(`tenant:${tenantId}`).to(`tenant:${tenantId}:restaurante`).emit("restaurante:perfil_actualizado", { slug, campo })
  }

  notificarNuevaReserva(tenantId: string, reservaId: string, codigo: string, slug: string): void {
    logger.info({ tenantId, reservaId, codigo }, "[socket] emit:restaurante:nueva_reserva")
    this.io.to(`tenant:${tenantId}`).to(`tenant:${tenantId}:restaurante`).emit("restaurante:nueva_reserva", { restauranteSlug: slug, reservaId, codigo })
  }

  notificarReservaActualizada(tenantId: string, reservaId: string, codigo: string, estado: string, slug: string): void {
    logger.info({ tenantId, reservaId, estado }, "[socket] emit:restaurante:reserva_cancelada")
    this.io.to(`tenant:${tenantId}`).to(`tenant:${tenantId}:restaurante`).emit("restaurante:reserva_cancelada", { restauranteSlug: slug, reservaId, codigo, estado })
  }
}
