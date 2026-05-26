import type { IPublicacionRRSSRepository } from "../../domain/ports/IPublicacionRRSSRepository.js"
import type { PublicacionRRSSEntity } from "../../domain/publicacion-rrss.entity.js"
import { PublicacionNoEncontrada } from "../../domain/restaurante.errors.js"

export class ObtenerPublicacionUseCase {
  constructor(private readonly repo: IPublicacionRRSSRepository) {}

  async ejecutar(id: string, restauranteId?: string): Promise<PublicacionRRSSEntity> {
    const pub = await this.repo.findById(id, restauranteId)
    if (!pub) throw new PublicacionNoEncontrada(id)
    return pub
  }
}
