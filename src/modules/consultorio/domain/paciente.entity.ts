export interface PacienteRaw {
  id: string
  consultorioId: string
  dni: string | null
  nombre: string
  apellido: string
  fechaNacimiento: Date | null
  genero: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  tipoSangre: string | null
  alergias: string | null
  seguroNombre: string | null
  seguroNumero: string | null
  canalNotificacion: string | null
  estado: string
  createdAt: Date
  updatedAt: Date | null
  createdById: string | null
  updatedById: string | null
}

export class PacienteEntity {
  readonly id: string
  readonly consultorioId: string
  readonly dni: string | null
  readonly nombre: string
  readonly apellido: string
  readonly fechaNacimiento: Date | null
  readonly genero: string | null
  readonly telefono: string | null
  readonly email: string | null
  readonly direccion: string | null
  readonly tipoSangre: string | null
  readonly alergias: string | null
  readonly seguroNombre: string | null
  readonly seguroNumero: string | null
  readonly canalNotificacion: string | null
  readonly estado: string
  readonly createdAt: Date
  readonly updatedAt: Date | null

  constructor(raw: PacienteRaw) {
    this.id = raw.id
    this.consultorioId = raw.consultorioId
    this.dni = raw.dni
    this.nombre = raw.nombre
    this.apellido = raw.apellido
    this.fechaNacimiento = raw.fechaNacimiento
    this.genero = raw.genero
    this.telefono = raw.telefono
    this.email = raw.email
    this.direccion = raw.direccion
    this.tipoSangre = raw.tipoSangre
    this.alergias = raw.alergias
    this.seguroNombre = raw.seguroNombre
    this.seguroNumero = raw.seguroNumero
    this.canalNotificacion = raw.canalNotificacion
    this.estado = raw.estado
    this.createdAt = raw.createdAt
    this.updatedAt = raw.updatedAt
  }

  static fromPrisma(raw: PacienteRaw): PacienteEntity {
    return new PacienteEntity(raw)
  }

  edad(): number | null {
    if (!this.fechaNacimiento) return null
    const hoy = new Date()
    let edad = hoy.getFullYear() - this.fechaNacimiento.getFullYear()
    const mes = hoy.getMonth() - this.fechaNacimiento.getMonth()
    if (mes < 0 || (mes === 0 && hoy.getDate() < this.fechaNacimiento.getDate())) edad--
    return edad
  }

  toJSON() {
    return {
      id: this.id,
      consultorioId: this.consultorioId,
      dni: this.dni,
      nombre: this.nombre,
      apellido: this.apellido,
      fechaNacimiento: this.fechaNacimiento?.toISOString() ?? null,
      genero: this.genero,
      telefono: this.telefono,
      email: this.email,
      direccion: this.direccion,
      tipoSangre: this.tipoSangre,
      alergias: this.alergias,
      seguroNombre: this.seguroNombre,
      seguroNumero: this.seguroNumero,
      canalNotificacion: this.canalNotificacion,
      edad: this.edad(),
      estado: this.estado,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt?.toISOString() ?? null,
    }
  }
}
