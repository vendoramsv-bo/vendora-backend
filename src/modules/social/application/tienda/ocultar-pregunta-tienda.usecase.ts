import type { ITiendaSocialRepository } from "../../domain/ports/ITiendaSocialRepository.js"
import { TiendaPreguntaNoEncontradaError } from "../../domain/social.errors.js"

export class OcultarPreguntaTiendaUseCase {
  constructor(private readonly repo: ITiendaSocialRepository) {}

  async execute(slug: string, preguntaId: string) {
    const tiendaId = await this.repo.resolveTiendaId(slug)
    try {
      return await this.repo.ocultarPreguntaTienda(preguntaId, tiendaId)
    } catch {
      throw new TiendaPreguntaNoEncontradaError(preguntaId)
    }
  }
}
