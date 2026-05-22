import type { IPacienteRepository } from "../../domain/ports/IPacienteRepository.js"
import type { PacienteEntity, PacienteRaw } from "../../domain/paciente.entity.js"

export class ActualizarPacienteUseCase {
  constructor(private readonly repo: IPacienteRepository) {}

  async ejecutar(id: string, data: Partial<PacienteRaw>, userId: string, consultorioId: string): Promise<PacienteEntity> {
    await this.repo.obtener(id, consultorioId)
    return this.repo.actualizar(id, data, userId)
  }
}
