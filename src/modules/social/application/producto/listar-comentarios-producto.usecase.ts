import type { IProductoSocialRepository } from "../../domain/ports/IProductoSocialRepository.js"

export class ListarComentariosProductoUseCase {
  constructor(private readonly repo: IProductoSocialRepository) {}

  async ejecutar(productoId: string, tenantId: string, params: { take: number; skip: number; order: "asc" | "desc"; soloRaiz?: boolean }) {
    return this.repo.listarComentariosProducto(productoId, tenantId, params)
  }
}
