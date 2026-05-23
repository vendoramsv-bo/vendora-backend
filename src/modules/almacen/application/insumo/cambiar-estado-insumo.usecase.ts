import type { IInsumoRepository } from "../../domain/ports/IInsumoRepository.js"
import type { IRecetaProductoRepository } from "../../domain/ports/IRecetaProductoRepository.js"
import { InsumoNoEncontradoError, InsumoEnUsoEnRecetaError } from "../../domain/almacen.errors.js"

export class CambiarEstadoInsumoUseCase {
  constructor(
    private readonly repo: IInsumoRepository,
    private readonly recetaRepo: IRecetaProductoRepository
  ) {}

  async execute(id: string, tenantId: string, estado: string, updatedById?: string) {
    const insumo = await this.repo.findById(id, tenantId)
    if (!insumo) throw new InsumoNoEncontradoError(id)

    if (estado === "INACTIVO") {
      const productosAfectados = await this.recetaRepo.findReferencingProducts(id, tenantId)
      if (productosAfectados.length > 0) throw new InsumoEnUsoEnRecetaError(productosAfectados)
    }

    return this.repo.cambiarEstado(id, tenantId, estado, updatedById)
  }
}
