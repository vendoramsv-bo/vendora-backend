export interface ActividadEconomicaRaw {
  id: string
  tenantId: string
  claActividadId: string
  estado: string
  createdAt: Date
  updatedAt?: Date | null
  createdById?: string | null
  updatedById?: string | null
  claActividadEconomica?: { nombre: string; descripcion?: string | null } | null
}

export class ActividadEconomicaEntity {
  readonly id: string
  readonly tenantId: string
  readonly claActividadId: string
  readonly nombre: string
  readonly estado: string
  readonly createdAt: Date
  readonly updatedAt?: Date | null
  readonly createdById?: string | null
  readonly updatedById?: string | null

  constructor(raw: ActividadEconomicaRaw) {
    this.id = raw.id
    this.tenantId = raw.tenantId
    this.claActividadId = raw.claActividadId
    this.nombre = raw.claActividadEconomica?.nombre ?? ""
    this.estado = raw.estado
    this.createdAt = raw.createdAt
    this.updatedAt = raw.updatedAt
    this.createdById = raw.createdById
    this.updatedById = raw.updatedById
  }

  static fromPrisma(raw: ActividadEconomicaRaw): ActividadEconomicaEntity {
    return new ActividadEconomicaEntity(raw)
  }

  estaActiva(): boolean {
    return this.estado === "ACTIVO"
  }

  toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      claActividadId: this.claActividadId,
      nombre: this.nombre,
      estado: this.estado,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdById: this.createdById,
      updatedById: this.updatedById,
    }
  }
}
