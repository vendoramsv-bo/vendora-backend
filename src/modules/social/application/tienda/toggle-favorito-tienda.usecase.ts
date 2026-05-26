import type { ITiendaSocialRepository } from "../../domain/ports/ITiendaSocialRepository.js"

export class ToggleFavoritoTiendaUseCase {
  constructor(private readonly repo: ITiendaSocialRepository) {}

  async ejecutar(slug: string, userId: string) {
    const tiendaId = await this.repo.resolveTiendaId(slug)
    return this.repo.toggleFavoritoTienda(tiendaId, userId)
  }
}
