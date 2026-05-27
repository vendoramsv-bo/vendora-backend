import type { IProductoRepository } from "../../domain/ports/IProductoRepository.js"

export class RegistrarStockInicialUseCase {
  constructor(private readonly repo: IProductoRepository) {}

  async ejecutar(params: {
    productoId: string
    tenantId: string
    cantidadStock: number
    userId: string
    tipoProducto: string
  }): Promise<void> {
    if (params.tipoProducto !== "COMERCIALIZACION") return
    if (params.cantidadStock <= 0) return
    await this.repo.registrarMovimientoCreacion(params.productoId, params.tenantId, params.cantidadStock, params.userId)
  }
}
