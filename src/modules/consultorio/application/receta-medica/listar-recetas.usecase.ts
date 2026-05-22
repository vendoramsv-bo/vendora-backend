import type { IRecetaMedicaRepository } from "../../domain/ports/IRecetaMedicaRepository.js"
import type { ListResult } from "../../domain/ports/IMedicoRepository.js"
import type { RecetaMedicaEntity } from "../../domain/receta-medica.entity.js"
import type { QueryParams } from "../../../../core/query-params.js"

export class ListarRecetasUseCase {
  constructor(private readonly repo: IRecetaMedicaRepository) {}

  async ejecutar(consultorioId: string, params: QueryParams): Promise<ListResult<RecetaMedicaEntity>> {
    return this.repo.listar(consultorioId, params)
  }
}
