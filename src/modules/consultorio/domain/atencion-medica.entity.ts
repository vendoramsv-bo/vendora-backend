export interface AtencionDetalleRaw {
  id: string
  atencionId: string
  servicioId: string
  servicioNombre: string
  especialidad: string
  tipoTratamiento: string
  descripcionTratamiento: string | null
  referenciaClin: string | null
  cantidad: number
  precioUnitario: unknown
  descuento: unknown
  subtotal: unknown
  nota: string | null
}

export interface AtencionPagoRaw {
  id: string
  atencionId: string
  monto: unknown
  metodo: string
  referencia: string | null
  nota: string | null
  pagadoEn: Date
  registradoPor: string | null
}

export interface AtencionMedicaRaw {
  id: string
  consultorioId: string
  pacienteId: string
  pacienteNombre: string
  pacienteApellido: string
  pacienteTelefono: string | null
  medicoId: string
  medicoNombre: string
  medicoEspecialidad: string
  citaId: string | null
  fechaAtencion: Date
  totalServicios: number
  totalCantidad: number
  subtotal: unknown
  descuento: unknown
  total: unknown
  tipoPago: string
  estadoPago: string
  observaciones: string | null
  estado: string
  createdAt: Date
  updatedAt: Date | null
  createdById: string | null
  updatedById: string | null
  detalle?: AtencionDetalleRaw[]
  pagos?: AtencionPagoRaw[]
}

export class AtencionMedicaEntity {
  readonly id: string
  readonly consultorioId: string
  readonly pacienteId: string
  readonly pacienteNombre: string
  readonly pacienteApellido: string
  readonly pacienteTelefono: string | null
  readonly medicoId: string
  readonly medicoNombre: string
  readonly medicoEspecialidad: string
  readonly citaId: string | null
  readonly fechaAtencion: Date
  readonly totalServicios: number
  readonly totalCantidad: number
  readonly subtotal: number
  readonly descuento: number
  readonly total: number
  readonly tipoPago: string
  readonly estadoPago: string
  readonly observaciones: string | null
  readonly estado: string
  readonly createdAt: Date
  readonly updatedAt: Date | null
  readonly detalle: AtencionDetalleRaw[]
  readonly pagos: AtencionPagoRaw[]

  constructor(raw: AtencionMedicaRaw) {
    this.id = raw.id
    this.consultorioId = raw.consultorioId
    this.pacienteId = raw.pacienteId
    this.pacienteNombre = raw.pacienteNombre
    this.pacienteApellido = raw.pacienteApellido
    this.pacienteTelefono = raw.pacienteTelefono
    this.medicoId = raw.medicoId
    this.medicoNombre = raw.medicoNombre
    this.medicoEspecialidad = raw.medicoEspecialidad
    this.citaId = raw.citaId
    this.fechaAtencion = raw.fechaAtencion
    this.totalServicios = raw.totalServicios
    this.totalCantidad = raw.totalCantidad
    this.subtotal = Number(raw.subtotal)
    this.descuento = Number(raw.descuento)
    this.total = Number(raw.total)
    this.tipoPago = raw.tipoPago
    this.estadoPago = raw.estadoPago
    this.observaciones = raw.observaciones
    this.estado = raw.estado
    this.createdAt = raw.createdAt
    this.updatedAt = raw.updatedAt
    this.detalle = raw.detalle ?? []
    this.pagos = raw.pagos ?? []
  }

  static fromPrisma(raw: AtencionMedicaRaw): AtencionMedicaEntity {
    return new AtencionMedicaEntity(raw)
  }

  calcularSaldoPendiente(): number {
    const pagado = this.pagos.reduce((sum, p) => sum + Number(p.monto), 0)
    return Math.max(0, this.total - pagado)
  }

  determinarEstadoPago(): "PENDIENTE" | "PARCIAL" | "PAGADO" {
    const pagado = this.pagos.reduce((sum, p) => sum + Number(p.monto), 0)
    if (pagado <= 0) return "PENDIENTE"
    if (pagado >= this.total) return "PAGADO"
    return "PARCIAL"
  }

  toJSON() {
    return {
      id: this.id,
      consultorioId: this.consultorioId,
      pacienteId: this.pacienteId,
      pacienteNombre: this.pacienteNombre,
      pacienteApellido: this.pacienteApellido,
      pacienteTelefono: this.pacienteTelefono,
      medicoId: this.medicoId,
      medicoNombre: this.medicoNombre,
      medicoEspecialidad: this.medicoEspecialidad,
      citaId: this.citaId,
      fechaAtencion: this.fechaAtencion.toISOString(),
      totalServicios: this.totalServicios,
      totalCantidad: this.totalCantidad,
      subtotal: this.subtotal,
      descuento: this.descuento,
      total: this.total,
      tipoPago: this.tipoPago,
      estadoPago: this.estadoPago,
      observaciones: this.observaciones,
      estado: this.estado,
      saldoPendiente: this.calcularSaldoPendiente(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt?.toISOString() ?? null,
      detalle: this.detalle.map((d) => ({
        ...d,
        precioUnitario: Number(d.precioUnitario),
        descuento: Number(d.descuento),
        subtotal: Number(d.subtotal),
      })),
      pagos: this.pagos.map((p) => ({
        ...p,
        monto: Number(p.monto),
        pagadoEn: p.pagadoEn instanceof Date ? p.pagadoEn.toISOString() : p.pagadoEn,
      })),
    }
  }
}
