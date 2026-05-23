import type { IInventarioProductoRepository } from "../../domain/ports/IInventarioProductoRepository.js"
import { VarianteNoEncontradaError } from "../../domain/almacen.errors.js"

export interface ObtenerStockOutput {
  varianteId: string
  productoId: string
  sku: string | null
  cantidadStock: number
  stockMinimo: number
  inventarioActivado: boolean
}

export class ObtenerStockUseCase {
  constructor(private readonly repo: IInventarioProductoRepository) {}

  async execute(varianteId: string, tenantId: string): Promise<ObtenerStockOutput> {
    const variante = await this.repo.findVariante(varianteId, tenantId)
    if (!variante) throw new VarianteNoEncontradaError(varianteId)

    return {
      varianteId: variante.id,
      productoId: variante.productoId,
      sku: variante.sku,
      cantidadStock: variante.cantidadStock,
      stockMinimo: variante.stockMinimo,
      inventarioActivado: variante.inventarioActivado,
    }
  }
}
