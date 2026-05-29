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
  configuracion: { tema: string; tipoLineado: string } | null
  productosDestacados: Array<{ productoId: string; nombre: string; precio: number; imagenUrl: string | null; orden: number }>
  metricas: { puntuacionPromedio: number; totalValoraciones: number; totalSeguidores: number; totalComentarios: number }
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
  limit?: number
}

export interface DirectorioResultDTO {
  data: DirectorioItemDTO[]
  total: number
  page: number
  limit: number
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
  listarCatalogoPublico(slug: string, params: QueryParams): Promise<{ data: unknown[]; total: number }>
}
