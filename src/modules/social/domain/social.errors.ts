export class ProductoNoEncontrado extends Error {
  readonly code = "PRODUCTO_NO_ENCONTRADO"
  constructor(id?: string) {
    super(id ? `Producto no encontrado: ${id}` : "Producto no encontrado o no pertenece al tenant")
    this.name = "ProductoNoEncontrado"
  }
}

export class TiendaNoEncontrada extends Error {
  readonly code = "TIENDA_NO_ENCONTRADA"
  constructor() {
    super("El tenant no tiene una tienda activa (esTienda=false)")
    this.name = "TiendaNoEncontrada"
  }
}

export class PublicacionNoEncontrada extends Error {
  readonly code = "PUBLICACION_NO_ENCONTRADA"
  constructor(id?: string) {
    super(id ? `Publicación no encontrada: ${id}` : "Publicación no encontrada o no está publicada")
    this.name = "PublicacionNoEncontrada"
  }
}

export class ComentarioNoEncontrado extends Error {
  readonly code = "COMENTARIO_NO_ENCONTRADO"
  constructor(id: string) {
    super(`Comentario no encontrado: ${id}`)
    this.name = "ComentarioNoEncontrado"
  }
}

export class PreguntaNoEncontrada extends Error {
  readonly code = "PREGUNTA_NO_ENCONTRADA"
  constructor(id: string) {
    super(`Pregunta no encontrada: ${id}`)
    this.name = "PreguntaNoEncontrada"
  }
}

export class NoAutorizado extends Error {
  readonly code = "NO_AUTORIZADO"
  constructor() {
    super("No tienes permiso para realizar esta acción")
    this.name = "NoAutorizado"
  }
}

export class EstadoPublicacionInvalido extends Error {
  readonly code = "ESTADO_PUBLICACION_INVALIDO"
  constructor(desde: string, hacia: string) {
    super(`No se puede pasar la publicación de "${desde}" a "${hacia}"`)
    this.name = "EstadoPublicacionInvalido"
  }
}

export class PuntuacionInvalida extends Error {
  readonly code = "PUNTUACION_INVALIDA"
  constructor() {
    super("La puntuación debe estar entre 1 y 5")
    this.name = "PuntuacionInvalida"
  }
}

export class ComentarioEsRespuesta extends Error {
  readonly code = "COMENTARIO_ES_RESPUESTA"
  constructor() {
    super("No se puede responder a una respuesta (máximo 1 nivel de anidación)")
    this.name = "ComentarioEsRespuesta"
  }
}

export class SoloPropietarioAdmin extends Error {
  readonly code = "SOLO_PROPIETARIO_ADMIN"
  constructor() {
    super("Solo PROPIETARIO o ADMIN pueden gestionar publicaciones")
    this.name = "SoloPropietarioAdmin"
  }
}

export class TiendaPreguntaNoEncontradaError extends Error {
  readonly code = "PREGUNTA_TIENDA_NO_ENCONTRADA"
  constructor(id: string) {
    super(`Pregunta de tienda no encontrada: ${id}`)
    this.name = "TiendaPreguntaNoEncontradaError"
  }
}
