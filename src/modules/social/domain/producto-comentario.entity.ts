import { NoAutorizado } from "./social.errors.js"

export interface ProductoComentarioRaw {
  id: string
  productoId: string
  tenantId: string
  userId: string
  contenido: string
  editado: boolean
  estado: string
  padreId: string | null
  createdAt: Date
  updatedAt: Date | null
}

const ROLES_MODERADORES = ["PROPIETARIO", "owner", "ADMIN", "ENCARGADO"]

export class ProductoComentarioEntity {
  readonly id: string
  readonly productoId: string
  readonly tenantId: string
  readonly userId: string
  readonly contenido: string
  readonly editado: boolean
  readonly estado: string
  readonly padreId: string | null
  readonly createdAt: Date
  readonly updatedAt: Date | null

  constructor(raw: ProductoComentarioRaw) {
    this.id = raw.id
    this.productoId = raw.productoId
    this.tenantId = raw.tenantId
    this.userId = raw.userId
    this.contenido = raw.contenido
    this.editado = raw.editado
    this.estado = raw.estado
    this.padreId = raw.padreId
    this.createdAt = raw.createdAt
    this.updatedAt = raw.updatedAt
  }

  static fromPrisma(raw: ProductoComentarioRaw): ProductoComentarioEntity {
    return new ProductoComentarioEntity(raw)
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
