import type { IAtencionMedicaRepository, AtencionCreateDTO } from "../../domain/ports/IAtencionMedicaRepository.js"
import type { AtencionMedicaEntity } from "../../domain/atencion-medica.entity.js"

export class CrearAtencionUseCase {
  constructor(private readonly repo: IAtencionMedicaRepository) {}

  async ejecutar(data: AtencionCreateDTO, consultorioId: string, userId: string): Promise<AtencionMedicaEntity> {
    return this.repo.crear(data, consultorioId, userId)
  }
}
