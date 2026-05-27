import type { Server } from "socket.io"
import type {
  ICatalogoNotificador,
  ActividadCreadaPayload,
  CategoriaCreadaPayload,
  CategoriaActualizadaPayload,
  ProductoCreadoPayload,
  ProductoActualizadoPayload,
  ProductoEstadoCambiadoPayload,
  ProductoEliminadoPayload,
  OfertaCreadaPayload,
  OfertaActualizadaPayload,
  VariantesGeneradasPayload,
  AltaMasivaCompletadaPayload,
} from "../domain/ports/ICatalogoNotificador.js"
import pino from "pino"

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" })

export class CatalogoSocketNotificador implements ICatalogoNotificador {
  constructor(private readonly io: Server) {}

  actividadCreada(tenantId: string, payload: ActividadCreadaPayload): void {
    logger.info({ tenantId, actividadId: payload.actividadId }, "[socket] emit:catalogo:actividad:creada")
    this.io.to(`tenant:${tenantId}`).emit("catalogo:actividad:creada", payload)
  }

  categoriaCreada(tenantId: string, payload: CategoriaCreadaPayload): void {
    logger.info({ tenantId, categoriaId: payload.categoriaId }, "[socket] emit:catalogo:categoria:creada")
    this.io.to(`tenant:${tenantId}`).emit("catalogo:categoria:creada", payload)
  }

  categoriaActualizada(tenantId: string, payload: CategoriaActualizadaPayload): void {
    logger.info({ tenantId, categoriaId: payload.categoriaId, estado: payload.estado }, "[socket] emit:catalogo:categoria:actualizada")
    this.io.to(`tenant:${tenantId}`).emit("catalogo:categoria:actualizada", payload)
  }

  productoCreado(tenantId: string, payload: ProductoCreadoPayload): void {
    logger.info({ tenantId, productoId: payload.productoId }, "[socket] emit:catalogo:producto:creado")
    this.io.to(`tenant:${tenantId}`).emit("catalogo:producto:creado", payload)
  }

  productoActualizado(tenantId: string, payload: ProductoActualizadoPayload): void {
    logger.info({ tenantId, productoId: payload.productoId }, "[socket] emit:catalogo:producto:actualizado")
    this.io.to(`tenant:${tenantId}`).emit("catalogo:producto:actualizado", payload)
  }

  productoEstadoCambiado(tenantId: string, payload: ProductoEstadoCambiadoPayload): void {
    logger.info({ tenantId, productoId: payload.productoId, estado: payload.estado }, "[socket] emit:catalogo:producto:estadoCambiado")
    this.io.to(`tenant:${tenantId}`).emit("catalogo:producto:estadoCambiado", payload)
  }

  ofertaCreada(tenantId: string, payload: OfertaCreadaPayload): void {
    logger.info({ tenantId, ofertaId: payload.ofertaId, productoId: payload.productoId }, "[socket] emit:catalogo:oferta:creada")
    this.io.to(`tenant:${tenantId}`).emit("catalogo:oferta:creada", payload)
  }

  ofertaActualizada(tenantId: string, payload: OfertaActualizadaPayload): void {
    logger.info({ tenantId, ofertaId: payload.ofertaId, estado: payload.estado }, "[socket] emit:catalogo:oferta:actualizada")
    this.io.to(`tenant:${tenantId}`).emit("catalogo:oferta:actualizada", payload)
  }

  productoEliminado(tenantId: string, payload: ProductoEliminadoPayload): void {
    logger.info({ tenantId, productoId: payload.productoId }, "[socket] emit:catalogo:producto-eliminado")
    this.io.to(`tenant:${tenantId}`).emit("catalogo:producto-eliminado", payload)
  }

  variantesGeneradas(tenantId: string, payload: VariantesGeneradasPayload): void {
    logger.info({ tenantId, productoId: payload.productoId, cantidadVariantes: payload.cantidadVariantes }, "[socket] emit:catalogo:variantes-generadas")
    this.io.to(`tenant:${tenantId}`).emit("catalogo:variantes-generadas", payload)
  }

  altaMasivaCompletada(tenantId: string, payload: AltaMasivaCompletadaPayload): void {
    logger.info({ tenantId, productosCreados: payload.productosCreados }, "[socket] emit:catalogo:alta-masiva-completada")
    this.io.to(`tenant:${tenantId}`).emit("catalogo:alta-masiva-completada", payload)
  }
}
