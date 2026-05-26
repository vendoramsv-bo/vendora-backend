import type { IRestauranteRepository } from "../../domain/ports/IRestauranteRepository.js"
import type { RestauranteEntity } from "../../domain/restaurante.entity.js"
import { RestauranteNoEncontrado } from "../../domain/restaurante.errors.js"

export class ObtenerRestauranteUseCase {
  constructor(private readonly repo: IRestauranteRepository) {}

  async ejecutar(tenantId: string): Promise<RestauranteEntity> {
    const restaurante = await this.repo.findByTenantId(tenantId)
    if (!restaurante) throw new RestauranteNoEncontrado()
    return restaurante
  }
}
