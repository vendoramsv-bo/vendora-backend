import type { ITiendaRepository } from "../../domain/ports/ITiendaRepository.js"
import type { ITiendaNotificador } from "../../domain/ports/ITiendaNotificador.js"

export class ActivarTiendaUseCase {
  constructor(
    private readonly repo: ITiendaRepository,
    private readonly notificador: ITiendaNotificador | null,
  ) {}

  async execute(tenantId: string, createdById?: string) {
    const result = await this.repo.activar(tenantId, createdById)
    this.notificador?.configuracionActualizada(tenantId, result.tiendaId)
    return result
  }
}
