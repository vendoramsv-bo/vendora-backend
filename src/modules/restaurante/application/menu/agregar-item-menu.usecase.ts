import type { IMenuRepository } from "../../domain/ports/IMenuRepository.js"
import type { IMenuItemRepository, MenuItemCreateData } from "../../domain/ports/IMenuItemRepository.js"
import type { MenuItemEntity } from "../../domain/menu-item.entity.js"
import { MenuNoEncontrado, MenuNoEditable, ItemDuplicado } from "../../domain/restaurante.errors.js"

export class AgregarItemMenuUseCase {
  constructor(
    private readonly menuRepo: IMenuRepository,
    private readonly itemRepo: IMenuItemRepository,
  ) {}

  async ejecutar(menuId: string, restauranteId: string, data: MenuItemCreateData): Promise<MenuItemEntity> {
    const menu = await this.menuRepo.findById(menuId, restauranteId)
    if (!menu) throw new MenuNoEncontrado(menuId)
    if (!menu.esEditable()) throw new MenuNoEditable(menu.estado)

    const existente = await this.itemRepo.findByProductoEnMenu(menuId, data.tiempoComidaId, data.productoId)
    if (existente) throw new ItemDuplicado()

    return this.itemRepo.create(data)
  }
}
