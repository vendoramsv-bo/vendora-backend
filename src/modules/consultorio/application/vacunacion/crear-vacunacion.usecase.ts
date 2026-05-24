import type { IVacunacionRepository, VacunacionCreateDTO } from "../../domain/ports/IVacunacionRepository.js"
import type { IPacienteRepository } from "../../domain/ports/IPacienteRepository.js"
import type { VacunacionEntity } from "../../domain/vacunacion.entity.js"
import { PacienteNoEncontrado } from "../../domain/consultorio.errors.js"

export class CrearVacunacionUseCase {
  constructor(
    private readonly vacunacionRepo: IVacunacionRepository,
    private readonly pacienteRepo: IPacienteRepository,
  ) {}

  async ejecutar(pacienteId: string, consultorioId: string, data: VacunacionCreateDTO): Promise<VacunacionEntity> {
    const paciente = await this.pacienteRepo.obtener(pacienteId, consultorioId).catch(() => null)
    if (!paciente) throw new PacienteNoEncontrado(pacienteId)
    return this.vacunacionRepo.crear(pacienteId, data)
  }
}
