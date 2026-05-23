import type { IInventarioProductoRepository } from "../../domain/ports/IInventarioProductoRepository.js"
import type { QueryParams } from "../../../../core/query-params.js"
import { paginate } from "../../../../core/query-params.js"

export class ListarRecuentosUseCase {
  constructor(private readonly repo: IInventarioProductoRepository) {}

  async execute(tenantId: string, params: QueryParams) {
    const { data, total } = await this.repo.listarRecuentos(tenantId, params)
    return paginate(data as object[], total, params)
  }
}
