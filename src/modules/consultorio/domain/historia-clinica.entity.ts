export interface HcOdontologiaRaw {
  id: string
  historiaId: string
  odontograma: unknown
  procedimiento: string | null
  dienteNumero: string | null
  estadoDiente: string | null
}

export interface HcPediatriaRaw {
  id: string
  historiaId: string
  pesoKg: unknown
  tallaCm: unknown
  perimetroCefalico: unknown
  percentilPeso: string | null
  percentilTalla: string | null
  desarrolloPsicomotor: string | null
  observacionNutricional: string | null
}

export interface HcGeneralRaw {
  id: string
  historiaId: string
  presionArterial: string | null
  temperatura: unknown
  frecuenciaCardiaca: number | null
  frecuenciaRespiratoria: number | null
  saturacionO2: unknown
  recetaMedica: string | null
  examenesOlicitados: string | null
}

export interface HcPerinatalRaw {
  id: string
  historiaId: string
  [key: string]: unknown
}

export interface AdjuntoClinicoRaw {
  id: string
  historiaId: string
  tipo: string
  url: string
  nombreArchivo: string
  subidoEn: Date
}

export interface HistoriaClinicaRaw {
  id: string
  consultorioId: string
  pacienteId: string
  medicoId: string
  citaId: string | null
  especialidad: string
  motivoConsulta: string
  diagnostico: string | null
  tratamiento: string | null
  observaciones: string | null
  fecha: Date
  createdAt: Date
  updatedAt: Date | null
  createdById: string | null
  updatedById: string | null
  hcOdontologia?: HcOdontologiaRaw | null
  hcPediatria?: HcPediatriaRaw | null
  hcGeneral?: HcGeneralRaw | null
  hcPerinatal?: HcPerinatalRaw | null
  adjuntos?: AdjuntoClinicoRaw[]
}

export class HistoriaClinicaEntity {
  readonly id: string
  readonly consultorioId: string
  readonly pacienteId: string
  readonly medicoId: string
  readonly citaId: string | null
  readonly especialidad: string
  readonly motivoConsulta: string
  readonly diagnostico: string | null
  readonly tratamiento: string | null
  readonly observaciones: string | null
  readonly fecha: Date
  readonly createdAt: Date
  readonly updatedAt: Date | null
  readonly hcOdontologia: HcOdontologiaRaw | null
  readonly hcPediatria: HcPediatriaRaw | null
  readonly hcGeneral: HcGeneralRaw | null
  readonly hcPerinatal: HcPerinatalRaw | null
  readonly adjuntos: AdjuntoClinicoRaw[]

  constructor(raw: HistoriaClinicaRaw) {
    this.id = raw.id
    this.consultorioId = raw.consultorioId
    this.pacienteId = raw.pacienteId
    this.medicoId = raw.medicoId
    this.citaId = raw.citaId
    this.especialidad = raw.especialidad
    this.motivoConsulta = raw.motivoConsulta
    this.diagnostico = raw.diagnostico
    this.tratamiento = raw.tratamiento
    this.observaciones = raw.observaciones
    this.fecha = raw.fecha
    this.createdAt = raw.createdAt
    this.updatedAt = raw.updatedAt
    this.hcOdontologia = raw.hcOdontologia ?? null
    this.hcPediatria = raw.hcPediatria ?? null
    this.hcGeneral = raw.hcGeneral ?? null
    this.hcPerinatal = raw.hcPerinatal ?? null
    this.adjuntos = raw.adjuntos ?? []
  }

  static fromPrisma(raw: HistoriaClinicaRaw): HistoriaClinicaEntity {
    return new HistoriaClinicaEntity(raw)
  }

  toJSON() {
    return {
      id: this.id,
      consultorioId: this.consultorioId,
      pacienteId: this.pacienteId,
      medicoId: this.medicoId,
      citaId: this.citaId,
      especialidad: this.especialidad,
      motivoConsulta: this.motivoConsulta,
      diagnostico: this.diagnostico,
      tratamiento: this.tratamiento,
      observaciones: this.observaciones,
      fecha: this.fecha.toISOString(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt?.toISOString() ?? null,
      hcOdontologia: this.hcOdontologia,
      hcPediatria: this.hcPediatria,
      hcGeneral: this.hcGeneral,
      hcPerinatal: this.hcPerinatal,
      adjuntos: this.adjuntos,
    }
  }
}
