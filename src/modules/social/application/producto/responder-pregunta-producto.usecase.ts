import type { IProductoSocialRepository } from "../../domain/ports/IProductoSocialRepository.js"
import { PreguntaNoEncontrada } from "../../domain/social.errors.js"

export class ResponderPreguntaProductoUseCase {
  constructor(private readonly repo: IProductoSocialRepository) {}

  async ejecutar(preguntaId: string, userId: string, respuesta: string) {
    const pregunta = await this.repo.findPreguntaProducto(preguntaId)
    if (!pregunta) throw new PreguntaNoEncontrada(preguntaId)

    return this.repo.crearRespuestaProducto({ preguntaId, userId, respuesta })
  }
}
