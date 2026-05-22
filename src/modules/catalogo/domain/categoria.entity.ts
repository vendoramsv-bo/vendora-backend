export interface CategoriaRaw {
  id: string
  tenantId: string
  actividadId: string
  nombre: string
  descripcion?: string | null
  imagenUrl?: string | null
  padreId?: string | null
  nivel: number
  estado: string
  createdAt: Date
  updatedAt?: Date | null
  createdById?: string | null
  updatedById?: string | null
}

export class CategoriaEntity {
  readonly id: string
  readonly tenantId: string
  readonly actividadId: string
  readonly nombre: string
  readonly descripcion?: string | null
  readonly imagenUrl?: string | null
  readonly padreId?: string | null
  readonly nivel: number
  readonly estado: string
  readonly createdAt: Date
  readonly updatedAt?: Date | null
  readonly createdById?: string | null
  readonly updatedById?: string | null

  constructor(raw: CategoriaRaw) {
    this.id = raw.id
    this.tenantId = raw.tenantId
    this.actividadId = raw.actividadId
    this.nombre = raw.nombre
    this.descripcion = raw.descripcion
    this.imagenUrl = raw.imagenUrl
    this.padreId = raw.padreId
    this.nivel = raw.nivel
    this.estado = raw.estado
    this.createdAt = raw.createdAt
    this.updatedAt = raw.updatedAt
    this.createdById = raw.createdById
    this.updatedById = raw.updatedById
  }

  static fromPrisma(raw: CategoriaRaw): CategoriaEntity {
    return new CategoriaEntity(raw)
  }

  estaActiva(): boolean {
    return this.estado === "ACTIVO"
  }

  toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      actividadId: this.actividadId,
      nombre: this.nombre,
      descripcion: this.descripcion,
      imagenUrl: this.imagenUrl,
      padreId: this.padreId,
      nivel: this.nivel,
      estado: this.estado,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdById: this.createdById,
      updatedById: this.updatedById,
    }
  }
}
