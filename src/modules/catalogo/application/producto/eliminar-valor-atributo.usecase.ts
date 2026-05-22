import type { IProductoRepository } from "../../domain/ports/IProductoRepository.js"
import { AtributoValorEnUso } from "../../domain/catalogo.errors.js"

export class EliminarValorAtributoUseCase {
  constructor(private readonly repo: IProductoRepository) {}

  async ejecutar(valorId: string, productoId: string): Promise<void> {
    try {
      await this.repo.eliminarValorAtributo(valorId, productoId)
    } catch (err) {
      if (err instanceof AtributoValorEnUso) throw err
      throw err
    }
  }
}
