import type { ICitaRepository } from "../../domain/ports/ICitaRepository.js"
import type { ListResult } from "../../domain/ports/IMedicoRepository.js"
import type { CitaEntity } from "../../domain/cita.entity.js"
import type { QueryParams } from "../../../../core/query-params.js"

export class ListarCitasUseCase {
  constructor(private readonly repo: ICitaRepository) {}

  async ejecutar(consultorioId: string, params: QueryParams): Promise<ListResult<CitaEntity>> {
    return this.repo.listar(consultorioId, params)
  }
}
