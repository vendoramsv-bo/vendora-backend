import type { ITenantRepository } from "../domain/ports/ITenantRepository.js"
import type { TenantEntity } from "../domain/tenant.entity.js"

export class ObtenerTenantUseCase {
  constructor(private readonly repo: ITenantRepository) {}

  async ejecutar(tenantId: string): Promise<TenantEntity> {
    return this.repo.obtener(tenantId)
  }
}
