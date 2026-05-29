import type { ITiendaRepository } from "../../domain/ports/ITiendaRepository.js"

export class ObtenerConfiguracionUseCase {
  constructor(private readonly repo: ITiendaRepository) {}

  async execute(tenantId: string) {
    return this.repo.obtenerConfiguracion(tenantId)
  }
}
