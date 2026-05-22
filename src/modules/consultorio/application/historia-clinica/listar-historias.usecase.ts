import type { IHistoriaClinicaRepository } from "../../domain/ports/IHistoriaClinicaRepository.js"
import type { ListResult } from "../../domain/ports/IMedicoRepository.js"
import type { HistoriaClinicaEntity } from "../../domain/historia-clinica.entity.js"
import type { QueryParams } from "../../../../core/query-params.js"

export class ListarHistoriasUseCase {
  constructor(private readonly repo: IHistoriaClinicaRepository) {}

  async ejecutar(consultorioId: string, params: QueryParams): Promise<ListResult<HistoriaClinicaEntity>> {
    return this.repo.listar(consultorioId, params)
  }
}
