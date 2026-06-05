import type { IRestauranteSocialRepository } from "../../domain/ports/IRestauranteSocialRepository.js"
import type { IRestauranteSocialNotificador } from "../../domain/ports/IRestauranteSocialNotificador.js"
import { RestauranteSocialNoEncontradoError } from "../../domain/restaurante-social.errors.js"

export class PreguntarRestauranteUseCase {
  constructor(
    private readonly repo: IRestauranteSocialRepository,
    private readonly notificador: IRestauranteSocialNotificador,
  ) {}

  async ejecutar(slug: string, userId: string, pregunta: string) {
    let info: { restauranteId: string; tenantId: string }
    try {
      info = await this.repo.resolveRestauranteInfo(slug)
    } catch {
      throw new RestauranteSocialNoEncontradoError(slug)
    }
    const p = await this.repo.crearPregunta({ restauranteId: info.restauranteId, userId, pregunta })
    this.notificador.notificarNuevaPregunta(info.tenantId, { restauranteSlug: slug, preguntaId: p.id })
    return p
  }
}
