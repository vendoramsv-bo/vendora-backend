import type { IMenuRepository, MenuCreateData } from "../../domain/ports/IMenuRepository.js"
import type { MenuEntity } from "../../domain/menu.entity.js"
import { FechaEnPasado } from "../../domain/restaurante.errors.js"

export class CrearMenuUseCase {
  constructor(private readonly repo: IMenuRepository) {}

  async ejecutar(data: MenuCreateData, userId: string): Promise<MenuEntity> {
    if (data.fechaFin < data.fechaInicio) {
      throw new FechaEnPasado()
    }
    return this.repo.create(data, userId)
  }
}
