import type { ITiempoComidaRepository, TiempoComidaCreateDTO } from "../../domain/ports/ITiempoComidaRepository.js"
import type { TiempoComidaEntity } from "../../domain/tiempo-comida.entity.js"
import { TiempoComidaNoEncontrado, TiempoComidaDuplicado } from "../../domain/restaurante.errors.js"

export class ActualizarTiempoComidaUseCase {
  constructor(private readonly repo: ITiempoComidaRepository) {}

  async ejecutar(id: string, restauranteId: string, data: Partial<TiempoComidaCreateDTO>, userId: string): Promise<TiempoComidaEntity> {
    const existente = await this.repo.findById(id, restauranteId)
    if (!existente) throw new TiempoComidaNoEncontrado(id)

    if (data.nombre && data.nombre !== existente.nombre) {
      const duplicado = await this.repo.findByNombre(restauranteId, data.nombre)
      if (duplicado) throw new TiempoComidaDuplicado(data.nombre)
    }

    return this.repo.update(id, data, userId)
  }
}
