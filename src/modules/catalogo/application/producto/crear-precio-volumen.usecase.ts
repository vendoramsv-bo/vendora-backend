import type { IProductoRepository, PrecioVolumenCreateDTO } from "../../domain/ports/IProductoRepository.js"
import { ProductoNoEncontrado, PrecioVolumenCantidadDuplicada } from "../../domain/catalogo.errors.js"

export class CrearPrecioVolumenUseCase {
  constructor(private readonly repo: IProductoRepository) {}

  async ejecutar(productoId: string, data: PrecioVolumenCreateDTO): Promise<unknown> {
    try {
      return await this.repo.crearPrecioVolumen(productoId, data)
    } catch (err) {
      if (err instanceof ProductoNoEncontrado) throw err
      if (err instanceof PrecioVolumenCantidadDuplicada) throw err
      throw err
    }
  }
}
