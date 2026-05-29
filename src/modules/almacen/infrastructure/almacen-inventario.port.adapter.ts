import type { IAlmacenInventarioPort, SalidaVentaDetalle } from "../../ventas/domain/ports/IAlmacenInventarioPort.js"
import type { IInventarioProductoRepository } from "../domain/ports/IInventarioProductoRepository.js"

export class AlmacenInventarioPortAdapter implements IAlmacenInventarioPort {
  constructor(private readonly repo: IInventarioProductoRepository) {}

  async registrarSalidaVenta(ventaId: string, tenantId: string, detalles: SalidaVentaDetalle[]): Promise<void> {
    if (detalles.length === 0) return
    await this.repo.registrarMovimientoSalidaIdempotente(tenantId, ventaId, detalles)
  }

  async inicializarProducto(tenantId: string, productoId: string, varianteId?: string): Promise<void> {
    await this.repo.inicializarProductoIndividual(tenantId, productoId, varianteId)
  }
}
