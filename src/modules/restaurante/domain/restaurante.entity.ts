export interface RestauranteRaw {
  id: string
  tenantId: string
  capacidadMesas: number | null
  capacidadComensales: number | null
  tipoServicio: string | null
  duracionPromedioMin: number
  plantillaRRSS: unknown
  publicacionAutomatica: boolean
  horaPublicacionMenu: string | null
  estado: string
  createdAt: Date
  updatedAt: Date | null
  createdById: string | null
  updatedById: string | null
}

export class RestauranteEntity {
  readonly id: string
  readonly tenantId: string
  readonly capacidadMesas: number | null
  readonly capacidadComensales: number | null
  readonly tipoServicio: string | null
  readonly duracionPromedioMin: number
  readonly plantillaRRSS: unknown
  readonly publicacionAutomatica: boolean
  readonly horaPublicacionMenu: string | null
  readonly estado: string
  readonly createdAt: Date
  readonly updatedAt: Date | null
  readonly createdById: string | null
  readonly updatedById: string | null

  constructor(raw: RestauranteRaw) {
    this.id = raw.id
    this.tenantId = raw.tenantId
    this.capacidadMesas = raw.capacidadMesas
    this.capacidadComensales = raw.capacidadComensales
    this.tipoServicio = raw.tipoServicio
    this.duracionPromedioMin = raw.duracionPromedioMin
    this.plantillaRRSS = raw.plantillaRRSS
    this.publicacionAutomatica = raw.publicacionAutomatica
    this.horaPublicacionMenu = raw.horaPublicacionMenu
    this.estado = raw.estado
    this.createdAt = raw.createdAt
    this.updatedAt = raw.updatedAt
    this.createdById = raw.createdById
    this.updatedById = raw.updatedById
  }

  static fromPrisma(raw: RestauranteRaw): RestauranteEntity {
    return new RestauranteEntity(raw)
  }

  toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      capacidadMesas: this.capacidadMesas,
      capacidadComensales: this.capacidadComensales,
      tipoServicio: this.tipoServicio,
      duracionPromedioMin: this.duracionPromedioMin,
      plantillaRRSS: this.plantillaRRSS,
      publicacionAutomatica: this.publicacionAutomatica,
      horaPublicacionMenu: this.horaPublicacionMenu,
      estado: this.estado,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt?.toISOString() ?? null,
    }
  }
}
