import type { IPublicacionRRSSRepository, PublicacionQueryParams } from "../../domain/ports/IPublicacionRRSSRepository.js"
import type { PublicacionRRSSEntity } from "../../domain/publicacion-rrss.entity.js"

export class ListarPublicacionesUseCase {
  constructor(private readonly repo: IPublicacionRRSSRepository) {}

  async ejecutar(restauranteId: string, params: PublicacionQueryParams = {}): Promise<PublicacionRRSSEntity[]> {
    return this.repo.findAllByRestaurante(restauranteId, params)
  }
}
