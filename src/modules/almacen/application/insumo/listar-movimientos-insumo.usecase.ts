import type { IInsumoRepository } from "../../domain/ports/IInsumoRepository.js"
import type { QueryParams } from "../../../../core/query-params.js"
import { paginate } from "../../../../core/query-params.js"

export class ListarMovimientosInsumoUseCase {
  constructor(private readonly repo: IInsumoRepository) {}

  async execute(insumoId: string, tenantId: string, params: QueryParams) {
    const { data, total } = await this.repo.listarMovimientos(insumoId, tenantId, params)
    return paginate(data as object[], total, params)
  }
}
