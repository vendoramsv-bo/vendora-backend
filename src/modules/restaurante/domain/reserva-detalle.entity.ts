export interface ReservaDetalleRaw {
  id: string
  reservaId: string
  menuItemId: string | null
  productoId: string
  productoNombre: string
  productoImagen: string | null
  cantidad: number
  precio: { toNumber(): number } | number
  subtotal: { toNumber(): number } | number
  observacion: string | null
  estadoCocina: string
  createdAt: Date
  updatedAt: Date | null
}

export class ReservaDetalleEntity {
  readonly id: string
  readonly reservaId: string
  readonly menuItemId: string | null
  readonly productoId: string
  readonly productoNombre: string
  readonly productoImagen: string | null
  readonly cantidad: number
  readonly precio: number
  readonly subtotal: number
  readonly observacion: string | null
  readonly estadoCocina: string
  readonly createdAt: Date
  readonly updatedAt: Date | null

  constructor(raw: ReservaDetalleRaw) {
    this.id = raw.id
    this.reservaId = raw.reservaId
    this.menuItemId = raw.menuItemId
    this.productoId = raw.productoId
    this.productoNombre = raw.productoNombre
    this.productoImagen = raw.productoImagen
    this.cantidad = raw.cantidad
    this.precio =
      typeof raw.precio === "object" && raw.precio !== null ? raw.precio.toNumber() : Number(raw.precio)
    this.subtotal =
      typeof raw.subtotal === "object" && raw.subtotal !== null ? raw.subtotal.toNumber() : Number(raw.subtotal)
    this.observacion = raw.observacion
    this.estadoCocina = raw.estadoCocina
    this.createdAt = raw.createdAt
    this.updatedAt = raw.updatedAt
  }

  static fromPrisma(raw: ReservaDetalleRaw): ReservaDetalleEntity {
    return new ReservaDetalleEntity(raw)
  }

  toJSON() {
    return {
      id: this.id,
      reservaId: this.reservaId,
      menuItemId: this.menuItemId,
      productoId: this.productoId,
      productoNombre: this.productoNombre,
      productoImagen: this.productoImagen,
      cantidad: this.cantidad,
      precio: this.precio,
      subtotal: this.subtotal,
      observacion: this.observacion,
      estadoCocina: this.estadoCocina,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt?.toISOString() ?? null,
    }
  }
}
