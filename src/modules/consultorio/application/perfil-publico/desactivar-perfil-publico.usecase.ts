import type { IConsultorioPublicoRepository } from "../../domain/ports/IConsultorioPublicoRepository.js"

export class DesactivarPerfilPublicoConsultorioUseCase {
  constructor(private readonly repo: IConsultorioPublicoRepository) {}

  async ejecutar(tenantId: string, actorId: string): Promise<{ esConsultorio: false }> {
    await this.repo.desactivarPerfil(tenantId, actorId)
    return { esConsultorio: false }
  }
}
