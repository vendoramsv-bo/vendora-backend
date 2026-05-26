import type { ITiempoComidaRepository } from "../../domain/ports/ITiempoComidaRepository.js"
import type { TiempoComidaEntity } from "../../domain/tiempo-comida.entity.js"

export class ListarTiemposComidaUseCase {
  constructor(private readonly repo: ITiempoComidaRepository) {}

  async ejecutar(restauranteId: string, soloActivos = true): Promise<TiempoComidaEntity[]> {
    return this.repo.findAllByRestaurante(restauranteId, soloActivos)
  }
}
