import type { ITiendaSocialRepository } from "../../domain/ports/ITiendaSocialRepository.js"

export class ListarComentariosTiendaUseCase {
  constructor(private readonly repo: ITiendaSocialRepository) {}

  async ejecutar(slug: string, params: { take: number; page: number; order: "asc" | "desc" }) {
    const tiendaId = await this.repo.resolveTiendaId(slug)
    return this.repo.listarComentariosTienda(tiendaId, params)
  }
}
