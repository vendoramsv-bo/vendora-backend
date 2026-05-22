import type { ITenantRepository, ListResult } from "../domain/ports/ITenantRepository.js"
import type { TenantEntity } from "../domain/tenant.entity.js"
import type { QueryParams } from "../../../core/query-params.js"

export class ListarTenantsUsuarioUseCase {
  constructor(private readonly repo: ITenantRepository) {}

  async ejecutar(userId: string, params: QueryParams): Promise<ListResult<{ tenant: TenantEntity; miRol: string }>> {
    return this.repo.listarPorUsuario(userId, params)
  }
}
