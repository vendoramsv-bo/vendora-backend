import type { ITiendaSocialRepository } from "../../domain/ports/ITiendaSocialRepository.js"

export class PreguntarTiendaUseCase {
  constructor(private readonly repo: ITiendaSocialRepository) {}

  async ejecutar(slug: string, userId: string, pregunta: string) {
    const tiendaId = await this.repo.resolveTiendaId(slug)
    return this.repo.crearPreguntaTienda({ tiendaId, userId, pregunta })
  }
}
