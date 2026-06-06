import type { IConsultorioPublicoRepository } from "../../domain/ports/IConsultorioPublicoRepository.js"

export class ActivarPerfilPublicoConsultorioUseCase {
  constructor(private readonly repo: IConsultorioPublicoRepository) {}

  async ejecutar(tenantId: string, actorId: string): Promise<{ esConsultorio: true }> {
    await this.repo.activarPerfil(tenantId, actorId)
    return { esConsultorio: true }
  }
}
