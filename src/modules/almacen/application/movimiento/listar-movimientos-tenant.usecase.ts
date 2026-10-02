import type {
  IMovimientoTenantRepository,
  QueryParamsMovimientosTenant,
} from "../../domain/ports/IMovimientoTenantRepository.js"
import { paginate } from "../../../../core/query-params.js"

export class ListarMovimientosTenantUseCase {
  constructor(private readonly repo: IMovimientoTenantRepository) {}

  async execute(tenantId: string, params: QueryParamsMovimientosTenant) {
    const { data, total } = await this.repo.listar(tenantId, params)
    return paginate(data, total, params)
  }
}
