import type { IRestauranteSocialRepository } from "../../domain/ports/IRestauranteSocialRepository.js"
import type { IRestauranteSocialNotificador } from "../../domain/ports/IRestauranteSocialNotificador.js"
import { RestauranteSocialNoEncontradoError } from "../../domain/restaurante-social.errors.js"

export class ReaccionarRestauranteUseCase {
  constructor(
    private readonly repo: IRestauranteSocialRepository,
    private readonly notificador: IRestauranteSocialNotificador,
  ) {}

  async ejecutar(slug: string, userId: string, tipo: string) {
    let info: { restauranteId: string; tenantId: string }
    try {
      info = await this.repo.resolveRestauranteInfo(slug)
    } catch {
      throw new RestauranteSocialNoEncontradoError(slug)
    }
    const resultado = await this.repo.upsertReaccion(info.restauranteId, userId, tipo)
    this.notificador.notificarNuevaReaccion(info.tenantId, {
      restauranteSlug: slug,
      tipo: resultado.tipo ?? tipo,
      reacciones: resultado.reacciones,
    })
    return { tipo: resultado.tipo, removed: resultado.removed, reacciones: resultado.reacciones }
  }
}
