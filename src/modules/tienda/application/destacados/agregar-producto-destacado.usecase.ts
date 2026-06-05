import type { ITiendaRepository } from "../../domain/ports/ITiendaRepository.js"
import type { ITiendaNotificador } from "../../domain/ports/ITiendaNotificador.js"

export class AgregarProductoDestacadoUseCase {
  constructor(
    private readonly repo: ITiendaRepository,
    private readonly notificador: ITiendaNotificador | null,
  ) {}

  async execute(tenantId: string, productoId: string, orden?: number, createdById?: string) {
    const result = await this.repo.agregarDestacado({ tenantId, productoId, orden, createdById })
    this.notificador?.destacadosActualizados(tenantId, result.id)
    return result
  }
}
