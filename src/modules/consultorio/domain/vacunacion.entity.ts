export interface VacunacionRaw {
  id: string
  pacienteId: string
  vacuna: string
  dosis: string | null
  fechaAplicacion: Date
  proximaDosis: Date | null
  medicoId: string | null
  lote: string | null
  createdAt: Date
}

export class VacunacionEntity {
  readonly id: string
  readonly pacienteId: string
  readonly vacuna: string
  readonly dosis: string | null
  readonly fechaAplicacion: Date
  readonly proximaDosis: Date | null
  readonly medicoId: string | null
  readonly lote: string | null
  readonly createdAt: Date

  constructor(raw: VacunacionRaw) {
    this.id = raw.id
    this.pacienteId = raw.pacienteId
    this.vacuna = raw.vacuna
    this.dosis = raw.dosis
    this.fechaAplicacion = raw.fechaAplicacion
    this.proximaDosis = raw.proximaDosis
    this.medicoId = raw.medicoId
    this.lote = raw.lote
    this.createdAt = raw.createdAt
  }

  static crear(data: Omit<VacunacionRaw, "id" | "createdAt"> & { id: string; createdAt: Date }): VacunacionEntity {
    return new VacunacionEntity(data)
  }

  static fromPrisma(raw: VacunacionRaw): VacunacionEntity {
    return new VacunacionEntity(raw)
  }

  toJSON() {
    return {
      id: this.id,
      pacienteId: this.pacienteId,
      vacuna: this.vacuna,
      dosis: this.dosis,
      fechaAplicacion: this.fechaAplicacion.toISOString(),
      proximaDosis: this.proximaDosis?.toISOString() ?? null,
      medicoId: this.medicoId,
      lote: this.lote,
      createdAt: this.createdAt.toISOString(),
    }
  }
}
