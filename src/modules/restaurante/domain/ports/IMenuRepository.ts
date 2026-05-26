import type { MenuEntity } from "../menu.entity.js"

export interface MenuQueryParams {
  estado?: string
  tipo?: string
  fechaInicio?: Date
  fechaFin?: Date
  page?: number
  limit?: number
}

export interface MenuCreateData {
  restauranteId: string
  nombre: string
  tipo: string
  fechaInicio: Date
  fechaFin: Date
  descripcion?: string | null
  imagenPortada?: string | null
  tema?: string | null
  creadoPorId?: string | null
}

export interface MenuUpdateData {
  nombre?: string
  tipo?: string
  fechaInicio?: Date
  fechaFin?: Date
  descripcion?: string | null
  imagenPortada?: string | null
  tema?: string | null
}

export interface IMenuRepository {
  findAllByRestaurante(restauranteId: string, params?: MenuQueryParams): Promise<MenuEntity[]>
  findById(id: string, restauranteId?: string): Promise<MenuEntity | null>
  create(data: MenuCreateData, userId: string): Promise<MenuEntity>
  update(id: string, data: MenuUpdateData, userId: string): Promise<MenuEntity>
  changeEstado(id: string, estado: string, userId: string, fechaPublicacion?: Date): Promise<MenuEntity>
  countItemsDisponibles(menuId: string): Promise<number>
  findPublicadosBySlug(slug: string, fecha: Date): Promise<MenuEntity[]>
}
