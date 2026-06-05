import type { IRestauranteSocialRepository } from "../../domain/ports/IRestauranteSocialRepository.js"
import { RestauranteSocialNoEncontradoError } from "../../domain/restaurante-social.errors.js"

export class ListarComentariosRestauranteUseCase {
  constructor(private readonly repo: IRestauranteSocialRepository) {}

  async ejecutar(slug: string, params: { take: number; cursor?: string; padreId?: string; order?: "asc" | "desc" }) {
    let info: { restauranteId: string; tenantId: string }
    try {
      info = await this.repo.resolveRestauranteInfo(slug)
    } catch {
      throw new RestauranteSocialNoEncontradoError(slug)
    }
    return this.repo.listarComentarios(info.restauranteId, { take: params.take, cursor: params.cursor, padreId: params.padreId, order: params.order ?? "desc" })
  }
}
