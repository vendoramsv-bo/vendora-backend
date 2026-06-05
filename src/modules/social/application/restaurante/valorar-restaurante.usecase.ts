import type { IRestauranteSocialRepository } from "../../domain/ports/IRestauranteSocialRepository.js"
import type { IRestauranteSocialNotificador } from "../../domain/ports/IRestauranteSocialNotificador.js"
import { RestauranteSocialNoEncontradoError, ValoracionFueraDeRangoError } from "../../domain/restaurante-social.errors.js"

export class ValorarRestauranteUseCase {
  constructor(
    private readonly repo: IRestauranteSocialRepository,
    private readonly notificador: IRestauranteSocialNotificador,
  ) {}

  async ejecutar(slug: string, userId: string, puntuacion: number, resena?: string) {
    if (puntuacion < 1 || puntuacion > 5) throw new ValoracionFueraDeRangoError()
    let info: { restauranteId: string; tenantId: string }
    try {
      info = await this.repo.resolveRestauranteInfo(slug)
    } catch {
      throw new RestauranteSocialNoEncontradoError(slug)
    }
    const valoracion = await this.repo.upsertValoracion({ restauranteId: info.restauranteId, userId, puntuacion, resena })
    const promedio = await this.repo.getPromedioValoraciones(info.restauranteId)
    this.notificador.notificarNuevaValoracion(info.tenantId, { restauranteSlug: slug, puntuacion, promedio })
    return { id: valoracion.id, puntuacion: valoracion.puntuacion, resena: valoracion.resena, promedio }
  }
}
