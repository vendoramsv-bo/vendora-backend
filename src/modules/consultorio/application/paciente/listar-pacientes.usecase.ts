import type { IPacienteRepository } from "../../domain/ports/IPacienteRepository.js"
import type { ListResult } from "../../domain/ports/IMedicoRepository.js"
import type { PacienteEntity } from "../../domain/paciente.entity.js"
import type { QueryParams } from "../../../../core/query-params.js"

export class ListarPacientesUseCase {
  constructor(private readonly repo: IPacienteRepository) {}

  async ejecutar(consultorioId: string, params: QueryParams): Promise<ListResult<PacienteEntity>> {
    return this.repo.listar(consultorioId, params)
  }
}
