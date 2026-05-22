import type { IHistoriaClinicaRepository, ExtensionTipo } from "../../domain/ports/IHistoriaClinicaRepository.js"

export class UpsertExtensionUseCase {
  constructor(private readonly repo: IHistoriaClinicaRepository) {}

  async ejecutar(historiaId: string, tipo: ExtensionTipo, data: Record<string, unknown>, consultorioId: string): Promise<void> {
    await this.repo.obtener(historiaId, consultorioId)
    await this.repo.upsertExtension(historiaId, tipo, data)
  }
}
