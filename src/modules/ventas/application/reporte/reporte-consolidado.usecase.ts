import type { IReporteRepository, ReporteIngresoDTO, ReporteFiltros } from "../../domain/ports/IReporteRepository.js"
import type { QueryParams } from "../../../../core/query-params.js"

export interface ReporteConsolidadoInput {
  tenantId: string
  filtros: ReporteFiltros
  params: QueryParams
}

export class ReporteConsolidadoUseCase {
  constructor(private readonly repo: IReporteRepository) {}

  async execute(input: ReporteConsolidadoInput) {
    const { take, skip } = input.params
    const { data, total } = await this.repo.getConsolidado(input.tenantId, input.filtros, take, skip)

    return {
      data: data as ReporteIngresoDTO[],
      meta: {
        take,
        skip,
        total,
        hasMore: skip + data.length < total,
        nextCursor: skip + data.length < total ? skip + take : null,
      },
    }
  }
}
