import type { IInsumoRepository } from "../../domain/ports/IInsumoRepository.js"
import type { QueryParams } from "../../../../core/query-params.js"
import { paginate } from "../../../../core/query-params.js"

export class ListarInsumosUseCase {
  constructor(private readonly repo: IInsumoRepository) {}

  async execute(tenantId: string, params: QueryParams, stockCritico?: boolean) {
    const { data, total } = await this.repo.listar(tenantId, params, stockCritico)
    return paginate(data as object[], total, params)
  }
}
