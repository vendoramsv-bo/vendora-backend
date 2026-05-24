import type { Server } from "socket.io"
import type {
  IVentasNotificador,
  ClienteCreadoPayload,
  ClienteActualizadoPayload,
  ProveedorCreadoPayload,
  ProveedorActualizadoPayload,
  CompraCreadaPayload,
  CompraActualizadaPayload,
  CompraConfirmadaPayload,
  VentaCreadaPayload,
  CajaAbiertaPayload,
  CajaCerradaPayload,
  PedidoActualizadoPayload,
} from "../domain/ports/IVentasNotificador.js"
import pino from "pino"

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" })

export class VentasSocketNotificador implements IVentasNotificador {
  constructor(private readonly io: Server) {}

  clienteCreado(tenantId: string, payload: ClienteCreadoPayload): void {
    logger.info({ tenantId, clienteId: payload.clienteId }, "[socket] emit:ventas:cliente:creado")
    this.io.to(`tenant:${tenantId}`).emit("ventas:cliente:creado", payload)
  }

  clienteActualizado(tenantId: string, payload: ClienteActualizadoPayload): void {
    logger.info({ tenantId, clienteId: payload.clienteId }, "[socket] emit:ventas:cliente:actualizado")
    this.io.to(`tenant:${tenantId}`).emit("ventas:cliente:actualizado", payload)
  }

  proveedorCreado(tenantId: string, payload: ProveedorCreadoPayload): void {
    logger.info({ tenantId, proveedorId: payload.proveedorId }, "[socket] emit:ventas:proveedor:creado")
    this.io.to(`tenant:${tenantId}`).emit("ventas:proveedor:creado", payload)
  }

  proveedorActualizado(tenantId: string, payload: ProveedorActualizadoPayload): void {
    logger.info({ tenantId, proveedorId: payload.proveedorId }, "[socket] emit:ventas:proveedor:actualizado")
    this.io.to(`tenant:${tenantId}`).emit("ventas:proveedor:actualizado", payload)
  }

  compraCreada(tenantId: string, payload: CompraCreadaPayload): void {
    logger.info({ tenantId, compraId: payload.compraId }, "[socket] emit:ventas:compra:creada")
    this.io.to(`tenant:${tenantId}`).emit("ventas:compra:creada", payload)
  }

  compraActualizada(tenantId: string, payload: CompraActualizadaPayload): void {
    logger.info({ tenantId, compraId: payload.compraId }, "[socket] emit:ventas:compra:actualizada")
    this.io.to(`tenant:${tenantId}`).emit("ventas:compra:actualizada", payload)
  }

  compraConfirmada(tenantId: string, payload: CompraConfirmadaPayload): void {
    logger.info({ tenantId, compraId: payload.compraId }, "[socket] emit:ventas:compra:confirmada")
    this.io.to(`tenant:${tenantId}`).emit("ventas:compra:confirmada", payload)
  }

  ventaCreada(tenantId: string, payload: VentaCreadaPayload): void {
    logger.info({ tenantId, ventaId: payload.ventaId }, "[socket] emit:ventas:venta:creada")
    this.io.to(`tenant:${tenantId}`).emit("ventas:venta:creada", payload)
  }

  cajaAbierta(tenantId: string, payload: CajaAbiertaPayload): void {
    logger.info({ tenantId, cajaId: payload.cajaId }, "[socket] emit:ventas:caja:abierta")
    this.io.to(`tenant:${tenantId}`).emit("ventas:caja:abierta", payload)
  }

  cajaCerrada(tenantId: string, payload: CajaCerradaPayload): void {
    logger.info({ tenantId, cajaId: payload.cajaId }, "[socket] emit:ventas:caja:cerrada")
    this.io.to(`tenant:${tenantId}`).emit("ventas:caja:cerrada", payload)
  }

  pedidoActualizado(tenantId: string, payload: PedidoActualizadoPayload): void {
    logger.info({ tenantId, pedidoId: payload.pedidoId }, "[socket] emit:ventas:pedido:actualizado")
    this.io.to(`tenant:${tenantId}`).emit("ventas:pedido:actualizado", payload)
  }
}
