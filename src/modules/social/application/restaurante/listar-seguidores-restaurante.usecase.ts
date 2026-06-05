import type { IRestauranteSocialRepository } from "../../domain/ports/IRestauranteSocialRepository.js"
import { RestauranteSocialNoEncontradoError } from "../../domain/restaurante-social.errors.js"

export class ListarSeguidoresRestauranteUseCase {
  constructor(private readonly repo: IRestauranteSocialRepository) {}

  async ejecutar(slug: string, params: { take: number; cursor?: string }) {
    let info: { restauranteId: string; tenantId: string }
    try {
      info = await this.repo.resolveRestauranteInfo(slug)
    } catch {
      throw new RestauranteSocialNoEncontradoError(slug)
    }
    return this.repo.listarSeguidores(info.restauranteId, params)
  }
}
