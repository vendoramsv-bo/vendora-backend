import { ProductoNoEncontradoError, VarianteNoEncontradaError } from "../../domain/almacen.errors.js"
import type {
  IMovimientoResumenRepository,
  ResumenMovimientos,
} from "../../domain/ports/IMovimientoResumenRepository.js"

/**
 * El resumen del historial de un producto (spec 032, B-03): cuánto entró, cuánto salió,
 * el stock actual y el de cada variante activa. Con `varianteId`, las sumas y el stock
 * actual son los de esa variante.
 */
export class ResumenMovimientosUseCase {
  constructor(private readonly repo: IMovimientoResumenRepository) {}

  async execute(tenantId: string, productoId: string, varianteId?: string): Promise<ResumenMovimientos> {
    const producto = await this.repo.leerProducto(tenantId, productoId)
    if (!producto) throw new ProductoNoEncontradoError(productoId)

    let stockActual = producto.cantidadStock
    if (varianteId) {
      const stock = await this.repo.leerStockVariante(tenantId, productoId, varianteId)
      if (stock === null) throw new VarianteNoEncontradaError(varianteId)
      stockActual = stock
    }

    const { entradas, salidas } = await this.repo.sumarMovimientos(tenantId, productoId, varianteId)
    return { entradas, salidas, stockActual, variantes: producto.variantes }
  }
}
