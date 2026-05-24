import type { IPacienteRepository, PacienteCreateDTO } from "../../domain/ports/IPacienteRepository.js"
import type { PacienteEntity } from "../../domain/paciente.entity.js"
import { DNIYaRegistrado } from "../../domain/consultorio.errors.js"

export class CrearPacienteUseCase {
  constructor(private readonly repo: IPacienteRepository) {}

  async ejecutar(data: PacienteCreateDTO, consultorioId: string, userId: string): Promise<PacienteEntity> {
    if (data.dni) {
      const existe = await this.repo.existeDni(consultorioId, data.dni)
      if (existe) throw new DNIYaRegistrado()
    }
    return this.repo.crear(data, consultorioId, userId)
  }
}
