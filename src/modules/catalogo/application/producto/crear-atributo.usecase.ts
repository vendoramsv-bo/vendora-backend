import type { IProductoRepository, AtributoCreateDTO } from "../../domain/ports/IProductoRepository.js"
import { ProductoNoEncontrado, AtributoNombreDuplicado } from "../../domain/catalogo.errors.js"

export class CrearAtributoUseCase {
  constructor(private readonly repo: IProductoRepository) {}

  async ejecutar(productoId: string, data: AtributoCreateDTO, tenantId: string): Promise<unknown> {
    const producto = await this.repo.obtener(productoId, tenantId)
    if (!producto) throw new ProductoNoEncontrado(productoId)
    try {
      return await this.repo.crearAtributo(productoId, data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("ATRIBUTO_NOMBRE_DUPLICADO")) throw new AtributoNombreDuplicado()
      throw err
    }
  }
}
