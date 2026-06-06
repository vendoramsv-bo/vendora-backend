export interface TiendaReaccionRaw {
  id: string
  tiendaId: string
  userId: string
  tipo: string
  createdAt: Date
}

export interface TiendaComentarioRaw {
  id: string
  tiendaId: string
  userId: string
  contenido: string
  editado: boolean
  estado: string
  padreId: string | null
  createdAt: Date
  updatedAt: Date | null
  respuestas?: TiendaComentarioRaw[]
}

export interface TiendaValoracionRaw {
  id: string
  tiendaId: string
  userId: string
  puntuacion: number
  resena: string | null
  estado: string
  createdAt: Date
  updatedAt: Date | null
}

export interface TiendaPreguntaRaw {
  id: string
  tiendaId: string
  userId: string
  pregunta: string
  estado: string
  createdAt: Date
  updatedAt: Date | null
  respuestas?: TiendaRespuestaRaw[]
}

export interface TiendaRespuestaRaw {
  id: string
  preguntaId: string
  userId: string
  respuesta: string
  estado: string
  createdAt: Date
  updatedAt: Date | null
}

export interface TiendaFavoritoRaw {
  id: string
  tiendaId: string
  userId: string
  createdAt: Date
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  take: number
  totalPaginas: number
  hayPaginaSiguiente: boolean
  hayPaginaAnterior: boolean
}

export interface ITiendaSocialRepository {
  resolveTiendaId(slug: string): Promise<string>
  resolveTiendaInfo(slug: string): Promise<{ tiendaId: string; tenantId: string }>

  // Reacciones
  upsertReaccionTienda(tiendaId: string, userId: string, tipo: string): Promise<{ reaccion: TiendaReaccionRaw | null; removed: boolean }>
  listarReaccionesTienda(tiendaId: string): Promise<{ tipo: string; count: number }[]>

  // Comentarios
  crearComentarioTienda(data: { tiendaId: string; userId: string; contenido: string; padreId?: string }): Promise<TiendaComentarioRaw>
  findComentarioTienda(comentarioId: string): Promise<TiendaComentarioRaw | null>
  editarComentarioTienda(comentarioId: string, contenido: string): Promise<TiendaComentarioRaw>
  deleteRespuestasTienda(padreId: string): Promise<void>
  deleteComentarioTienda(comentarioId: string): Promise<void>
  listarComentariosTienda(tiendaId: string, params: { take: number; page: number; order: "asc" | "desc" }): Promise<PaginatedResult<TiendaComentarioRaw>>

  // Valoraciones
  upsertValoracionTienda(data: { tiendaId: string; userId: string; puntuacion: number; resena?: string }): Promise<TiendaValoracionRaw>
  getPromedioValoracionesTienda(tiendaId: string): Promise<number>
  listarValoracionesTienda(tiendaId: string, params: { take: number; page: number; order: "asc" | "desc"; orderBy?: string }): Promise<PaginatedResult<TiendaValoracionRaw>>

  // Preguntas
  crearPreguntaTienda(data: { tiendaId: string; userId: string; pregunta: string }): Promise<TiendaPreguntaRaw>
  findPreguntaTienda(preguntaId: string): Promise<TiendaPreguntaRaw | null>
  crearRespuestaTienda(data: { preguntaId: string; userId: string; respuesta: string }): Promise<TiendaRespuestaRaw>
  listarPreguntasTienda(tiendaId: string, params: { take: number; page: number; order: "asc" | "desc" }): Promise<PaginatedResult<TiendaPreguntaRaw>>
  ocultarPreguntaTienda(preguntaId: string, tiendaId: string): Promise<TiendaPreguntaRaw>
  mostrarPreguntaTienda(preguntaId: string, tiendaId: string): Promise<TiendaPreguntaRaw>

  // Favoritos y Seguimiento
  toggleFavoritoTienda(tiendaId: string, userId: string): Promise<{ favorito: boolean }>
  esFavoritoTienda(tiendaId: string, userId: string): Promise<boolean>
  toggleSeguirTienda(tiendaId: string, userId: string): Promise<{ siguiendo: boolean }>
  contarSeguidoresTienda(tiendaId: string): Promise<number>
  listarFavoritosTiendasUsuario(userId: string, params: { take: number; page: number }): Promise<PaginatedResult<TiendaFavoritoRaw>>
}
