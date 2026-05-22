export interface ConsultorioRaw {
  id: string
  tenantId: string
  especialidades: string[]
  nroRegistro: string | null
  estado: string
  createdAt: Date
  updatedAt: Date | null
  createdById: string | null
  updatedById: string | null
}

export class ConsultorioEntity {
  readonly id: string
  readonly tenantId: string
  readonly especialidades: string[]
  readonly nroRegistro: string | null
  readonly estado: string
  readonly createdAt: Date
  readonly updatedAt: Date | null
  readonly createdById: string | null
  readonly updatedById: string | null

  constructor(raw: ConsultorioRaw) {
    this.id = raw.id
    this.tenantId = raw.tenantId
    this.especialidades = raw.especialidades
    this.nroRegistro = raw.nroRegistro
    this.estado = raw.estado
    this.createdAt = raw.createdAt
    this.updatedAt = raw.updatedAt
    this.createdById = raw.createdById
    this.updatedById = raw.updatedById
  }

  static fromPrisma(raw: ConsultorioRaw): ConsultorioEntity {
    return new ConsultorioEntity(raw)
  }

  toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      especialidades: this.especialidades,
      nroRegistro: this.nroRegistro,
      estado: this.estado,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt?.toISOString() ?? null,
    }
  }
}
