import type { IMedicoRepository } from "../../domain/ports/IMedicoRepository.js"
import type { MedicoEntity } from "../../domain/medico.entity.js"

export class ObtenerMedicoUseCase {
  constructor(private readonly repo: IMedicoRepository) {}

  async ejecutar(id: string, consultorioId: string): Promise<MedicoEntity> {
    return this.repo.obtener(id, consultorioId)
  }
}
