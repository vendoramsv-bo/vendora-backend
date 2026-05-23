import type { IRecetaProductoRepository } from "../../domain/ports/IRecetaProductoRepository.js"

export class ObtenerRecetaUseCase {
  constructor(private readonly repo: IRecetaProductoRepository) {}

  async execute(productoId: string, varianteId?: string) {
    if (varianteId) {
      return this.repo.findByVariante(productoId, varianteId)
    }
    return this.repo.findByProducto(productoId)
  }
}
