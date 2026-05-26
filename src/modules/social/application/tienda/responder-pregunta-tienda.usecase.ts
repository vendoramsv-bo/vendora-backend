import type { ITiendaSocialRepository } from "../../domain/ports/ITiendaSocialRepository.js"
import { PreguntaNoEncontrada } from "../../domain/social.errors.js"

export class ResponderPreguntaTiendaUseCase {
  constructor(private readonly repo: ITiendaSocialRepository) {}

  async ejecutar(preguntaId: string, userId: string, respuesta: string) {
    const pregunta = await this.repo.findPreguntaTienda(preguntaId)
    if (!pregunta) throw new PreguntaNoEncontrada(preguntaId)

    return this.repo.crearRespuestaTienda({ preguntaId, userId, respuesta })
  }
}
