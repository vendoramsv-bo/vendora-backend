import type { PaginatedResult } from "./IRestauranteSocialRepository.js"

export interface ConsultorioReaccionRaw {
  id: string
  consultorioId: string
  userId: string
  tipo: string
  createdAt: Date
}

export interface ConsultorioComentarioRaw {
  id: string
  consultorioId: string
  userId: string
  contenido: string
  editado: boolean
  estado: string
  padreId: string | null
  totalRespuestas?: number
  reacciones?: { tipo: string; total: number }[]
  createdAt: Date
  updatedAt: Date | null
}

export interface ConsultorioValoracionRaw {
  id: string
  consultorioId: string
  userId: string
  puntuacion: number
  resena: string | null
  estado: string
  createdAt: Date
  updatedAt: Date | null
}

export interface ConsultorioPreguntaRaw {
  id: string
  consultorioId: string
  userId: string
  pregunta: string
  estado: string
  respuestas?: ConsultorioRespuestaRaw[]
  createdAt: Date
  updatedAt: Date | null
}

export interface ConsultorioRespuestaRaw {
  id: string
  preguntaId: string
  userId: string
  respuesta: string
  estado: string
  createdAt: Date
  updatedAt: Date | null
}

export interface ResolveConsultorioInfoResult {
  consultorioId: string
  tenantId: string
}

export interface IConsultorioSocialRepository {
  resolveConsultorioInfo(slug: string): Promise<ResolveConsultorioInfoResult>

  // Reacciones
  upsertReaccion(consultorioId: string, userId: string, tipo: string): Promise<{ tipo: string | null; removed: boolean; reacciones: { tipo: string; total: number }[] }>
  listarReacciones(consultorioId: string): Promise<{ tipo: string; total: number }[]>

  // Comentarios
  crearComentario(data: { consultorioId: string; userId: string; contenido: string; padreId?: string }): Promise<ConsultorioComentarioRaw>
  findComentario(comentarioId: string): Promise<ConsultorioComentarioRaw | null>
  listarComentarios(consultorioId: string, params: { take: number; page?: number; padreId?: string; order: "asc" | "desc" }): Promise<PaginatedResult<ConsultorioComentarioRaw>>
  responderComentario(data: { consultorioId: string; userId: string; contenido: string; padreId: string }): Promise<ConsultorioComentarioRaw>

  // Valoraciones
  upsertValoracion(data: { consultorioId: string; userId: string; puntuacion: number; resena?: string }): Promise<ConsultorioValoracionRaw>
  getPromedioValoraciones(consultorioId: string): Promise<number>
  listarValoraciones(consultorioId: string, params: { take: number; page?: number; order: "asc" | "desc"; orderBy?: string }): Promise<PaginatedResult<ConsultorioValoracionRaw>>

  // Preguntas
  crearPregunta(data: { consultorioId: string; userId: string; pregunta: string }): Promise<ConsultorioPreguntaRaw>
  findPregunta(preguntaId: string): Promise<ConsultorioPreguntaRaw | null>
  responderPregunta(data: { preguntaId: string; userId: string; respuesta: string }): Promise<ConsultorioRespuestaRaw>
  ocultarPregunta(preguntaId: string, consultorioId: string): Promise<ConsultorioPreguntaRaw>
  mostrarPregunta(preguntaId: string, consultorioId: string): Promise<ConsultorioPreguntaRaw>
  listarPreguntas(consultorioId: string, params: { take: number; page?: number; order: "asc" | "desc"; incluirInactivas?: boolean }): Promise<PaginatedResult<ConsultorioPreguntaRaw>>

  // Favoritos y Seguimiento
  toggleFavorito(consultorioId: string, userId: string): Promise<{ favorito: boolean }>
  toggleSeguir(consultorioId: string, userId: string): Promise<{ siguiendo: boolean; totalSeguidores: number }>
  getTotalSeguidores(consultorioId: string): Promise<number>

  // Publicaciones de novedad
  crearPublicacion(data: { tenantId: string; autorId: string; titulo?: string; contenido: string; tipo: string; etiquetas?: string[]; medios?: { tipo: string; url?: string; embedUrl?: string }[] }): Promise<{ id: string; estado: string; createdAt: Date }>
  listarPublicaciones(tenantId: string, params: { take: number; page?: number }): Promise<PaginatedResult<unknown>>
}
