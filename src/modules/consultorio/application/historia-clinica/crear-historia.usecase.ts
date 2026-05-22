import type { IHistoriaClinicaRepository, HistoriaCreateDTO } from "../../domain/ports/IHistoriaClinicaRepository.js"
import type { HistoriaClinicaEntity } from "../../domain/historia-clinica.entity.js"

export class CrearHistoriaUseCase {
  constructor(private readonly repo: IHistoriaClinicaRepository) {}

  async ejecutar(data: HistoriaCreateDTO, consultorioId: string, userId: string): Promise<HistoriaClinicaEntity> {
    return this.repo.crear(data, consultorioId, userId)
  }
}
