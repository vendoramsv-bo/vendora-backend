import type { ITiendaRepository } from "../../domain/ports/ITiendaRepository.js"
import type { QueryParams } from "../../../../core/query-params.js"

export class ListarCatalogoPublicoUseCase {
  constructor(private readonly repo: ITiendaRepository) {}

  async execute(slug: string, params: QueryParams) {
    return this.repo.listarCatalogoPublico(slug, params)
  }
}
