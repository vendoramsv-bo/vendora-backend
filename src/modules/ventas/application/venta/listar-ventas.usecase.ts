import type { IVentaRepository, VentaData } from "../../domain/ports/IVentaRepository.js"
import type { QueryParams } from "../../../../core/query-params.js"
import { paginate } from "../../../../core/query-params.js"

export interface ListarVentasFiltros {
  fecha?: Date
  estadoPago?: string
  tipoPago?: string
  puntoVentaId?: string
  turnoId?: string
  clienteId?: string
  /** Alcance derivado en el servidor. No es un parámetro del cliente (FR-014). */
  tenantMemberId?: string
}

export class ListarVentasUseCase {
  constructor(private readonly repo: IVentaRepository) {}

  async execute(tenantId: string, params: QueryParams, filtros?: ListarVentasFiltros) {
    const { data, total } = await this.repo.listar(tenantId, params, filtros)
    return paginate<VentaData>(data, total, params)
  }
}
