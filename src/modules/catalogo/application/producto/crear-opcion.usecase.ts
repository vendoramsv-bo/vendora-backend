import type { IProductoRepository, OpcionCreateDTO } from "../../domain/ports/IProductoRepository.js"
import { ProductoNoEncontrado, OpcionNombreDuplicada } from "../../domain/catalogo.errors.js"

export class CrearOpcionUseCase {
  constructor(private readonly repo: IProductoRepository) {}

  async ejecutar(productoId: string, data: OpcionCreateDTO): Promise<unknown> {
    try {
      return await this.repo.crearOpcion(productoId, data)
    } catch (err) {
      if (err instanceof ProductoNoEncontrado) throw err
      if (err instanceof OpcionNombreDuplicada) throw err
      throw err
    }
  }
}
