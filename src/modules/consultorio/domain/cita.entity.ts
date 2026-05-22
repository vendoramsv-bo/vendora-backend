export interface CitaRaw {
  id: string
  consultorioId: string
  pacienteId: string
  medicoId: string
  servicioId: string | null
  fechaHora: Date
  duracionMin: number
  estado: string
  motivo: string | null
  canalOrigen: string | null
  notas: string | null
  createdAt: Date
  updatedAt: Date | null
  createdById: string | null
  updatedById: string | null
}

// Estado mapping (Estado enum ↔ domain states):
// PENDIENTE   → PENDIENTE
// ACEPTADO    → CONFIRMADA
// FINALIZADO  → ATENDIDA
// ELIMINADO   → CANCELADA
// RECHAZADO   → NO_ASISTIO

const ESTADOS_ACTIVOS = ["PENDIENTE", "ACEPTADO"]
const ESTADOS_TERMINALES = ["FINALIZADO", "ELIMINADO", "RECHAZADO"]

export class CitaEntity {
  readonly id: string
  readonly consultorioId: string
  readonly pacienteId: string
  readonly medicoId: string
  readonly servicioId: string | null
  readonly fechaHora: Date
  readonly duracionMin: number
  readonly estado: string
  readonly motivo: string | null
  readonly canalOrigen: string | null
  readonly notas: string | null
  readonly createdAt: Date
  readonly updatedAt: Date | null

  constructor(raw: CitaRaw) {
    this.id = raw.id
    this.consultorioId = raw.consultorioId
    this.pacienteId = raw.pacienteId
    this.medicoId = raw.medicoId
    this.servicioId = raw.servicioId
    this.fechaHora = raw.fechaHora
    this.duracionMin = raw.duracionMin
    this.estado = raw.estado
    this.motivo = raw.motivo
    this.canalOrigen = raw.canalOrigen
    this.notas = raw.notas
    this.createdAt = raw.createdAt
    this.updatedAt = raw.updatedAt
  }

  static fromPrisma(raw: CitaRaw): CitaEntity {
    return new CitaEntity(raw)
  }

  estaActiva(): boolean {
    return ESTADOS_ACTIVOS.includes(this.estado)
  }

  estaTerminada(): boolean {
    return ESTADOS_TERMINALES.includes(this.estado)
  }

  puedeConfirmarse(): boolean {
    return this.estado === "PENDIENTE"
  }

  puedeAtenderse(): boolean {
    return this.estado === "ACEPTADO"
  }

  get finHora(): Date {
    return new Date(this.fechaHora.getTime() + this.duracionMin * 60_000)
  }

  toJSON() {
    return {
      id: this.id,
      consultorioId: this.consultorioId,
      pacienteId: this.pacienteId,
      medicoId: this.medicoId,
      servicioId: this.servicioId,
      fechaHora: this.fechaHora.toISOString(),
      duracionMin: this.duracionMin,
      estado: this.estado,
      motivo: this.motivo,
      canalOrigen: this.canalOrigen,
      notas: this.notas,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt?.toISOString() ?? null,
    }
  }
}
