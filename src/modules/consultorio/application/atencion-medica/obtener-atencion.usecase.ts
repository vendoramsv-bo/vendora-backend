import type { IAtencionMedicaRepository } from "../../domain/ports/IAtencionMedicaRepository.js"
import type { AtencionMedicaEntity } from "../../domain/atencion-medica.entity.js"

export class ObtenerAtencionUseCase {
  constructor(private readonly repo: IAtencionMedicaRepository) {}

  async ejecutar(id: string, consultorioId: string): Promise<AtencionMedicaEntity> {
    return this.repo.obtener(id, consultorioId)
  }
}
