import type { IRestauranteSocialRepository } from "../../domain/ports/IRestauranteSocialRepository.js"
import type { IRestauranteSocialNotificador } from "../../domain/ports/IRestauranteSocialNotificador.js"
import { RestauranteSocialNoEncontradoError } from "../../domain/restaurante-social.errors.js"

export class ToggleSeguirRestauranteUseCase {
  constructor(
    private readonly repo: IRestauranteSocialRepository,
    private readonly notificador: IRestauranteSocialNotificador,
  ) {}

  async ejecutar(slug: string, userId: string) {
    let info: { restauranteId: string; tenantId: string }
    try {
      info = await this.repo.resolveRestauranteInfo(slug)
    } catch {
      throw new RestauranteSocialNoEncontradoError(slug)
    }
    const resultado = await this.repo.toggleSeguir(info.restauranteId, userId)
    if (resultado.siguiendo) {
      this.notificador.notificarNuevoSeguidor(info.tenantId, { restauranteSlug: slug, totalSeguidores: resultado.totalSeguidores })
    }
    return resultado
  }
}
