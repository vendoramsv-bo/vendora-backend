import { TransicionMenuInvalida } from "./restaurante.errors.js"

const TRANSICIONES_VALIDAS: Record<string, string[]> = {
  BORRADOR: ["PROGRAMADA", "CANCELADA"],
  PROGRAMADA: ["PUBLICANDO", "CANCELADA"],
  PUBLICANDO: ["PUBLICADA", "FALLIDA"],
  PUBLICADA: [],
  FALLIDA: [],
  CANCELADA: [],
}

export interface PublicacionRRSSRaw {
  id: string
  restauranteId: string
  menuId: string
  publicacionId: string | null
  redSocial: string
  urlPublicacion: string | null
  urlImagenGenerada: string | null
  fechaProgramada: Date | null
  fechaPublicada: Date | null
  alcance: number | null
  reacciones: number | null
  comentarios: number | null
  estado: string
  errorMensaje: string | null
  creadoPorId: string | null
  createdAt: Date
  updatedAt: Date | null
  createdById: string | null
  updatedById: string | null
}

export class PublicacionRRSSEntity {
  readonly id: string
  readonly restauranteId: string
  readonly menuId: string
  readonly publicacionId: string | null
  readonly redSocial: string
  readonly urlPublicacion: string | null
  readonly urlImagenGenerada: string | null
  readonly fechaProgramada: Date | null
  readonly fechaPublicada: Date | null
  readonly alcance: number | null
  readonly reacciones: number | null
  readonly comentarios: number | null
  readonly estado: string
  readonly errorMensaje: string | null
  readonly creadoPorId: string | null
  readonly createdAt: Date
  readonly updatedAt: Date | null
  readonly createdById: string | null
  readonly updatedById: string | null

  constructor(raw: PublicacionRRSSRaw) {
    this.id = raw.id
    this.restauranteId = raw.restauranteId
    this.menuId = raw.menuId
    this.publicacionId = raw.publicacionId
    this.redSocial = raw.redSocial
    this.urlPublicacion = raw.urlPublicacion
    this.urlImagenGenerada = raw.urlImagenGenerada
    this.fechaProgramada = raw.fechaProgramada
    this.fechaPublicada = raw.fechaPublicada
    this.alcance = raw.alcance
    this.reacciones = raw.reacciones
    this.comentarios = raw.comentarios
    this.estado = raw.estado
    this.errorMensaje = raw.errorMensaje
    this.creadoPorId = raw.creadoPorId
    this.createdAt = raw.createdAt
    this.updatedAt = raw.updatedAt
    this.createdById = raw.createdById
    this.updatedById = raw.updatedById
  }

  static fromPrisma(raw: PublicacionRRSSRaw): PublicacionRRSSEntity {
    return new PublicacionRRSSEntity(raw)
  }

  puedeTransicionarA(nuevoEstado: string): boolean {
    return (TRANSICIONES_VALIDAS[this.estado] ?? []).includes(nuevoEstado)
  }

  validarTransicion(nuevoEstado: string): void {
    if (!this.puedeTransicionarA(nuevoEstado)) {
      throw new TransicionMenuInvalida(this.estado, nuevoEstado)
    }
  }

  esProgramada(): boolean {
    return this.estado === "PROGRAMADA"
  }

  toJSON() {
    return {
      id: this.id,
      restauranteId: this.restauranteId,
      menuId: this.menuId,
      redSocial: this.redSocial,
      urlPublicacion: this.urlPublicacion,
      urlImagenGenerada: this.urlImagenGenerada,
      fechaProgramada: this.fechaProgramada?.toISOString() ?? null,
      fechaPublicada: this.fechaPublicada?.toISOString() ?? null,
      alcance: this.alcance,
      reacciones: this.reacciones,
      comentarios: this.comentarios,
      estado: this.estado,
      errorMensaje: this.errorMensaje,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt?.toISOString() ?? null,
    }
  }
}
