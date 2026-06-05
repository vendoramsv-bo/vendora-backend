import type { IRestauranteSocialRepository } from "../../domain/ports/IRestauranteSocialRepository.js"
import type { IRestauranteSocialNotificador } from "../../domain/ports/IRestauranteSocialNotificador.js"
import { RestauranteSocialNoEncontradoError } from "../../domain/restaurante-social.errors.js"

export class ComentarRestauranteUseCase {
  constructor(
    private readonly repo: IRestauranteSocialRepository,
    private readonly notificador: IRestauranteSocialNotificador,
  ) {}

  async ejecutar(slug: string, userId: string, contenido: string, padreId?: string) {
    let info: { restauranteId: string; tenantId: string }
    try {
      info = await this.repo.resolveRestauranteInfo(slug)
    } catch {
      throw new RestauranteSocialNoEncontradoError(slug)
    }
    const comentario = await this.repo.crearComentario({ restauranteId: info.restauranteId, userId, contenido, padreId })
    this.notificador.notificarNuevoComentario(info.tenantId, { restauranteSlug: slug, comentarioId: comentario.id })
    return comentario
  }
}
