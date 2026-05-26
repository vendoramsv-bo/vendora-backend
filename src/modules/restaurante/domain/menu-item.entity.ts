export interface MenuItemRaw {
  id: string
  menuId: string
  tiempoComidaId: string
  productoId: string
  nombreSnapshot: string
  descripcionSnapshot: string | null
  imagenSnapshot: string | null
  precio: { toNumber(): number } | number
  esEspecial: boolean
  destacado: boolean
  disponible: boolean
  orden: number
  notaMenu: string | null
  estado: string
  createdAt: Date
  updatedAt: Date | null
}

export class MenuItemEntity {
  readonly id: string
  readonly menuId: string
  readonly tiempoComidaId: string
  readonly productoId: string
  readonly nombreSnapshot: string
  readonly descripcionSnapshot: string | null
  readonly imagenSnapshot: string | null
  readonly precio: number
  readonly esEspecial: boolean
  readonly destacado: boolean
  readonly disponible: boolean
  readonly orden: number
  readonly notaMenu: string | null
  readonly estado: string
  readonly createdAt: Date
  readonly updatedAt: Date | null

  constructor(raw: MenuItemRaw) {
    this.id = raw.id
    this.menuId = raw.menuId
    this.tiempoComidaId = raw.tiempoComidaId
    this.productoId = raw.productoId
    this.nombreSnapshot = raw.nombreSnapshot
    this.descripcionSnapshot = raw.descripcionSnapshot
    this.imagenSnapshot = raw.imagenSnapshot
    this.precio = typeof raw.precio === "object" && raw.precio !== null ? raw.precio.toNumber() : Number(raw.precio)
    this.esEspecial = raw.esEspecial
    this.destacado = raw.destacado
    this.disponible = raw.disponible
    this.orden = raw.orden
    this.notaMenu = raw.notaMenu
    this.estado = raw.estado
    this.createdAt = raw.createdAt
    this.updatedAt = raw.updatedAt
  }

  static fromPrisma(raw: MenuItemRaw): MenuItemEntity {
    return new MenuItemEntity(raw)
  }

  estaDisponible(): boolean {
    return this.disponible && this.estado === "ACTIVO"
  }

  toJSON() {
    return {
      id: this.id,
      menuId: this.menuId,
      tiempoComidaId: this.tiempoComidaId,
      productoId: this.productoId,
      nombreSnapshot: this.nombreSnapshot,
      descripcionSnapshot: this.descripcionSnapshot,
      imagenSnapshot: this.imagenSnapshot,
      precio: this.precio,
      esEspecial: this.esEspecial,
      destacado: this.destacado,
      disponible: this.disponible,
      orden: this.orden,
      notaMenu: this.notaMenu,
      estado: this.estado,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt?.toISOString() ?? null,
    }
  }
}
