import type { IProductoSocialRepository } from "../../domain/ports/IProductoSocialRepository.js"

export class ListarValoracionesProductoUseCase {
  constructor(private readonly repo: IProductoSocialRepository) {}

  async ejecutar(productoId: string, tenantId: string, params: { take: number; skip: number; order: "asc" | "desc"; orderBy?: string }) {
    const result = await this.repo.listarValoracionesProducto(productoId, tenantId, params)
    const promedio = await this.repo.getPromedioValoracionesProducto(productoId)
    return { ...result, meta: { ...result, promedio } }
  }
}
