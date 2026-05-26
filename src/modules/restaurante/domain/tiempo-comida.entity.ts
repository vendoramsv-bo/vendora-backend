export interface TiempoComidaRaw {
  id: string
  restauranteId: string
  nombre: string
  horaInicio: string
  horaFin: string
  orden: number
  icono: string | null
  estado: string
  createdAt: Date
  updatedAt: Date | null
  createdById: string | null
  updatedById: string | null
}

export class TiempoComidaEntity {
  readonly id: string
  readonly restauranteId: string
  readonly nombre: string
  readonly horaInicio: string
  readonly horaFin: string
  readonly orden: number
  readonly icono: string | null
  readonly estado: string
  readonly createdAt: Date
  readonly updatedAt: Date | null

  constructor(raw: TiempoComidaRaw) {
    if (!TiempoComidaEntity.horaValida(raw.horaInicio)) {
      throw new Error(`horaInicio inválida: ${raw.horaInicio}`)
    }
    if (!TiempoComidaEntity.horaValida(raw.horaFin)) {
      throw new Error(`horaFin inválida: ${raw.horaFin}`)
    }
    if (raw.horaFin <= raw.horaInicio) {
      throw new Error("horaFin debe ser posterior a horaInicio")
    }
    this.id = raw.id
    this.restauranteId = raw.restauranteId
    this.nombre = raw.nombre
    this.horaInicio = raw.horaInicio
    this.horaFin = raw.horaFin
    this.orden = raw.orden
    this.icono = raw.icono
    this.estado = raw.estado
    this.createdAt = raw.createdAt
    this.updatedAt = raw.updatedAt
  }

  static horaValida(h: string): boolean {
    return /^\d{2}:\d{2}$/.test(h)
  }

  static fromPrisma(raw: TiempoComidaRaw): TiempoComidaEntity {
    return new TiempoComidaEntity(raw)
  }

  estaActivo(): boolean {
    return this.estado === "ACTIVO"
  }

  incluyeHora(hora: string): boolean {
    return hora >= this.horaInicio && hora < this.horaFin
  }

  toJSON() {
    return {
      id: this.id,
      restauranteId: this.restauranteId,
      nombre: this.nombre,
      horaInicio: this.horaInicio,
      horaFin: this.horaFin,
      orden: this.orden,
      icono: this.icono,
      estado: this.estado,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt?.toISOString() ?? null,
    }
  }
}
