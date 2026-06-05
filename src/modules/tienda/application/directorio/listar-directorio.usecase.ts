import type { ITiendaRepository, DirectorioQueryDTO } from "../../domain/ports/ITiendaRepository.js"

export class ListarDirectorioUseCase {
  constructor(private readonly repo: ITiendaRepository) {}

  async execute(query: DirectorioQueryDTO) {
    return this.repo.listarDirectorio(query)
  }
}
