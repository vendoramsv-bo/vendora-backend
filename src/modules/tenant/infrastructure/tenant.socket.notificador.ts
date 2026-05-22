import type { Server } from "socket.io"
import type { ITenantNotificador } from "../domain/ports/ITenantNotificador.js"
import type { TenantEntity } from "../domain/tenant.entity.js"
import pino from "pino"

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" })

// T044 — TenantSocketNotificador: emite eventos Socket.IO al room tenant:${tenantId}
// según el contrato de specs/001-auth-multitenancy/contracts/socket-events.md

export class TenantSocketNotificador implements ITenantNotificador {
  constructor(private readonly io: Server) {}

  tenantActualizado(tenantId: string, datos: Partial<TenantEntity>): void {
    logger.info({ tenantId }, "[socket] emit:tenant:actualizado")
    this.io.to(`tenant:${tenantId}`).emit("tenant:actualizado", { tenantId, datos })
  }

  tenantEliminado(tenantId: string): void {
    logger.info({ tenantId }, "[socket] emit:tenant:eliminado")
    this.io.to(`tenant:${tenantId}`).emit("tenant:eliminado", { tenantId })
  }

  miembroUnido(tenantId: string, userId: string): void {
    logger.info({ tenantId, userId }, "[socket] emit:tenant:miembro:unido")
    this.io.to(`tenant:${tenantId}`).emit("tenant:miembro:unido", { tenantId, userId })
  }

  miembroRemovido(tenantId: string, userId: string): void {
    logger.info({ tenantId, userId }, "[socket] emit:tenant:miembro:removido")
    this.io.to(`tenant:${tenantId}`).emit("tenant:miembro:removido", { tenantId, userId })
  }
}
