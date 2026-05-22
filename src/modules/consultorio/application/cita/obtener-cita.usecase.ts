import type { ICitaRepository } from "../../domain/ports/ICitaRepository.js"
import type { CitaEntity } from "../../domain/cita.entity.js"

export class ObtenerCitaUseCase {
  constructor(private readonly repo: ICitaRepository) {}

  async ejecutar(id: string, consultorioId: string): Promise<CitaEntity> {
    return this.repo.obtener(id, consultorioId)
  }
}
