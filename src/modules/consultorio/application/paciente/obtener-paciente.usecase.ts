import type { IPacienteRepository } from "../../domain/ports/IPacienteRepository.js"
import type { PacienteEntity } from "../../domain/paciente.entity.js"

export class ObtenerPacienteUseCase {
  constructor(private readonly repo: IPacienteRepository) {}

  async ejecutar(id: string, consultorioId: string): Promise<PacienteEntity> {
    return this.repo.obtener(id, consultorioId)
  }
}
