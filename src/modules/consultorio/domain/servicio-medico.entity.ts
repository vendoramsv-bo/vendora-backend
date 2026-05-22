export interface ServicioMedicoRaw {
  id: string
  consultorioId: string
  nombre: string
  especialidad: string | null
  descripcion: string | null
  duracionMin: number
  precioBase: unknown
  estado: string
  createdAt: Date
  updatedAt: Date | null
  createdById: string | null
  updatedById: string | null
}

export class ServicioMedicoEntity {
  readonly id: string
  readonly consultorioId: string
  readonly nombre: string
  readonly especialidad: string | null
  readonly descripcion: string | null
  readonly duracionMin: number
  readonly precioBase: number
  readonly estado: string
  readonly createdAt: Date
  readonly updatedAt: Date | null

  constructor(raw: ServicioMedicoRaw) {
    this.id = raw.id
    this.consultorioId = raw.consultorioId
    this.nombre = raw.nombre
    this.especialidad = raw.especialidad
    this.descripcion = raw.descripcion
    this.duracionMin = raw.duracionMin
    this.precioBase = Number(raw.precioBase)
    this.estado = raw.estado
    this.createdAt = raw.createdAt
    this.updatedAt = raw.updatedAt
  }

  static fromPrisma(raw: ServicioMedicoRaw): ServicioMedicoEntity {
    return new ServicioMedicoEntity(raw)
  }

  estaActivo(): boolean {
    return this.estado === "ACTIVO"
  }

  toJSON() {
    return {
      id: this.id,
      consultorioId: this.consultorioId,
      nombre: this.nombre,
      especialidad: this.especialidad,
      descripcion: this.descripcion,
      duracionMin: this.duracionMin,
      precioBase: this.precioBase,
      estado: this.estado,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt?.toISOString() ?? null,
    }
  }
}
