import type { IRestauranteSocialRepository } from "../../domain/ports/IRestauranteSocialRepository.js"
import { RestauranteSocialNoEncontradoError } from "../../domain/restaurante-social.errors.js"

export class ListarPreguntasRestauranteUseCase {
  constructor(private readonly repo: IRestauranteSocialRepository) {}

  async ejecutar(slug: string, params: { take: number; cursor?: string; order?: "asc" | "desc"; incluirInactivas?: boolean }) {
    let info: { restauranteId: string; tenantId: string }
    try {
      info = await this.repo.resolveRestauranteInfo(slug)
    } catch {
      throw new RestauranteSocialNoEncontradoError(slug)
    }
    return this.repo.listarPreguntas(info.restauranteId, { take: params.take, cursor: params.cursor, order: params.order ?? "desc", incluirInactivas: params.incluirInactivas })
  }
}
