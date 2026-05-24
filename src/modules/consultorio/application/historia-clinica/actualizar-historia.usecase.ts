import type { IHistoriaClinicaRepository, HistoriaCreateDTO } from "../../domain/ports/IHistoriaClinicaRepository.js"
import type { HistoriaClinicaEntity } from "../../domain/historia-clinica.entity.js"
import { ConflictoVersionError } from "../../domain/consultorio.errors.js"

export class ActualizarHistoriaUseCase {
  constructor(private readonly repo: IHistoriaClinicaRepository) {}

  async ejecutar(id: string, data: Partial<HistoriaCreateDTO>, userId: string, consultorioId: string, expectedUpdatedAt?: Date): Promise<HistoriaClinicaEntity> {
    const historia = await this.repo.obtener(id, consultorioId)
    if (expectedUpdatedAt !== undefined && historia.updatedAt !== null) {
      if (expectedUpdatedAt.getTime() !== historia.updatedAt.getTime()) throw new ConflictoVersionError()
    }
    return this.repo.actualizar(id, data, userId)
  }
}
