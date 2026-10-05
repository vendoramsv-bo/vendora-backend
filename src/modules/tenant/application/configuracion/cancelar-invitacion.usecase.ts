import type { IMiembrosRepository } from "../../domain/ports/IMiembrosRepository.js"
import { RecursoConfiguracionNoEncontrado } from "../../domain/tenant.errors.js"

export class CancelarInvitacionUseCase {
  constructor(private readonly repo: IMiembrosRepository) {}

  async ejecutar(tenantId: string, invitacionId: string): Promise<void> {
    const invitacion = await this.repo.buscarInvitacionPendiente(tenantId, invitacionId)
    if (!invitacion) throw new RecursoConfiguracionNoEncontrado("Invitación")
    await this.repo.cancelarInvitacion(tenantId, invitacionId)
  }
}
