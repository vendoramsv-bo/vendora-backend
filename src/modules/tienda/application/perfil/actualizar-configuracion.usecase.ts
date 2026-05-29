import type { ITiendaRepository, ActualizarConfiguracionDTO } from "../../domain/ports/ITiendaRepository.js"
import type { ITiendaNotificador } from "../../domain/ports/ITiendaNotificador.js"

export class ActualizarConfiguracionUseCase {
  constructor(
    private readonly repo: ITiendaRepository,
    private readonly notificador: ITiendaNotificador | null,
  ) {}

  async execute(tenantId: string, dto: ActualizarConfiguracionDTO, updatedById?: string) {
    const config = await this.repo.actualizarConfiguracion(tenantId, dto, updatedById)
    this.notificador?.configuracionActualizada(tenantId, config.id)
    return config
  }
}
