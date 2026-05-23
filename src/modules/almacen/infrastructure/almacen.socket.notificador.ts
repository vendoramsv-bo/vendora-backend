import type { Server } from "socket.io"
import type {
  IAlmacenNotificador,
  StockCriticoPayload,
  StockNormalizadoPayload,
  InsumoStockCriticoPayload,
  InsumoStockNormalizadoPayload,
} from "../domain/ports/IAlmacenNotificador.js"
import pino from "pino"

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" })

export class AlmacenSocketNotificador implements IAlmacenNotificador {
  constructor(private readonly io: Server) {}

  stockCritico(tenantId: string, payload: StockCriticoPayload): void {
    logger.info({ tenantId, varianteId: payload.varianteId }, "[socket] emit:almacen:stock:critico")
    this.io.to(`tenant:${tenantId}`).emit("almacen:stock:critico", payload)
  }

  stockNormalizado(tenantId: string, payload: StockNormalizadoPayload): void {
    logger.info({ tenantId, varianteId: payload.varianteId }, "[socket] emit:almacen:stock:normalizado")
    this.io.to(`tenant:${tenantId}`).emit("almacen:stock:normalizado", payload)
  }

  insumoStockCritico(tenantId: string, payload: InsumoStockCriticoPayload): void {
    logger.info({ tenantId, insumoId: payload.insumoId }, "[socket] emit:almacen:insumo:stock:critico")
    this.io.to(`tenant:${tenantId}`).emit("almacen:insumo:stock:critico", payload)
  }

  insumoStockNormalizado(tenantId: string, payload: InsumoStockNormalizadoPayload): void {
    logger.info({ tenantId, insumoId: payload.insumoId }, "[socket] emit:almacen:insumo:stock:normalizado")
    this.io.to(`tenant:${tenantId}`).emit("almacen:insumo:stock:normalizado", payload)
  }
}
