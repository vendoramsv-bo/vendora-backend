import type { IConsultorioSocialRepository } from "../../domain/ports/IConsultorioSocialRepository.js"
import { PreguntaNoEncontradaError } from "../../domain/consultorio-social.errors.js"

export class ResponderPreguntaConsultorioUseCase {
  constructor(private readonly repo: IConsultorioSocialRepository) {}

  async ejecutar(preguntaId: string, consultorioId: string, userId: string, respuesta: string) {
    const pregunta = await this.repo.findPregunta(preguntaId)
    if (!pregunta || pregunta.consultorioId !== consultorioId) throw new PreguntaNoEncontradaError(preguntaId)
    return this.repo.responderPregunta({ preguntaId, userId, respuesta })
  }
}
