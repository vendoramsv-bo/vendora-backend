import type { IMenuRepository } from "../../domain/ports/IMenuRepository.js"
import type { MenuEntity } from "../../domain/menu.entity.js"
import { MenuNoEncontrado, MenuSinItemsDisponibles } from "../../domain/restaurante.errors.js"

export class CambiarEstadoMenuUseCase {
  constructor(private readonly repo: IMenuRepository) {}

  async ejecutar(id: string, restauranteId: string, nuevoEstado: string, userId: string): Promise<MenuEntity> {
    const menu = await this.repo.findById(id, restauranteId)
    if (!menu) throw new MenuNoEncontrado(id)

    menu.validarTransicion(nuevoEstado)

    if (nuevoEstado === "PUBLICADO") {
      const itemsDisponibles = await this.repo.countItemsDisponibles(id)
      if (itemsDisponibles === 0) throw new MenuSinItemsDisponibles()
    }

    const fechaPublicacion = nuevoEstado === "PUBLICADO" ? new Date() : undefined
    return this.repo.changeEstado(id, nuevoEstado, userId, fechaPublicacion)
  }
}
