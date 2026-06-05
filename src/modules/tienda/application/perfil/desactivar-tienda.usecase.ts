import type { ITiendaRepository } from "../../domain/ports/ITiendaRepository.js"

export class DesactivarTiendaUseCase {
  constructor(private readonly repo: ITiendaRepository) {}

  async execute(tenantId: string) {
    await this.repo.desactivar(tenantId)
    return { esTienda: false }
  }
}
