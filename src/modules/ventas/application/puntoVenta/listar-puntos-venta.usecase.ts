import type { IPuntoVentaRepository, PuntoVentaData } from "../../domain/ports/IPuntoVentaRepository.js"
import type { QueryParams } from "../../../../core/query-params.js"
import { paginate } from "../../../../core/query-params.js"

export class ListarPuntosVentaUseCase {
  constructor(private readonly repo: IPuntoVentaRepository) {}

  async execute(tenantId: string, params: QueryParams) {
    const { data, total } = await this.repo.listar(tenantId, params)
    return paginate<PuntoVentaData>(data, total, params)
  }
}
