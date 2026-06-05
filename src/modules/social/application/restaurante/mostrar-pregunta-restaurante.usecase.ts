import type { IRestauranteSocialRepository } from "../../domain/ports/IRestauranteSocialRepository.js"
import { PreguntaRestauranteNoEncontradaError, PreguntaNoModificableError } from "../../domain/restaurante-social.errors.js"

export class MostrarPreguntaRestauranteUseCase {
  constructor(private readonly repo: IRestauranteSocialRepository) {}

  async ejecutar(slug: string, preguntaId: string, rol: string) {
    if (rol !== "PROPIETARIO" && rol !== "owner" && rol !== "ADMIN") throw new PreguntaNoModificableError()
    let info: { restauranteId: string; tenantId: string }
    try {
      info = await this.repo.resolveRestauranteInfo(slug)
    } catch {
      throw new PreguntaRestauranteNoEncontradaError(preguntaId)
    }
    const pregunta = await this.repo.mostrarPregunta(preguntaId, info.restauranteId)
    return { id: pregunta.id, estado: pregunta.estado }
  }
}
