export interface UnidadMedidaRaw {
  id: string
  tenantId: string
  unidad: string
  sigla: string
  descripcion: string
  claUnidadId?: string | null
  estado: string
  createdAt: Date
  updatedAt?: Date | null
  createdById?: string | null
  updatedById?: string | null
}

export class UnidadMedidaEntity {
  readonly id: string
  readonly tenantId: string
  readonly unidad: string
  readonly sigla: string
  readonly descripcion: string
  readonly claUnidadId?: string | null
  readonly estado: string
  readonly createdAt: Date
  readonly updatedAt?: Date | null
  readonly createdById?: string | null
  readonly updatedById?: string | null

  constructor(raw: UnidadMedidaRaw) {
    this.id = raw.id
    this.tenantId = raw.tenantId
    this.unidad = raw.unidad
    this.sigla = raw.sigla
    this.descripcion = raw.descripcion
    this.claUnidadId = raw.claUnidadId
    this.estado = raw.estado
    this.createdAt = raw.createdAt
    this.updatedAt = raw.updatedAt
    this.createdById = raw.createdById
    this.updatedById = raw.updatedById
  }

  static fromPrisma(raw: UnidadMedidaRaw): UnidadMedidaEntity {
    return new UnidadMedidaEntity(raw)
  }

  estaActiva(): boolean {
    return this.estado === "ACTIVO"
  }

  toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      unidad: this.unidad,
      sigla: this.sigla,
      descripcion: this.descripcion,
      claUnidadId: this.claUnidadId,
      estado: this.estado,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdById: this.createdById,
      updatedById: this.updatedById,
    }
  }
}
