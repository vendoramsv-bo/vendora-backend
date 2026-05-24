import type { IPacienteRepository } from "../../domain/ports/IPacienteRepository.js"
import type { PacienteEntity, PacienteRaw } from "../../domain/paciente.entity.js"
import { DNIYaRegistrado } from "../../domain/consultorio.errors.js"

export class ActualizarPacienteUseCase {
  constructor(private readonly repo: IPacienteRepository) {}

  async ejecutar(id: string, data: Partial<PacienteRaw>, userId: string, consultorioId: string): Promise<PacienteEntity> {
    await this.repo.obtener(id, consultorioId)
    if (data.dni) {
      const existe = await this.repo.existeDni(consultorioId, data.dni, id)
      if (existe) throw new DNIYaRegistrado()
    }
    return this.repo.actualizar(id, data, userId)
  }
}
