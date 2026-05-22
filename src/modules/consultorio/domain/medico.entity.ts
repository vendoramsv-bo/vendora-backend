export interface HorarioAtencionRaw {
  id: string
  medicoId: string
  diaSemana: number
  horaInicio: string
  horaFin: string
  activo: boolean
  createdAt: Date
}

export interface MedicoRaw {
  id: string
  consultorioId: string
  memberId: string
  especialidad: string
  nroRegistro: string | null
  bio: string | null
  fotoUrl: string | null
  estado: string
  createdAt: Date
  updatedAt: Date | null
  createdById: string | null
  updatedById: string | null
  horariosAtencion?: HorarioAtencionRaw[]
}

export class MedicoEntity {
  readonly id: string
  readonly consultorioId: string
  readonly memberId: string
  readonly especialidad: string
  readonly nroRegistro: string | null
  readonly bio: string | null
  readonly fotoUrl: string | null
  readonly estado: string
  readonly createdAt: Date
  readonly updatedAt: Date | null
  readonly horariosAtencion: HorarioAtencionRaw[]

  constructor(raw: MedicoRaw) {
    this.id = raw.id
    this.consultorioId = raw.consultorioId
    this.memberId = raw.memberId
    this.especialidad = raw.especialidad
    this.nroRegistro = raw.nroRegistro
    this.bio = raw.bio
    this.fotoUrl = raw.fotoUrl
    this.estado = raw.estado
    this.createdAt = raw.createdAt
    this.updatedAt = raw.updatedAt
    this.horariosAtencion = raw.horariosAtencion ?? []
  }

  static fromPrisma(raw: MedicoRaw): MedicoEntity {
    return new MedicoEntity(raw)
  }

  estaActivo(): boolean {
    return this.estado === "ACTIVO"
  }

  toJSON() {
    return {
      id: this.id,
      consultorioId: this.consultorioId,
      memberId: this.memberId,
      especialidad: this.especialidad,
      nroRegistro: this.nroRegistro,
      bio: this.bio,
      fotoUrl: this.fotoUrl,
      estado: this.estado,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt?.toISOString() ?? null,
      horariosAtencion: this.horariosAtencion.map((h) => ({
        id: h.id,
        diaSemana: h.diaSemana,
        horaInicio: h.horaInicio,
        horaFin: h.horaFin,
        activo: h.activo,
      })),
    }
  }
}
