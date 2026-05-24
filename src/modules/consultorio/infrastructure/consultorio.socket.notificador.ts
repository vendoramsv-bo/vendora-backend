import type { Server } from "socket.io"
import type { IConsultorioNotificador, CitaEventoPayload, CitaEstadoPayload, AtencionEstadoPayload, RecetaEmitidaPayload, HistoriaCreadePayload } from "../domain/ports/IConsultorioNotificador.js"
import pino from "pino"

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" })

export class ConsultorioSocketNotificador implements IConsultorioNotificador {
  constructor(private readonly io: Server) {}

  citaCreada(tenantId: string, payload: CitaEventoPayload): void {
    logger.info({ tenantId, citaId: payload.citaId }, "[socket] emit:consultorio:cita:creada")
    this.io.to(`tenant:${tenantId}`).emit("consultorio:cita:creada", { type: "consultorio:cita:creada", ...payload })
  }

  citaCambiada(tenantId: string, payload: CitaEstadoPayload): void {
    logger.info({ tenantId, citaId: payload.citaId, estadoNuevo: payload.estadoNuevo }, "[socket] emit:consultorio:cita:estadoCambiado")
    this.io.to(`tenant:${tenantId}`).emit("consultorio:cita:estadoCambiado", { type: "consultorio:cita:estadoCambiado", ...payload })
  }

  atencionCambiada(tenantId: string, payload: AtencionEstadoPayload): void {
    logger.info({ tenantId, atencionId: payload.atencionId, estadoPago: payload.estadoPago }, "[socket] emit:consultorio:atencion:estadoCambiado")
    this.io.to(`tenant:${tenantId}`).emit("consultorio:atencion:estadoCambiado", { type: "consultorio:atencion:estadoCambiado", ...payload })
  }

  recetaEmitida(tenantId: string, payload: RecetaEmitidaPayload): void {
    logger.info({ tenantId, recetaId: payload.recetaId, numeroReceta: payload.numeroReceta }, "[socket] emit:consultorio:receta:emitida")
    this.io.to(`tenant:${tenantId}`).emit("consultorio:receta:emitida", { type: "consultorio:receta:emitida", ...payload })
  }

  async historiaCreada(payload: HistoriaCreadePayload): Promise<void> {
    logger.info({ tenantId: payload.tenantId, historiaId: payload.historiaId }, "[socket] emit:consultorio:historia:created")
    this.io.to(`tenant:${payload.tenantId}`).emit("consultorio:historia:created", { type: "consultorio:historia:created", ...payload })
  }
}
