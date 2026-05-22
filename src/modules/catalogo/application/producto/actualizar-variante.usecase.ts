import type { IProductoRepository, VarianteUpdateDTO } from "../../domain/ports/IProductoRepository.js"
import { VarianteNoEncontrada, VarianteSkuDuplicado } from "../../domain/catalogo.errors.js"

export class ActualizarVarianteUseCase {
  constructor(private readonly repo: IProductoRepository) {}

  async ejecutar(id: string, productoId: string, data: VarianteUpdateDTO): Promise<unknown> {
    try {
      return await this.repo.actualizarVariante(id, productoId, data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("Record to update not found") || msg.includes("P2025")) throw new VarianteNoEncontrada(id)
      if (err instanceof VarianteSkuDuplicado) throw err
      throw err
    }
  }
}
