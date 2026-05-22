import type { IRecetaMedicaRepository } from "../../domain/ports/IRecetaMedicaRepository.js"
import type { RecetaMedicaEntity } from "../../domain/receta-medica.entity.js"

export class ObtenerRecetaUseCase {
  constructor(private readonly repo: IRecetaMedicaRepository) {}

  async ejecutar(id: string, consultorioId: string): Promise<RecetaMedicaEntity> {
    return this.repo.obtener(id, consultorioId)
  }
}
