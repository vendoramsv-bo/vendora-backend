import type { IProductoRepository, OpcionUpdateDTO } from "../../domain/ports/IProductoRepository.js"
import { OpcionNoEncontrada } from "../../domain/catalogo.errors.js"

export class ActualizarOpcionUseCase {
  constructor(private readonly repo: IProductoRepository) {}

  async ejecutar(id: string, productoId: string, data: OpcionUpdateDTO): Promise<unknown> {
    try {
      return await this.repo.actualizarOpcion(id, productoId, data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("Record to update not found") || msg.includes("P2025")) throw new OpcionNoEncontrada(id)
      throw err
    }
  }
}
