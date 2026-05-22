import type { IMedicoRepository, ListResult } from "../../domain/ports/IMedicoRepository.js"
import type { MedicoEntity } from "../../domain/medico.entity.js"
import type { QueryParams } from "../../../../core/query-params.js"

export class ListarMedicosUseCase {
  constructor(private readonly repo: IMedicoRepository) {}

  async ejecutar(consultorioId: string, params: QueryParams): Promise<ListResult<MedicoEntity>> {
    return this.repo.listar(consultorioId, params)
  }
}
