export class RestauranteSocialNoEncontradoError extends Error {
  readonly code = "RESTAURANTE_SOCIAL_NO_ENCONTRADO"
  constructor(slug?: string) {
    super(slug ? `Restaurante no encontrado: ${slug}` : "Restaurante no encontrado o no está activo")
    this.name = "RestauranteSocialNoEncontradoError"
  }
}

export class ValoracionFueraDeRangoError extends Error {
  readonly code = "VALORACION_FUERA_DE_RANGO"
  constructor() {
    super("La puntuación debe estar entre 1 y 5")
    this.name = "ValoracionFueraDeRangoError"
  }
}

export class PreguntaRestauranteNoEncontradaError extends Error {
  readonly code = "PREGUNTA_RESTAURANTE_NO_ENCONTRADA"
  constructor(id: string) {
    super(`Pregunta no encontrada: ${id}`)
    this.name = "PreguntaRestauranteNoEncontradaError"
  }
}

export class PreguntaNoModificableError extends Error {
  readonly code = "PREGUNTA_NO_MODIFICABLE"
  constructor() {
    super("No tienes permiso para modificar esta pregunta")
    this.name = "PreguntaNoModificableError"
  }
}

export class ComentarioRestauranteNoEncontradoError extends Error {
  readonly code = "COMENTARIO_RESTAURANTE_NO_ENCONTRADO"
  constructor(id: string) {
    super(`Comentario no encontrado: ${id}`)
    this.name = "ComentarioRestauranteNoEncontradoError"
  }
}
