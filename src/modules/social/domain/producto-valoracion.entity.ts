import { PuntuacionInvalida } from "./social.errors.js"

export interface ProductoValoracionRaw {
  id: string
  productoId: string
  tenantId: string
  userId: string
  puntuacion: number
  resena: string | null
  estado: string
  createdAt: Date
  updatedAt: Date | null
}

export class ProductoValoracionEntity {
  readonly id: string
  readonly productoId: string
  readonly tenantId: string
  readonly userId: string
  readonly puntuacion: number
  readonly resena: string | null
  readonly estado: string
  readonly createdAt: Date
  readonly updatedAt: Date | null

  constructor(raw: ProductoValoracionRaw) {
    if (raw.puntuacion < 1 || raw.puntuacion > 5) throw new PuntuacionInvalida()
    this.id = raw.id
    this.productoId = raw.productoId
    this.tenantId = raw.tenantId
    this.userId = raw.userId
    this.puntuacion = raw.puntuacion
    this.resena = raw.resena
    this.estado = raw.estado
    this.createdAt = raw.createdAt
    this.updatedAt = raw.updatedAt
  }

  static fromPrisma(raw: ProductoValoracionRaw): ProductoValoracionEntity {
    return new ProductoValoracionEntity(raw)
  }
}
