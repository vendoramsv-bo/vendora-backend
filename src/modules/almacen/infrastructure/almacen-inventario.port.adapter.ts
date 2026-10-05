import pino from "pino"
import type { IAlmacenInventarioPort, SalidaVentaDetalle } from "../../ventas/domain/ports/IAlmacenInventarioPort.js"
import type { IInventarioProductoRepository } from "../domain/ports/IInventarioProductoRepository.js"

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" })

export class AlmacenInventarioPortAdapter implements IAlmacenInventarioPort {
  constructor(private readonly repo: IInventarioProductoRepository) {}

  async registrarSalidaVenta(ventaId: string, tenantId: string, detalles: SalidaVentaDetalle[]): Promise<void> {
    if (detalles.length === 0) return
    try {
      await this.repo.registrarMovimientoSalidaIdempotente(tenantId, ventaId, detalles)
    } catch (err) {
      logger.error(
        {
          err,
          tenantId,
          ventaId,
          detalles: detalles.map((d) => ({ productoId: d.productoId, varianteId: d.varianteId ?? null })),
        },
        "[almacen] registrarSalidaVenta falló",
      )
      throw err
    }
  }

  async inicializarProducto(tenantId: string, productoId: string, varianteId?: string): Promise<void> {
    try {
      await this.repo.inicializarProductoIndividual(tenantId, productoId, varianteId)
    } catch (err) {
      logger.error({ err, tenantId, productoId, varianteId: varianteId ?? null }, "[almacen] inicializarProducto falló")
      throw err
    }
  }
}
