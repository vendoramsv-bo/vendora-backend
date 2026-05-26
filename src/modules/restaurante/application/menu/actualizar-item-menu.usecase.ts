import type { IMenuRepository } from "../../domain/ports/IMenuRepository.js"
import type { IMenuItemRepository, MenuItemUpdateData } from "../../domain/ports/IMenuItemRepository.js"
import type { MenuItemEntity } from "../../domain/menu-item.entity.js"
import { MenuNoEncontrado, MenuNoEditable, ItemNoDisponible } from "../../domain/restaurante.errors.js"

export class ActualizarItemMenuUseCase {
  constructor(
    private readonly menuRepo: IMenuRepository,
    private readonly itemRepo: IMenuItemRepository,
  ) {}

  async ejecutar(menuId: string, itemId: string, restauranteId: string, data: MenuItemUpdateData): Promise<MenuItemEntity> {
    const menu = await this.menuRepo.findById(menuId, restauranteId)
    if (!menu) throw new MenuNoEncontrado(menuId)
    if (!menu.esEditable()) throw new MenuNoEditable(menu.estado)

    const item = await this.itemRepo.findById(itemId)
    if (!item || item.menuId !== menuId) throw new ItemNoDisponible(itemId)

    return this.itemRepo.update(itemId, data)
  }
}
