import type { ICajaRepository, CajaAbiertaData } from "../../domain/ports/ICajaRepository.js"
import type { QueryParams } from "../../../../core/query-params.js"
import { paginate } from "../../../../core/query-params.js"

export class ListarCajasUseCase {
  constructor(private readonly cajaRepo: ICajaRepository) {}

  async execute(tenantId: string, params: QueryParams, estadoCaja?: string, puntoVentaId?: string) {
    const { data, total } = await this.cajaRepo.listar(tenantId, params, estadoCaja, puntoVentaId)
    return paginate<CajaAbiertaData>(data, total, params)
  }
}
