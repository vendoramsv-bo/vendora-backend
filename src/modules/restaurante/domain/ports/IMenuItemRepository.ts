import type { MenuItemEntity } from "../menu-item.entity.js"

export interface MenuItemCreateData {
  menuId: string
  tiempoComidaId: string
  productoId: string
  // Snapshot fetched by infrastructure layer from catalogo schema
  precio: number
  esEspecial?: boolean
  destacado?: boolean
  disponible?: boolean
  orden?: number
  notaMenu?: string | null
}

export interface MenuItemUpdateData {
  precio?: number
  esEspecial?: boolean
  destacado?: boolean
  disponible?: boolean
  orden?: number
  notaMenu?: string | null
}

export interface IMenuItemRepository {
  findAllByMenu(menuId: string): Promise<MenuItemEntity[]>
  findById(id: string): Promise<MenuItemEntity | null>
  findByProductoEnMenu(menuId: string, tiempoComidaId: string, productoId: string): Promise<MenuItemEntity | null>
  create(data: MenuItemCreateData): Promise<MenuItemEntity>
  update(id: string, data: MenuItemUpdateData): Promise<MenuItemEntity>
  delete(id: string): Promise<void>
  countReservasActivas(menuItemId: string): Promise<number>
}
