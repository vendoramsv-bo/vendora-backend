import type { IVacunacionRepository } from "../../domain/ports/IVacunacionRepository.js"
import type { VacunacionEntity } from "../../domain/vacunacion.entity.js"
import type { QueryParams } from "../../../../core/query-params.js"

export class ListarVacunacionesUseCase {
  constructor(private readonly vacunacionRepo: IVacunacionRepository) {}

  async ejecutar(pacienteId: string, params: QueryParams): Promise<VacunacionEntity[]> {
    return this.vacunacionRepo.listar(pacienteId, params)
  }
}
