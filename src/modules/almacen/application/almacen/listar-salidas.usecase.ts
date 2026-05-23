import type { ISalidaAlmacenRepository } from "../../domain/ports/ISalidaAlmacenRepository.js"
import type { QueryParams } from "../../../../core/query-params.js"
import { paginate } from "../../../../core/query-params.js"

export class ListarSalidasUseCase {
  constructor(private readonly repo: ISalidaAlmacenRepository) {}

  async execute(tenantId: string, params: QueryParams) {
    const { data, total } = await this.repo.listar(tenantId, params)
    return paginate(data as object[], total, params)
  }
}
