import { NoAutorizado } from "./social.errors.js"

export interface TiendaComentarioRaw {
  id: string
  tiendaId: string
  userId: string
  contenido: string
  editado: boolean
  estado: string
  padreId: string | null
  createdAt: Date
  updatedAt: Date | null
}

const ROLES_MODERADORES = ["PROPIETARIO", "owner", "ADMIN", "ENCARGADO"]

export class TiendaComentarioEntity {
  readonly id: string
  readonly tiendaId: string
  readonly userId: string
  readonly contenido: string
  readonly editado: boolean
  readonly estado: string
  readonly padreId: string | null
  readonly createdAt: Date
  readonly updatedAt: Date | null

  constructor(raw: TiendaComentarioRaw) {
    this.id = raw.id
    this.tiendaId = raw.tiendaId
    this.userId = raw.userId
    this.contenido = raw.contenido
    this.editado = raw.editado
    this.estado = raw.estado
    this.padreId = raw.padreId
    this.createdAt = raw.createdAt
    this.updatedAt = raw.updatedAt
  }

  static fromPrisma(raw: TiendaComentarioRaw): TiendaComentarioEntity {
    return new TiendaComentarioEntity(raw)
  }

  esRespuesta(): boolean {
    return this.padreId !== null
  }

  puedeEditarOEliminar(userId: string, rol?: string): void {
    const esAutor = this.userId === userId
    const esModerador = rol !== undefined && ROLES_MODERADORES.includes(rol)
    if (!esAutor && !esModerador) throw new NoAutorizado()
  }
}
