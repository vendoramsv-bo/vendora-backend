import type { IMedicoRepository, HorarioCreateDTO } from "../../domain/ports/IMedicoRepository.js"
import type { HorarioAtencionRaw } from "../../domain/medico.entity.js"
import { MedicoNoEncontrado } from "../../domain/consultorio.errors.js"

export class GestionarHorariosUseCase {
  constructor(private readonly repo: IMedicoRepository) {}

  async agregar(medicoId: string, data: HorarioCreateDTO, consultorioId: string): Promise<HorarioAtencionRaw> {
    const medico = await this.repo.obtener(medicoId, consultorioId)
    void medico
    return this.repo.agregarHorario(medicoId, data)
  }

  async eliminar(horarioId: string, medicoId: string, consultorioId: string): Promise<void> {
    const medico = await this.repo.obtener(medicoId, consultorioId)
    if (!medico) throw new MedicoNoEncontrado(medicoId)
    return this.repo.eliminarHorario(horarioId, medicoId)
  }
}
