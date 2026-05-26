import { TransicionMenuInvalida } from "./restaurante.errors.js"

const TRANSICIONES_VALIDAS: Record<string, string[]> = {
  BORRADOR: ["APROBADO", "CANCELADO"],
  APROBADO: ["PUBLICADO", "BORRADOR", "CANCELADO"],
  PUBLICADO: ["ARCHIVADO"],
  ARCHIVADO: [],
  CANCELADO: [],
}

const ESTADOS_EDITABLES = ["BORRADOR", "APROBADO"]

export interface MenuRaw {
  id: string
  restauranteId: string
  nombre: string
  tipo: string
  fechaInicio: Date
  fechaFin: Date
  descripcion: string | null
  imagenPortada: string | null
  tema: string | null
  creadoPorId: string | null
  estado: string
  fechaPublicacion: Date | null
  fechaPublicacionRRSS: Date | null
  createdAt: Date
  updatedAt: Date | null
  createdById: string | null
  updatedById: string | null
}

export class MenuEntity {
  readonly id: string
  readonly restauranteId: string
  readonly nombre: string
  readonly tipo: string
  readonly fechaInicio: Date
  readonly fechaFin: Date
  readonly descripcion: string | null
  readonly imagenPortada: string | null
  readonly tema: string | null
  readonly creadoPorId: string | null
  readonly estado: string
  readonly fechaPublicacion: Date | null
  readonly fechaPublicacionRRSS: Date | null
  readonly createdAt: Date
  readonly updatedAt: Date | null
  readonly createdById: string | null
  readonly updatedById: string | null

  constructor(raw: MenuRaw) {
    this.id = raw.id
    this.restauranteId = raw.restauranteId
    this.nombre = raw.nombre
    this.tipo = raw.tipo
    this.fechaInicio = raw.fechaInicio
    this.fechaFin = raw.fechaFin
    this.descripcion = raw.descripcion
    this.imagenPortada = raw.imagenPortada
    this.tema = raw.tema
    this.creadoPorId = raw.creadoPorId
    this.estado = raw.estado
    this.fechaPublicacion = raw.fechaPublicacion
    this.fechaPublicacionRRSS = raw.fechaPublicacionRRSS
    this.createdAt = raw.createdAt
    this.updatedAt = raw.updatedAt
    this.createdById = raw.createdById
    this.updatedById = raw.updatedById
  }

  static fromPrisma(raw: MenuRaw): MenuEntity {
    return new MenuEntity(raw)
  }

  puedeTransicionarA(nuevoEstado: string): boolean {
    return (TRANSICIONES_VALIDAS[this.estado] ?? []).includes(nuevoEstado)
  }

  validarTransicion(nuevoEstado: string): void {
    if (!this.puedeTransicionarA(nuevoEstado)) {
      throw new TransicionMenuInvalida(this.estado, nuevoEstado)
    }
  }

  esEditable(): boolean {
    return ESTADOS_EDITABLES.includes(this.estado)
  }

  esPublico(): boolean {
    return this.estado === "PUBLICADO"
  }

  toJSON() {
    return {
      id: this.id,
      restauranteId: this.restauranteId,
      nombre: this.nombre,
      tipo: this.tipo,
      fechaInicio: this.fechaInicio.toISOString(),
      fechaFin: this.fechaFin.toISOString(),
      descripcion: this.descripcion,
      imagenPortada: this.imagenPortada,
      tema: this.tema,
      creadoPorId: this.creadoPorId,
      estado: this.estado,
      fechaPublicacion: this.fechaPublicacion?.toISOString() ?? null,
      fechaPublicacionRRSS: this.fechaPublicacionRRSS?.toISOString() ?? null,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt?.toISOString() ?? null,
    }
  }
}
