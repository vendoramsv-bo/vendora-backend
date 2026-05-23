import type { IRecetaProductoRepository } from "../../domain/ports/IRecetaProductoRepository.js"

export class EliminarRecetaUseCase {
  constructor(private readonly repo: IRecetaProductoRepository) {}

  async execute(productoId: string, varianteId: string | null) {
    await this.repo.delete(productoId, varianteId)
  }
}
