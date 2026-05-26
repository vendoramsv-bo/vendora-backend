import type { Server } from "socket.io"
import type { IRestauranteNotificador, ReservaEventoPayload, ReservaActualizadaPayload, PlatoCocinaPayload } from "../domain/ports/IRestauranteNotificador.js"
import pino from "pino"

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" })

export class RestauranteSocketNotificador implements IRestauranteNotificador {
  constructor(private readonly io: Server) {}

  reservaCreada(tenantId: string, payload: ReservaEventoPayload): void {
    logger.info({ tenantId, codigo: payload.codigo }, "[socket] emit:restaurante:reserva:creada")
    this.io.to(`tenant:${tenantId}`).emit("restaurante:reserva:creada", { type: "restaurante:reserva:creada", ...payload })
  }

  reservaActualizada(tenantId: string, payload: ReservaActualizadaPayload): void {
    logger.info({ tenantId, codigo: payload.codigo, estadoNuevo: payload.estadoNuevo }, "[socket] emit:restaurante:reserva:actualizada")
    this.io.to(`tenant:${tenantId}`).emit("restaurante:reserva:actualizada", { type: "restaurante:reserva:actualizada", ...payload })
  }

  platoCocinaActualizado(tenantId: string, payload: PlatoCocinaPayload): void {
    logger.info({ tenantId, detalleId: payload.detalleId, estadoNuevo: payload.estadoNuevo }, "[socket] emit:restaurante:cocina:plato-actualizado")
    this.io.to(`tenant:${tenantId}`).emit("restaurante:cocina:plato-actualizado", { type: "restaurante:cocina:plato-actualizado", ...payload })
  }
}
