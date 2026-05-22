export interface RecetaMedicaDetalleRaw {
  id: string
  recetaId: string
  productoId: string | null
  medicamento: string
  principioActivo: string | null
  concentracion: string | null
  presentacion: string | null
  dosis: string
  frecuencia: string
  duracion: string
  via: string
  cantidadPrescrita: number
  indicaciones: string | null
  permiteSustitucion: boolean
  estado: string
}

export interface RecetaMedicaRaw {
  id: string
  consultorioId: string
  atencionId: string
  pacienteId: string
  medicoId: string
  pacienteNombre: string
  pacienteApellido: string
  medicoNombre: string
  medicoEspecialidad: string
  medicoRegistro: string | null
  numeroReceta: string
  indicacionesGenerales: string | null
  diagnosticoCie10: string | null
  fechaEmision: Date
  fechaVencimiento: Date | null
  estado: string
  observaciones: string | null
  createdAt: Date
  updatedAt: Date | null
  createdById: string | null
  updatedById: string | null
  detalle?: RecetaMedicaDetalleRaw[]
}

export class RecetaMedicaEntity {
  readonly id: string
  readonly consultorioId: string
  readonly atencionId: string
  readonly pacienteId: string
  readonly medicoId: string
  readonly pacienteNombre: string
  readonly pacienteApellido: string
  readonly medicoNombre: string
  readonly medicoEspecialidad: string
  readonly medicoRegistro: string | null
  readonly numeroReceta: string
  readonly indicacionesGenerales: string | null
  readonly diagnosticoCie10: string | null
  readonly fechaEmision: Date
  readonly fechaVencimiento: Date | null
  readonly estado: string
  readonly observaciones: string | null
  readonly createdAt: Date
  readonly updatedAt: Date | null
  readonly detalle: RecetaMedicaDetalleRaw[]

  constructor(raw: RecetaMedicaRaw) {
    this.id = raw.id
    this.consultorioId = raw.consultorioId
    this.atencionId = raw.atencionId
    this.pacienteId = raw.pacienteId
    this.medicoId = raw.medicoId
    this.pacienteNombre = raw.pacienteNombre
    this.pacienteApellido = raw.pacienteApellido
    this.medicoNombre = raw.medicoNombre
    this.medicoEspecialidad = raw.medicoEspecialidad
    this.medicoRegistro = raw.medicoRegistro
    this.numeroReceta = raw.numeroReceta
    this.indicacionesGenerales = raw.indicacionesGenerales
    this.diagnosticoCie10 = raw.diagnosticoCie10
    this.fechaEmision = raw.fechaEmision
    this.fechaVencimiento = raw.fechaVencimiento
    this.estado = raw.estado
    this.observaciones = raw.observaciones
    this.createdAt = raw.createdAt
    this.updatedAt = raw.updatedAt
    this.detalle = raw.detalle ?? []
  }

  static fromPrisma(raw: RecetaMedicaRaw): RecetaMedicaEntity {
    return new RecetaMedicaEntity(raw)
  }

  puedeAnularse(): boolean {
    return this.estado !== "DESPACHADA"
  }

  toJSON() {
    return {
      id: this.id,
      consultorioId: this.consultorioId,
      atencionId: this.atencionId,
      pacienteId: this.pacienteId,
      medicoId: this.medicoId,
      pacienteNombre: this.pacienteNombre,
      pacienteApellido: this.pacienteApellido,
      medicoNombre: this.medicoNombre,
      medicoEspecialidad: this.medicoEspecialidad,
      medicoRegistro: this.medicoRegistro,
      numeroReceta: this.numeroReceta,
      indicacionesGenerales: this.indicacionesGenerales,
      diagnosticoCie10: this.diagnosticoCie10,
      fechaEmision: this.fechaEmision.toISOString(),
      fechaVencimiento: this.fechaVencimiento?.toISOString() ?? null,
      estado: this.estado,
      observaciones: this.observaciones,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt?.toISOString() ?? null,
      detalle: this.detalle,
    }
  }
}
