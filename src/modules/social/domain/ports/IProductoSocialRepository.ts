export interface ProductoReaccionResult {
  id: string
  emoji: string
  userId: string
  productoId: string
  tenantId: string
  createdAt: Date
}

export interface ProductoComentarioRaw {
  id: string
  productoId: string
  tenantId: string
  userId: string
  contenido: string
  editado: boolean
  estado: string
  padreId: string | null
  createdAt: Date
  updatedAt: Date | null
  respuestas?: ProductoComentarioRaw[]
}

export interface ProductoValoracionRaw {
  id: string
  productoId: string
  tenantId: string
  userId: string
  puntuacion: number
  resena: string | null
  estado: string
  createdAt: Date
  updatedAt: Date | null
}

export interface ProductoPreguntaRaw {
  id: string
  productoId: string
  tenantId: string
  userId: string
  pregunta: string
  estado: string
  createdAt: Date
  updatedAt: Date | null
  respuestas?: ProductoRespuestaRaw[]
}

export interface ProductoRespuestaRaw {
  id: string
  preguntaId: string
  userId: string
  respuesta: string
  estado: string
  createdAt: Date
  updatedAt: Date | null
}

export interface ProductoFavoritoRaw {
  id: string
  productoId: string
  tenantId: string
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

export interface IProductoSocialRepository {
  findProductoTenantId(productoId: string): Promise<string | null>
  productoExiste(productoId: string, tenantId: string): Promise<boolean>

  // Reacciones
  toggleReaccionProducto(productoId: string, tenantId: string, userId: string, emoji: string): Promise<{ reaccion: ProductoReaccionResult | null; removed: boolean }>
  listarReaccionesProducto(productoId: string): Promise<{ emoji: string; count: number }[]>

  // Comentarios
  crearComentarioProducto(data: { productoId: string; tenantId: string; userId: string; contenido: string; padreId?: string }): Promise<ProductoComentarioRaw>
  findComentarioProducto(comentarioId: string): Promise<ProductoComentarioRaw | null>
  editarComentarioProducto(comentarioId: string, contenido: string): Promise<ProductoComentarioRaw>
  deleteRespuestasProducto(padreId: string): Promise<void>
  deleteComentarioProducto(comentarioId: string): Promise<void>
  listarComentariosProducto(productoId: string, tenantId: string, params: { take: number; page: number; order: "asc" | "desc"; soloRaiz?: boolean }): Promise<PaginatedResult<ProductoComentarioRaw>>

  // Valoraciones
  upsertValoracionProducto(data: { productoId: string; tenantId: string; userId: string; puntuacion: number; resena?: string }): Promise<ProductoValoracionRaw>
  getPromedioValoracionesProducto(productoId: string): Promise<number>
  listarValoracionesProducto(productoId: string, tenantId: string, params: { take: number; page: number; order: "asc" | "desc"; orderBy?: string }): Promise<PaginatedResult<ProductoValoracionRaw>>

  // Preguntas
  crearPreguntaProducto(data: { productoId: string; tenantId: string; userId: string; pregunta: string }): Promise<ProductoPreguntaRaw>
  findPreguntaProducto(preguntaId: string): Promise<ProductoPreguntaRaw | null>
  crearRespuestaProducto(data: { preguntaId: string; userId: string; respuesta: string }): Promise<ProductoRespuestaRaw>
  listarPreguntasProducto(productoId: string, tenantId: string, params: { take: number; page: number; order: "asc" | "desc" }): Promise<PaginatedResult<ProductoPreguntaRaw>>

  // Favoritos
  toggleFavoritoProducto(productoId: string, tenantId: string, userId: string): Promise<{ favorito: boolean }>
  listarFavoritosUsuario(userId: string, params: { take: number; page: number }): Promise<PaginatedResult<ProductoFavoritoRaw>>
}
