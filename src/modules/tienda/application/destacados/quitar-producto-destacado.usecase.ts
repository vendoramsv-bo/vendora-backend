import type { ITiendaRepository } from "../../domain/ports/ITiendaRepository.js"
import type { ITiendaNotificador } from "../../domain/ports/ITiendaNotificador.js"

export class QuitarProductoDestacadoUseCase {
  constructor(
    private readonly repo: ITiendaRepository,
    private readonly notificador: ITiendaNotificador | null,
  ) {}

  async execute(tenantId: string, productoId: string) {
    await this.repo.quitarDestacado(tenantId, productoId)
    this.notificador?.destacadosActualizados(tenantId, "")
  }
}
