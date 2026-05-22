import type { IProductoRepository } from "../../domain/ports/IProductoRepository.js"
import type { ProductoEntity } from "../../domain/producto.entity.js"
import { ProductoNoEncontrado } from "../../domain/catalogo.errors.js"

export class ObtenerProductoUseCase {
  constructor(private readonly repo: IProductoRepository) {}

  async ejecutar(id: string, tenantId: string): Promise<ProductoEntity> {
    const producto = await this.repo.obtener(id, tenantId)
    if (!producto) throw new ProductoNoEncontrado(id)
    return producto
  }
}
