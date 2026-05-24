import type { IGastosRepository, GastoData } from "../../domain/ports/IGastosRepository.js"
import type { QueryParams } from "../../../../core/query-params.js"
import { paginate } from "../../../../core/query-params.js"

export class ListarGastosUseCase {
  constructor(private readonly repo: IGastosRepository) {}

  async execute(tenantId: string, params: QueryParams, incluirEliminados = false) {
    const { data, total } = await this.repo.listar(tenantId, params, incluirEliminados)
    return paginate<GastoData>(data, total, params)
  }
}
