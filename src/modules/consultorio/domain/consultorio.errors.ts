export class ConsultorioNoEncontrado extends Error {
  readonly code = "CONSULTORIO_NO_ENCONTRADO"
  constructor(id?: string) {
    super(id ? `Consultorio no encontrado: ${id}` : "Consultorio no encontrado")
    this.name = "ConsultorioNoEncontrado"
  }
}

export class MedicoNoEncontrado extends Error {
  readonly code = "MEDICO_NO_ENCONTRADO"
  constructor(id: string) {
    super(`Médico no encontrado: ${id}`)
    this.name = "MedicoNoEncontrado"
  }
}

export class MedicoYaExiste extends Error {
  readonly code = "MEDICO_YA_EXISTE"
  constructor() {
    super("Este miembro ya está registrado como médico en el consultorio")
    this.name = "MedicoYaExiste"
  }
}

export class MedicoTieneCitasPendientes extends Error {
  readonly code = "MEDICO_TIENE_CITAS_PENDIENTES"
  constructor() {
    super("No se puede desactivar el médico porque tiene citas pendientes o confirmadas")
    this.name = "MedicoTieneCitasPendientes"
  }
}

export class HorarioDuplicado extends Error {
  readonly code = "HORARIO_DUPLICADO"
  constructor() {
    super("Ya existe un horario para este día y hora de inicio")
    this.name = "HorarioDuplicado"
  }
}

export class PacienteNoEncontrado extends Error {
  readonly code = "PACIENTE_NO_ENCONTRADO"
  constructor(id: string) {
    super(`Paciente no encontrado: ${id}`)
    this.name = "PacienteNoEncontrado"
  }
}

export class PacienteEmailDuplicado extends Error {
  readonly code = "PACIENTE_EMAIL_DUPLICADO"
  constructor() {
    super("Ya existe un paciente con este email en el consultorio")
    this.name = "PacienteEmailDuplicado"
  }
}

export class ServicioNoEncontrado extends Error {
  readonly code = "SERVICIO_NO_ENCONTRADO"
  constructor(id: string) {
    super(`Servicio médico no encontrado: ${id}`)
    this.name = "ServicioNoEncontrado"
  }
}

export class ServicioNombreDuplicado extends Error {
  readonly code = "SERVICIO_NOMBRE_DUPLICADO"
  constructor() {
    super("Ya existe un servicio con este nombre en el consultorio")
    this.name = "ServicioNombreDuplicado"
  }
}

export class ServicioEnUso extends Error {
  readonly code = "SERVICIO_EN_USO"
  constructor() {
    super("No se puede desactivar el servicio porque tiene citas o atenciones activas")
    this.name = "ServicioEnUso"
  }
}

export class CitaNoEncontrada extends Error {
  readonly code = "CITA_NO_ENCONTRADA"
  constructor(id: string) {
    super(`Cita no encontrada: ${id}`)
    this.name = "CitaNoEncontrada"
  }
}

export class CitaSolapada extends Error {
  readonly code = "CITA_SOLAPADA"
  constructor() {
    super("El médico ya tiene una cita en ese horario")
    this.name = "CitaSolapada"
  }
}

export class CitaNoConfirmable extends Error {
  readonly code = "CITA_NO_CONFIRMABLE"
  constructor() {
    super("La cita no puede ser confirmada en su estado actual")
    this.name = "CitaNoConfirmable"
  }
}

export class CitaYaAtendida extends Error {
  readonly code = "CITA_YA_ATENDIDA"
  constructor() {
    super("La cita ya fue atendida y no puede modificarse")
    this.name = "CitaYaAtendida"
  }
}

export class HistoriaNoEncontrada extends Error {
  readonly code = "HISTORIA_NO_ENCONTRADA"
  constructor(id: string) {
    super(`Historia clínica no encontrada: ${id}`)
    this.name = "HistoriaNoEncontrada"
  }
}

export class AtencionNoEncontrada extends Error {
  readonly code = "ATENCION_NO_ENCONTRADA"
  constructor(id: string) {
    super(`Atención médica no encontrada: ${id}`)
    this.name = "AtencionNoEncontrada"
  }
}

export class PagoExcedeTotalError extends Error {
  readonly code = "PAGO_EXCEDE_TOTAL"
  constructor() {
    super("El monto del pago excede el saldo pendiente de la atención")
    this.name = "PagoExcedeTotalError"
  }
}

export class AtencionYaPagada extends Error {
  readonly code = "ATENCION_YA_PAGADA"
  constructor() {
    super("La atención ya fue pagada completamente")
    this.name = "AtencionYaPagada"
  }
}

export class RecetaNoEncontrada extends Error {
  readonly code = "RECETA_NO_ENCONTRADA"
  constructor(id: string) {
    super(`Receta médica no encontrada: ${id}`)
    this.name = "RecetaNoEncontrada"
  }
}

export class RecetaDespachada extends Error {
  readonly code = "RECETA_DESPACHADA"
  constructor() {
    super("No se puede anular una receta ya despachada")
    this.name = "RecetaDespachada"
  }
}

export class PermisoDenegado extends Error {
  readonly code = "PERMISO_DENEGADO"
  constructor(accion?: string) {
    super(accion ? `Permiso denegado para: ${accion}` : "Permiso denegado")
    this.name = "PermisoDenegado"
  }
}

export class DNIYaRegistrado extends Error {
  readonly code = "DNI_YA_REGISTRADO"
  constructor() {
    super("Ya existe un paciente con ese DNI en el consultorio")
    this.name = "DNIYaRegistrado"
  }
}

export class ConflictoVersionError extends Error {
  readonly code = "CONFLICTO_VERSION"
  constructor() {
    super("El registro fue modificado por otro usuario. Recargue antes de reintentar.")
    this.name = "ConflictoVersionError"
  }
}

export class VacunacionNoEncontrada extends Error {
  readonly code = "VACUNACION_NO_ENCONTRADA"
  constructor(id: string) {
    super(`Vacunación no encontrada: ${id}`)
    this.name = "VacunacionNoEncontrada"
  }
}
