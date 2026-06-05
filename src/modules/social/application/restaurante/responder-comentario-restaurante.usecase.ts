import type { IRestauranteSocialRepository } from "../../domain/ports/IRestauranteSocialRepository.js"
import { RestauranteSocialNoEncontradoError, ComentarioRestauranteNoEncontradoError } from "../../domain/restaurante-social.errors.js"

export class ResponderComentarioRestauranteUseCase {
  constructor(private readonly repo: IRestauranteSocialRepository) {}

  async ejecutar(slug: string, userId: string, contenido: string, padreId: string) {
    let info: { restauranteId: string; tenantId: string }
    try {
      info = await this.repo.resolveRestauranteInfo(slug)
    } catch {
      throw new RestauranteSocialNoEncontradoError(slug)
    }
    const padre = await this.repo.findComentario(padreId)
    if (!padre || padre.estado !== "ACTIVO") throw new ComentarioRestauranteNoEncontradoError(padreId)
    return this.repo.responderComentario({ restauranteId: info.restauranteId, userId, contenido, padreId })
  }
}
