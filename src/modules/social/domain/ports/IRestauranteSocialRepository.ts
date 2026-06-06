export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  take: number
  totalPaginas: number
  hayPaginaSiguiente: boolean
  hayPaginaAnterior: boolean
}

export interface RestauranteReaccionRaw {
  id: string
  restauranteId: string
  userId: string
  tipo: string
  createdAt: Date
}

export interface RestauranteComentarioRaw {
  id: string
  restauranteId: string
  userId: string
  contenido: string
  editado: boolean
  estado: string
  padreId: string | null
  totalRespuestas?: number
  reacciones?: { tipo: string; total: number }[]
  autor?: { nombre: string; avatarUrl: string | null }
  createdAt: Date
  updatedAt: Date | null
}

export interface RestauranteValoracionRaw {
  id: string
  restauranteId: string
  userId: string
  puntuacion: number
  resena: string | null
  estado: string
  autor?: { nombre: string; avatarUrl: string | null }
  createdAt: Date
  updatedAt: Date | null
}

export interface RestaurantePreguntaRaw {
  id: string
  restauranteId: string
  userId: string
  pregunta: string
  estado: string
  autor?: { nombre: string }
  respuestas?: RestauranteRespuestaRaw[]
  createdAt: Date
  updatedAt: Date | null
}

export interface RestauranteRespuestaRaw {
  id: string
  preguntaId: string
  userId: string
  respuesta: string
  estado: string
  autor?: { nombre: string }
  createdAt: Date
  updatedAt: Date | null
}

export interface ResolveRestauranteInfoResult {
  restauranteId: string
  tenantId: string
}

export interface IRestauranteSocialRepository {
  resolveRestauranteInfo(slug: string): Promise<ResolveRestauranteInfoResult>

  // Reacciones
  upsertReaccion(restauranteId: string, userId: string, tipo: string): Promise<{ tipo: string | null; removed: boolean; reacciones: { tipo: string; total: number }[] }>
  listarReacciones(restauranteId: string): Promise<{ tipo: string; total: number }[]>

  // Comentarios
  crearComentario(data: { restauranteId: string; userId: string; contenido: string; padreId?: string }): Promise<RestauranteComentarioRaw>
  findComentario(comentarioId: string): Promise<RestauranteComentarioRaw | null>
  listarComentarios(restauranteId: string, params: { take: number; page?: number; padreId?: string; order: "asc" | "desc" }): Promise<PaginatedResult<RestauranteComentarioRaw>>
  responderComentario(data: { restauranteId: string; userId: string; contenido: string; padreId: string }): Promise<RestauranteComentarioRaw>

  // Valoraciones
  upsertValoracion(data: { restauranteId: string; userId: string; puntuacion: number; resena?: string }): Promise<RestauranteValoracionRaw>
  getPromedioValoraciones(restauranteId: string): Promise<number>
  listarValoraciones(restauranteId: string, params: { take: number; page?: number; order: "asc" | "desc"; orderBy?: string }): Promise<PaginatedResult<RestauranteValoracionRaw>>

  // Preguntas
  crearPregunta(data: { restauranteId: string; userId: string; pregunta: string }): Promise<RestaurantePreguntaRaw>
  findPregunta(preguntaId: string): Promise<RestaurantePreguntaRaw | null>
  responderPregunta(data: { preguntaId: string; userId: string; respuesta: string }): Promise<RestauranteRespuestaRaw>
  ocultarPregunta(preguntaId: string, restauranteId: string): Promise<RestaurantePreguntaRaw>
  mostrarPregunta(preguntaId: string, restauranteId: string): Promise<RestaurantePreguntaRaw>
  listarPreguntas(restauranteId: string, params: { take: number; page?: number; order: "asc" | "desc"; incluirInactivas?: boolean }): Promise<PaginatedResult<RestaurantePreguntaRaw>>

  // Favoritos y Seguimiento
  toggleFavorito(restauranteId: string, userId: string): Promise<{ favorito: boolean }>
  toggleSeguir(restauranteId: string, userId: string): Promise<{ siguiendo: boolean; totalSeguidores: number }>
  listarSeguidores(restauranteId: string, params: { take: number; page?: number }): Promise<PaginatedResult<{ userId: string; createdAt: Date }>>

  // Publicaciones de novedad
  crearPublicacion(data: { tenantId: string; autorId: string; titulo?: string; contenido: string; tipo: string; etiquetas?: string[]; medios?: { tipo: string; url?: string; embedUrl?: string }[] }): Promise<{ id: string; estado: string; createdAt: Date }>
  listarPublicaciones(tenantId: string, params: { take: number; page?: number }): Promise<PaginatedResult<unknown>>
}
