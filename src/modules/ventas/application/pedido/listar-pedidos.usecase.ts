import type { IPedidoRepository, PedidoData } from "../../domain/ports/IPedidoRepository.js"
import type { QueryParams } from "../../../../core/query-params.js"
import { paginate } from "../../../../core/query-params.js"

export class ListarPedidosUseCase {
  constructor(private readonly repo: IPedidoRepository) {}

  async execute(tenantId: string, params: QueryParams, filters?: { estado?: string; userId?: string }) {
    const { data, total } = await this.repo.listar(tenantId, params, filters)
    return paginate<PedidoData>(data, total, params)
  }
}
