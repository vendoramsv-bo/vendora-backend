import { EstadoPublicacionInvalido } from "./social.errors.js"

const TRANSICIONES_VALIDAS: Record<string, string[]> = {
  BORRADOR: ["PUBLICADO"],
  PUBLICADO: ["ARCHIVADO"],
  ARCHIVADO: [],
}

export interface PublicacionMediaRaw {
  id: string
  publicacionId: string
  tipo: string
  url: string | null
  embedUrl: string | null
  thumbnailUrl: string | null
  plataforma: string | null
  titulo: string | null
  orden: number
  createdAt: Date
  updatedAt: Date | null
}

export interface PublicacionRaw {
  id: string
  tenantId: string
  autorId: string
  titulo: string | null
  contenido: string | null
  tipo: string
  estado: string
  etiquetas: string[]
  publicadoEn: Date | null
  createdAt: Date
  updatedAt: Date | null
  medios?: PublicacionMediaRaw[]
}

export class PublicacionEntity {
  readonly id: string
  readonly tenantId: string
  readonly autorId: string
  readonly titulo: string | null
  readonly contenido: string | null
  readonly tipo: string
  readonly estado: string
  readonly etiquetas: string[]
  readonly publicadoEn: Date | null
  readonly createdAt: Date
  readonly updatedAt: Date | null
  readonly medios: PublicacionMediaRaw[]

  constructor(raw: PublicacionRaw) {
    this.id = raw.id
    this.tenantId = raw.tenantId
    this.autorId = raw.autorId
    this.titulo = raw.titulo
    this.contenido = raw.contenido
    this.tipo = raw.tipo
    this.estado = raw.estado
    this.etiquetas = raw.etiquetas
    this.publicadoEn = raw.publicadoEn
    this.createdAt = raw.createdAt
    this.updatedAt = raw.updatedAt
    this.medios = raw.medios ?? []
  }

  static fromPrisma(raw: PublicacionRaw): PublicacionEntity {
    return new PublicacionEntity(raw)
  }

  validarTransicion(nuevoEstado: string): void {
    const validas = TRANSICIONES_VALIDAS[this.estado] ?? []
    if (!validas.includes(nuevoEstado)) {
      throw new EstadoPublicacionInvalido(this.estado, nuevoEstado)
    }
  }

  estaPublicada(): boolean {
    return this.estado === "PUBLICADO"
  }

  esBorrador(): boolean {
    return this.estado === "BORRADOR"
  }
}
