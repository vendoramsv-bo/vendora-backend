export class RestauranteNoActivoError extends Error {
  readonly code = "RESTAURANTE_NO_ACTIVO"
  constructor() {
    super("El restaurante no está activo en el directorio público")
    this.name = "RestauranteNoActivoError"
  }
}

export class PerfilNoEncontradoError extends Error {
  readonly code = "PERFIL_NO_ENCONTRADO"
  constructor(slug?: string) {
    super(slug ? `Restaurante no encontrado: ${slug}` : "Restaurante no encontrado o no está activo")
    this.name = "PerfilNoEncontradoError"
  }
}

export class TipoServicioSinReservasError extends Error {
  readonly code = "TIPO_SERVICIO_SIN_RESERVAS"
  constructor(tipo?: string) {
    super(tipo ? `El tipo de servicio "${tipo}" no acepta reservas de mesa online` : "El tipo de servicio no acepta reservas de mesa online")
    this.name = "TipoServicioSinReservasError"
  }
}

export class ReservaFechaInvalidaError extends Error {
  readonly code = "RESERVA_FECHA_INVALIDA"
  constructor() {
    super("La fecha de llegada no puede ser en el pasado")
    this.name = "ReservaFechaInvalidaError"
  }
}

export class ReservaNoModificableError extends Error {
  readonly code = "RESERVA_NO_MODIFICABLE"
  constructor(estado?: string) {
    super(estado ? `No se puede cancelar una reserva en estado ${estado}` : "La reserva no puede modificarse en su estado actual")
    this.name = "ReservaNoModificableError"
  }
}

export class ReservaNoEncontradaError extends Error {
  readonly code = "RESERVA_NO_ENCONTRADA"
  constructor(id?: string) {
    super(id ? `Reserva no encontrada: ${id}` : "Reserva no encontrada o no pertenece al usuario")
    this.name = "ReservaNoEncontradaError"
  }
}
