import type { IMenuRepository } from "../../domain/ports/IMenuRepository.js"
import type { IMenuItemRepository } from "../../domain/ports/IMenuItemRepository.js"
import type { MenuEntity } from "../../domain/menu.entity.js"
import type { MenuItemEntity } from "../../domain/menu-item.entity.js"
import { MenuNoEncontrado } from "../../domain/restaurante.errors.js"

export interface MenuConItems {
  menu: MenuEntity
  items: MenuItemEntity[]
}

export class ObtenerMenuUseCase {
  constructor(
    private readonly menuRepo: IMenuRepository,
    private readonly itemRepo: IMenuItemRepository,
  ) {}

  async ejecutar(id: string, restauranteId?: string): Promise<MenuConItems> {
    const menu = await this.menuRepo.findById(id, restauranteId)
    if (!menu) throw new MenuNoEncontrado(id)
    const items = await this.itemRepo.findAllByMenu(id)
    return { menu, items }
  }
}
