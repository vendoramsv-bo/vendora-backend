import type { IIngresoAlmacenRepository } from "../../domain/ports/IIngresoAlmacenRepository.js"
import type { QueryParams } from "../../../../core/query-params.js"
import { paginate } from "../../../../core/query-params.js"

export class ListarIngresosUseCase {
  constructor(private readonly repo: IIngresoAlmacenRepository) {}

  async execute(tenantId: string, params: QueryParams) {
    const { data, total } = await this.repo.listar(tenantId, params)
    return paginate(data as object[], total, params)
  }
}
