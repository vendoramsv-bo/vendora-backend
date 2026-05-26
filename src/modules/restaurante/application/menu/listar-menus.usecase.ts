import type { IMenuRepository, MenuQueryParams } from "../../domain/ports/IMenuRepository.js"
import type { MenuEntity } from "../../domain/menu.entity.js"

export class ListarMenusUseCase {
  constructor(private readonly repo: IMenuRepository) {}

  async ejecutar(restauranteId: string, params: MenuQueryParams = {}): Promise<MenuEntity[]> {
    return this.repo.findAllByRestaurante(restauranteId, params)
  }
}
