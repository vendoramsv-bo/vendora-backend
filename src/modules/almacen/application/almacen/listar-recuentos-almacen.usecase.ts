import type { IRecuentoAlmacenRepository } from "../../domain/ports/IRecuentoAlmacenRepository.js"
import type { QueryParams } from "../../../../core/query-params.js"
import { paginate } from "../../../../core/query-params.js"

export class ListarRecuentosAlmacenUseCase {
  constructor(private readonly repo: IRecuentoAlmacenRepository) {}

  async execute(tenantId: string, params: QueryParams) {
    const { data, total } = await this.repo.listar(tenantId, params)
    return paginate(data as object[], total, params)
  }
}
