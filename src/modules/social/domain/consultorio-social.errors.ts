export class ConsultorioSocialNoActivoError extends Error {
  readonly code = "CONSULTORIO_SOCIAL_NO_ACTIVO"
  constructor(slug?: string) {
    super(slug ? `Consultorio '${slug}' no encontrado o no activo` : "Consultorio no encontrado o no activo")
  }
}

export class ValoracionDuplicadaError extends Error {
  readonly code = "VALORACION_DUPLICADA"
  constructor() {
    super("Ya existe una valoración activa para este consultorio")
  }
}

export class ComentarioNoEncontradoError extends Error {
  readonly code = "COMENTARIO_NO_ENCONTRADO"
  constructor(id?: string) {
    super(id ? `Comentario '${id}' no encontrado` : "Comentario no encontrado")
  }
}

export class PreguntaNoEncontradaError extends Error {
  readonly code = "PREGUNTA_NO_ENCONTRADA"
  constructor(id?: string) {
    super(id ? `Pregunta '${id}' no encontrada` : "Pregunta no encontrada")
  }
}
