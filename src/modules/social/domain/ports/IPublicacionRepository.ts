export interface PublicacionMediaRaw {
  id: string
  publicacionId: string
  tipo: string
  url: string | null
  embedUrl: string | null
  thumbnailUrl: string | null
  plataforma: string | null
  titulo: string | null
  orden: number
  createdAt: Date
  updatedAt: Date | null
}

export interface PublicacionRaw {
  id: string
  tenantId: string
  autorId: string
  titulo: string | null
  contenido: string | null
  tipo: string
  estado: string
  etiquetas: string[]
  publicadoEn: Date | null
  createdAt: Date
  updatedAt: Date | null
  medios?: PublicacionMediaRaw[]
}

export interface PublicacionComentarioRaw {
  id: string
  publicacionId: string
  userId: string
  contenido: string
  editado: boolean
  estado: string
  padreId: string | null
  createdAt: Date
  updatedAt: Date | null
  respuestas?: PublicacionComentarioRaw[]
}

export interface PublicacionReaccionRaw {
  id: string
  publicacionId: string
  userId: string
  tipo: string
  createdAt: Date
}

export interface PublicacionCompartidoRaw {
  id: string
  publicacionId: string
  userId: string
  plataforma: string
  createdAt: Date
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
}

export interface MediaInput {
  tipo: string
  url?: string
  embedUrl?: string
  thumbnailUrl?: string
  plataforma?: string
  titulo?: string
  orden?: number
}

export interface IPublicacionRepository {
  create(data: { tenantId: string; autorId: string; titulo?: string; contenido?: string; tipo: string; etiquetas: string[]; medios: MediaInput[] }): Promise<PublicacionRaw>
  update(id: string, tenantId: string, data: { titulo?: string; contenido?: string; tipo?: string; etiquetas?: string[]; medios?: MediaInput[] }): Promise<PublicacionRaw>
  findById(id: string, tenantId?: string): Promise<PublicacionRaw | null>
  findPublicas(tenantId: string, params: { take: number; skip: number; order: "asc" | "desc"; etiqueta?: string }): Promise<PaginatedResult<PublicacionRaw>>
  findByTenant(tenantId: string, params: { take: number; skip: number; order: "asc" | "desc"; estado?: string; etiqueta?: string }): Promise<PaginatedResult<PublicacionRaw>>
  cambiarEstado(id: string, nuevoEstado: string, publicadoEn?: Date): Promise<PublicacionRaw>
  delete(id: string, tenantId: string): Promise<void>

  // Reacciones
  upsertReaccionPublicacion(publicacionId: string, userId: string, tipo: string): Promise<{ reaccion: PublicacionReaccionRaw | null; removed: boolean }>

  // Comentarios
  crearComentarioPublicacion(data: { publicacionId: string; userId: string; contenido: string; padreId?: string }): Promise<PublicacionComentarioRaw>
  findComentarioPublicacion(comentarioId: string): Promise<PublicacionComentarioRaw | null>
  editarComentarioPublicacion(comentarioId: string, contenido: string): Promise<PublicacionComentarioRaw>
  deleteRespuestasPublicacion(padreId: string): Promise<void>
  deleteComentarioPublicacion(comentarioId: string): Promise<void>

  // Compartir
  registrarCompartido(data: { publicacionId: string; userId: string; plataforma: string }): Promise<PublicacionCompartidoRaw>

  // Helpers para obtener detalle público
  getReaccionesCount(publicacionId: string): Promise<{ tipo: string; count: number }[]>
  listarComentariosPublicacion(publicacionId: string, params: { take: number; skip: number; order: "asc" | "desc" }): Promise<PaginatedResult<PublicacionComentarioRaw>>
}
