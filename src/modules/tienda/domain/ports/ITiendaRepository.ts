import type { QueryParams } from "../../../../core/query-params.js"

export interface ConfiguracionDTO {
  id: string
  tipoDespliegueVentas: string
  tema: string
  tipoLineado: string
  tipoDeTienda: string
}

export interface ActualizarConfiguracionDTO {
  tipoDespliegueVentas?: string
  tema?: string
  tipoLineado?: string
}

export interface PerfilPublicoDTO {
  tiendaId: string
  tenantSlug: string
  nombre: string
  descripcion: string
  logoUrl: string | null
  imagenes: Array<{ url: string; descripcion: string; orden: number }>
  propietarios: Array<{ nombres: string; imagenUrl: string | null }>
  equipoDeTrabajo: Array<{ nombres: string; cargo: string; imagenUrl: string | null }>
  localizaciones: Array<{ latitud: number; longitud: number; direccion: string; ciudad: string; barrio: string | null }>
  actividadesEconomicas: string[]
  /**
   * Tema del negocio, en id canónico minúscula (`"azul"`). Ausente si el
   * negocio nunca eligió: el cliente resuelve el default de la vertical.
   * Viaja en ESTA llamada, que la vitrina ya hacía — cero peticiones nuevas
   * en el camino del LCP (contrato §A.2).
   */
  tema?: string
  configuracion: { tema: string; tipoLineado: string } | null
  productosDestacados: Array<{
    productoId: string
    nombre: string
    precio: number
    imagenUrl: string | null
    orden: number
    /** Agregado de valoración, igual que en el catálogo (spec 019 FR-020). */
    puntuacionPromedio: number
    totalValoraciones: number
  }>
  metricas: { puntuacionPromedio: number; totalValoraciones: number; totalSeguidores: number; totalComentarios: number }
}

/** Categoria que el comercio usa en su catalogo publico (spec 019 FR-001). */
export interface CategoriaPublicaDTO {
  id: string
  nombre: string
  /** Productos ACTIVO que cuelgan de ella. Decide si la barra la muestra. */
  totalProductos: number
}

export interface DirectorioItemDTO {
  tiendaId: string
  tenantSlug: string
  nombre: string
  descripcion: string
  logoUrl: string | null
  actividadesEconomicas: string[]
  categorias: string[]
  puntuacionPromedio: number
  totalValoraciones: number
  totalSeguidores: number
  distanciaKm: number | null
  localizacion: { latitud: number; longitud: number; ciudad: string; barrio: string | null } | null
}

export interface DirectorioQueryDTO {
  lat?: number
  lng?: number
  actividadEconomicaId?: string
  categoriaId?: string
  busqueda?: string
  ordenarPor?: "puntuacion" | "seguidores" | "createdAt" | "distancia"
  orden?: "asc" | "desc"
  page?: number
  take?: number
  limit?: number
}

export interface DirectorioResultDTO {
  data: DirectorioItemDTO[]
  total: number
  page: number
  take: number
  totalPaginas: number
  hayPaginaSiguiente: boolean
  hayPaginaAnterior: boolean
}

export interface ActivarTiendaResultDTO {
  esTienda: boolean
  tiendaId: string
}

export interface AgregarDestacadoDTO {
  tenantId: string
  productoId: string
  orden?: number
  createdById?: string
}

export interface DestacadoItemDTO {
  id: string
  productoId: string
  nombre: string
  imagenUrl: string | null
  orden: number
}

export interface ITiendaRepository {
  activar(tenantId: string, createdById?: string): Promise<ActivarTiendaResultDTO>
  desactivar(tenantId: string): Promise<void>
  obtenerConfiguracion(tenantId: string): Promise<ConfiguracionDTO>
  actualizarConfiguracion(tenantId: string, dto: ActualizarConfiguracionDTO, updatedById?: string): Promise<ConfiguracionDTO>
  obtenerPerfilPublico(slug: string): Promise<PerfilPublicoDTO | null>
  listarDirectorio(query: DirectorioQueryDTO): Promise<DirectorioResultDTO>
  agregarDestacado(dto: AgregarDestacadoDTO): Promise<DestacadoItemDTO>
  quitarDestacado(tenantId: string, productoId: string): Promise<void>
  reordenarDestacados(tenantId: string, orden: string[]): Promise<void>
  listarDestacados(tenantId: string): Promise<DestacadoItemDTO[]>
  listarCatalogoPublico(slug: string, params: QueryParams, categoriaId?: string): Promise<{ data: unknown[]; total: number }>
  listarCategoriasPublicas(slug: string): Promise<CategoriaPublicaDTO[]>
  listarFavoritosComunidad(slug: string): Promise<unknown[]>
}
