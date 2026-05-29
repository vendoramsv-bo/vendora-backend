import type { ITiendaRepository } from "../../domain/ports/ITiendaRepository.js"

export class ListarDestacadosUseCase {
  constructor(private readonly repo: ITiendaRepository) {}

  async execute(tenantId: string) {
    return this.repo.listarDestacados(tenantId)
  }
}
