import { PuntuacionInvalida } from "./social.errors.js"

export interface TiendaValoracionRaw {
  id: string
  tiendaId: string
  userId: string
  puntuacion: number
  resena: string | null
  estado: string
  createdAt: Date
  updatedAt: Date | null
}

export class TiendaValoracionEntity {
  readonly id: string
  readonly tiendaId: string
  readonly userId: string
  readonly puntuacion: number
  readonly resena: string | null
  readonly estado: string
  readonly createdAt: Date
  readonly updatedAt: Date | null

  constructor(raw: TiendaValoracionRaw) {
    if (raw.puntuacion < 1 || raw.puntuacion > 5) throw new PuntuacionInvalida()
    this.id = raw.id
    this.tiendaId = raw.tiendaId
    this.userId = raw.userId
    this.puntuacion = raw.puntuacion
    this.resena = raw.resena
    this.estado = raw.estado
    this.createdAt = raw.createdAt
    this.updatedAt = raw.updatedAt
  }

  static fromPrisma(raw: TiendaValoracionRaw): TiendaValoracionEntity {
    return new TiendaValoracionEntity(raw)
  }
}
