import type { IRestauranteSocialRepository } from "../../domain/ports/IRestauranteSocialRepository.js"
import { RestauranteSocialNoEncontradoError } from "../../domain/restaurante-social.errors.js"

export class ListarValoracionesRestauranteUseCase {
  constructor(private readonly repo: IRestauranteSocialRepository) {}

  async ejecutar(slug: string, params: { take: number; page?: number; order?: "asc" | "desc"; orderBy?: string }) {
    let info: { restauranteId: string; tenantId: string }
    try {
      info = await this.repo.resolveRestauranteInfo(slug)
    } catch {
      throw new RestauranteSocialNoEncontradoError(slug)
    }
    return this.repo.listarValoraciones(info.restauranteId, { take: params.take, page: params.page, order: params.order ?? "desc", orderBy: params.orderBy })
  }
}
