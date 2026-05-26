import type { ITiempoComidaRepository } from "../../domain/ports/ITiempoComidaRepository.js"
import { TiempoComidaNoEncontrado, TiempoComidaEnUso } from "../../domain/restaurante.errors.js"

export class EliminarTiempoComidaUseCase {
  constructor(private readonly repo: ITiempoComidaRepository) {}

  async ejecutar(id: string, restauranteId: string, userId: string): Promise<void> {
    const existente = await this.repo.findById(id, restauranteId)
    if (!existente) throw new TiempoComidaNoEncontrado(id)

    const itemsActivos = await this.repo.countMenuItemsActivos(id)
    if (itemsActivos > 0) throw new TiempoComidaEnUso()

    await this.repo.softDelete(id, userId)
  }
}
