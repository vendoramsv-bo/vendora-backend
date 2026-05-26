import type { RestauranteEntity, RestauranteRaw } from "../restaurante.entity.js"

export interface IRestauranteRepository {
  findByTenantId(tenantId: string): Promise<RestauranteEntity | null>
  upsert(tenantId: string, data: Partial<RestauranteRaw>, userId: string): Promise<RestauranteEntity>
}
