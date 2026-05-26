import type { IMenuRepository, MenuUpdateData } from "../../domain/ports/IMenuRepository.js"
import type { MenuEntity } from "../../domain/menu.entity.js"
import { MenuNoEncontrado, MenuNoEditable } from "../../domain/restaurante.errors.js"

export class ActualizarMenuUseCase {
  constructor(private readonly repo: IMenuRepository) {}

  async ejecutar(id: string, restauranteId: string, data: MenuUpdateData, userId: string): Promise<MenuEntity> {
    const menu = await this.repo.findById(id, restauranteId)
    if (!menu) throw new MenuNoEncontrado(id)
    if (!menu.esEditable()) throw new MenuNoEditable(menu.estado)
    return this.repo.update(id, data, userId)
  }
}
