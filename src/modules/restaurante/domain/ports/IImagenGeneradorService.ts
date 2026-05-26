export interface MenuItemParaImagen {
  nombre: string
  precio: number
  descripcion?: string | null
  imagen?: string | null
  tiempoComidaNombre?: string
}

export interface IImagenGeneradorService {
  generarMenuPNG(menuId: string, items: MenuItemParaImagen[]): Promise<Buffer>
}
