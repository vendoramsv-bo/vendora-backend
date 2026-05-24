import type { ITurnoAtencionRepository, TurnoAtencionData } from "../../domain/ports/ITurnoAtencionRepository.js"
import type { QueryParams } from "../../../../core/query-params.js"
import { paginate } from "../../../../core/query-params.js"

export class ListarTurnosAtencionUseCase {
  constructor(private readonly repo: ITurnoAtencionRepository) {}

  async execute(tenantId: string, params: QueryParams) {
    const { data, total } = await this.repo.listar(tenantId, params)
    return paginate<TurnoAtencionData>(data, total, params)
  }
}
