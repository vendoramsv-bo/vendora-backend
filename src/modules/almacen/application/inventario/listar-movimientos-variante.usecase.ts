import type { IInventarioProductoRepository } from "../../domain/ports/IInventarioProductoRepository.js"
import type { QueryParams } from "../../../../core/query-params.js"
import { paginate } from "../../../../core/query-params.js"

export class ListarMovimientosVarianteUseCase {
  constructor(private readonly repo: IInventarioProductoRepository) {}

  async execute(varianteId: string, tenantId: string, params: QueryParams) {
    const { data, total } = await this.repo.listarMovimientos(varianteId, tenantId, params)
    return paginate(data as object[], total, params)
  }
}
