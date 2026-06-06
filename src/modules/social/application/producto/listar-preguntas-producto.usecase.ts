import type { IProductoSocialRepository } from "../../domain/ports/IProductoSocialRepository.js"

export class ListarPreguntasProductoUseCase {
  constructor(private readonly repo: IProductoSocialRepository) {}

  async ejecutar(productoId: string, tenantId: string, params: { take: number; page: number; order: "asc" | "desc" }) {
    return this.repo.listarPreguntasProducto(productoId, tenantId, params)
  }
}
