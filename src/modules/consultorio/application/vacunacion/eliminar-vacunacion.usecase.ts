import type { IVacunacionRepository } from "../../domain/ports/IVacunacionRepository.js"
import { VacunacionNoEncontrada } from "../../domain/consultorio.errors.js"

export class EliminarVacunacionUseCase {
  constructor(private readonly vacunacionRepo: IVacunacionRepository) {}

  async ejecutar(id: string, pacienteId: string): Promise<void> {
    const vac = await this.vacunacionRepo.obtenerPorId(id)
    if (!vac || vac.pacienteId !== pacienteId) throw new VacunacionNoEncontrada(id)
    await this.vacunacionRepo.eliminar(id, pacienteId)
  }
}
