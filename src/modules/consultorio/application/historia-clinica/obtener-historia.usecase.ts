import type { IHistoriaClinicaRepository } from "../../domain/ports/IHistoriaClinicaRepository.js"
import type { HistoriaClinicaEntity } from "../../domain/historia-clinica.entity.js"

export class ObtenerHistoriaUseCase {
  constructor(private readonly repo: IHistoriaClinicaRepository) {}

  async ejecutar(id: string, consultorioId: string): Promise<HistoriaClinicaEntity> {
    return this.repo.obtener(id, consultorioId)
  }
}
