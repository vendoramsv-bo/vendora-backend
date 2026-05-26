import type { IRestauranteRepository } from "../../domain/ports/IRestauranteRepository.js"
import type { RestauranteEntity, RestauranteRaw } from "../../domain/restaurante.entity.js"

export class ActualizarRestauranteUseCase {
  constructor(private readonly repo: IRestauranteRepository) {}

  async ejecutar(tenantId: string, data: Partial<RestauranteRaw>, userId: string): Promise<RestauranteEntity> {
    return this.repo.upsert(tenantId, data, userId)
  }
}
