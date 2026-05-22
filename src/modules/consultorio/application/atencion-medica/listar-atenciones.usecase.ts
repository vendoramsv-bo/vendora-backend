import type { IAtencionMedicaRepository } from "../../domain/ports/IAtencionMedicaRepository.js"
import type { ListResult } from "../../domain/ports/IMedicoRepository.js"
import type { AtencionMedicaEntity } from "../../domain/atencion-medica.entity.js"
import type { QueryParams } from "../../../../core/query-params.js"

export class ListarAtencionesUseCase {
  constructor(private readonly repo: IAtencionMedicaRepository) {}

  async ejecutar(consultorioId: string, params: QueryParams): Promise<ListResult<AtencionMedicaEntity>> {
    return this.repo.listar(consultorioId, params)
  }
}
