export class ConsultorioNoEncontradoError extends Error {
  readonly code = "CONSULTORIO_NO_ENCONTRADO"
  constructor(slug?: string) {
    super(slug ? `Consultorio '${slug}' no encontrado` : "Consultorio no encontrado")
  }
}

export class SlotNoDisponibleError extends Error {
  readonly code = "SLOT_NO_DISPONIBLE"
  constructor() {
    super("El slot solicitado ya no está disponible")
  }
}

export class CitaNoCancelableError extends Error {
  readonly code = "CITA_NO_CANCELABLE"
  constructor(estado: string) {
    super(`La cita no puede cancelarse en estado '${estado}'`)
  }
}

export class MedicoNoDisponibleError extends Error {
  readonly code = "MEDICO_NO_DISPONIBLE"
  constructor() {
    super("El médico no está disponible para agendamiento público")
  }
}

export class ServicioNoDisponibleError extends Error {
  readonly code = "SERVICIO_NO_DISPONIBLE"
  constructor() {
    super("El servicio no está disponible para agendamiento público")
  }
}

export class CapacidadConsultorioInactivaError extends Error {
  readonly code = "CAPACIDAD_CONSULTORIO_INACTIVA"
  constructor() {
    super("El módulo de consultorio no está activo")
  }
}
