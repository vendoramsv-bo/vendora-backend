import type { IMenuRepository } from "../../domain/ports/IMenuRepository.js"
import type { IMenuItemRepository } from "../../domain/ports/IMenuItemRepository.js"
import { MenuNoEncontrado, ItemNoDisponible, ItemConReservasActivas } from "../../domain/restaurante.errors.js"

export class EliminarItemMenuUseCase {
  constructor(
    private readonly menuRepo: IMenuRepository,
    private readonly itemRepo: IMenuItemRepository,
  ) {}

  async ejecutar(menuId: string, itemId: string, restauranteId: string): Promise<void> {
    const menu = await this.menuRepo.findById(menuId, restauranteId)
    if (!menu) throw new MenuNoEncontrado(menuId)

    const item = await this.itemRepo.findById(itemId)
    if (!item || item.menuId !== menuId) throw new ItemNoDisponible(itemId)

    const reservasActivas = await this.itemRepo.countReservasActivas(itemId)
    if (reservasActivas > 0) throw new ItemConReservasActivas()

    await this.itemRepo.delete(itemId)
  }
}
