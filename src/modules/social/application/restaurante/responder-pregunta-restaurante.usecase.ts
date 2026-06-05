import type { IRestauranteSocialRepository } from "../../domain/ports/IRestauranteSocialRepository.js"
import { PreguntaRestauranteNoEncontradaError } from "../../domain/restaurante-social.errors.js"

export class ResponderPreguntaRestauranteUseCase {
  constructor(private readonly repo: IRestauranteSocialRepository) {}

  async ejecutar(preguntaId: string, restauranteId: string, userId: string, respuesta: string) {
    const pregunta = await this.repo.findPregunta(preguntaId)
    if (!pregunta || pregunta.restauranteId !== restauranteId) throw new PreguntaRestauranteNoEncontradaError(preguntaId)
    return this.repo.responderPregunta({ preguntaId, userId, respuesta })
  }
}
