import type { IProductoRepository, VarianteCreateDTO } from "../../domain/ports/IProductoRepository.js"
import { ProductoNoEncontrado, VarianteSkuDuplicado, VarianteAtributosDuplicados } from "../../domain/catalogo.errors.js"

export class CrearVarianteUseCase {
  constructor(private readonly repo: IProductoRepository) {}

  async ejecutar(productoId: string, data: VarianteCreateDTO, tenantId: string): Promise<unknown> {
    const producto = await this.repo.obtener(productoId, tenantId)
    if (!producto) throw new ProductoNoEncontrado(productoId)
    try {
      return await this.repo.crearVariante(productoId, data)
    } catch (err) {
      if (err instanceof VarianteSkuDuplicado) throw err
      if (err instanceof VarianteAtributosDuplicados) throw err
      throw err
    }
  }
}
