import type { ITiempoComidaRepository, TiempoComidaCreateDTO } from "../../domain/ports/ITiempoComidaRepository.js"
import type { TiempoComidaEntity } from "../../domain/tiempo-comida.entity.js"
import { TiempoComidaDuplicado } from "../../domain/restaurante.errors.js"

export class CrearTiempoComidaUseCase {
  constructor(private readonly repo: ITiempoComidaRepository) {}

  async ejecutar(data: TiempoComidaCreateDTO, userId: string): Promise<TiempoComidaEntity> {
    const existente = await this.repo.findByNombre(data.restauranteId, data.nombre)
    if (existente) throw new TiempoComidaDuplicado(data.nombre)

    if (data.orden === undefined) {
      const todos = await this.repo.findAllByRestaurante(data.restauranteId, false)
      data = { ...data, orden: todos.length }
    }

    return this.repo.create(data, userId)
  }
}
