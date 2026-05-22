import type { IPacienteRepository, PacienteCreateDTO } from "../../domain/ports/IPacienteRepository.js"
import type { PacienteEntity } from "../../domain/paciente.entity.js"

export class CrearPacienteUseCase {
  constructor(private readonly repo: IPacienteRepository) {}

  async ejecutar(data: PacienteCreateDTO, consultorioId: string, userId: string): Promise<PacienteEntity> {
    return this.repo.crear(data, consultorioId, userId)
  }
}
