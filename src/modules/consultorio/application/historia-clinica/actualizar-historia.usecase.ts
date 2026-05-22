import type { IHistoriaClinicaRepository, HistoriaCreateDTO } from "../../domain/ports/IHistoriaClinicaRepository.js"
import type { HistoriaClinicaEntity } from "../../domain/historia-clinica.entity.js"

export class ActualizarHistoriaUseCase {
  constructor(private readonly repo: IHistoriaClinicaRepository) {}

  async ejecutar(id: string, data: Partial<HistoriaCreateDTO>, userId: string, consultorioId: string): Promise<HistoriaClinicaEntity> {
    await this.repo.obtener(id, consultorioId)
    return this.repo.actualizar(id, data, userId)
  }
}
