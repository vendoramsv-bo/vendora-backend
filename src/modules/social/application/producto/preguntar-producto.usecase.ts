import type { IProductoSocialRepository } from "../../domain/ports/IProductoSocialRepository.js"
import { ProductoNoEncontrado } from "../../domain/social.errors.js"

export class PreguntarProductoUseCase {
  constructor(private readonly repo: IProductoSocialRepository) {}

  async ejecutar(productoId: string, userId: string, pregunta: string) {
    const tenantId = await this.repo.findProductoTenantId(productoId)
    if (!tenantId) throw new ProductoNoEncontrado(productoId)

    return this.repo.crearPreguntaProducto({ productoId, tenantId, userId, pregunta })
  }
}
