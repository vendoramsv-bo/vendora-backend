export interface ActivarRestauranteResultDTO {
  esRestaurante: true
  slug: string
}

export interface ConfiguracionPublicaDTO {
  restauranteId: string
  especialidad: string | null
  tipoServicio: string | null
  capacidadMesas: number | null
  capacidadComensales: number | null
  duracionPromedioMin: number
  horarios: unknown | null
  fotos: string[]
  contactoPublico: unknown | null
}

export interface ActualizarConfiguracionPublicaDTO {
  especialidad?: string
  tipoServicio?: string
  capacidadMesas?: number
  capacidadComensales?: number
  duracionPromedioMin?: number
  horarios?: unknown[]
  fotos?: string[]
  contactoPublico?: unknown
}

export interface PerfilPublicoRestauranteDTO {
  slug: string
  nombre: string
  descripcion: string
  logoUrl: string | null
  fotos: string[]
  tipoServicio: string | null
  especialidad: string | null
  capacidadMesas: number | null
  capacidadComensales: number | null
  duracionPromedioMin: number
  horarios: unknown | null
  contactoPublico: unknown | null
  localizaciones: { direccion: string; ciudad: string; lat: number; lng: number }[]
  propietariosVisibles: { nombres: string; imagenUrl: string | null }[]
  equipoPublico: { nombres: string; cargo: string; imagenUrl: string | null }[]
  metricas: { puntuacionPromedio: number | null; totalValoraciones: number; totalSeguidores: number }
}

export interface DirectorioRestauranteQueryDTO {
  lat?: number
  lng?: number
  tipoServicio?: string
  especialidad?: string
  search?: string
  orderBy?: string
  order?: "asc" | "desc"
  take?: number
  page?: number
}

export interface DirectorioRestauranteItemDTO {
  slug: string
  nombre: string
  descripcion: string
  logoUrl: string | null
  tipoServicio: string | null
  especialidad: string | null
  puntuacionPromedio: number | null
  totalValoraciones: number
  totalSeguidores: number
  distanciaKm: number | null
  ciudad: string | null
}

export interface DirectorioRestauranteResultDTO {
  data: DirectorioRestauranteItemDTO[]
  total: number
  page: number
  take: number
  totalPaginas: number
  hayPaginaSiguiente: boolean
  hayPaginaAnterior: boolean
}

export interface MenuPublicoQueryDTO {
  restauranteId: string
  tiempoComida?: string
  fecha?: string
  take?: number
  page?: number
}

export interface ReservaPublicaCreateDTO {
  restauranteId: string
  tenantId: string
  userId: string
  fechaLlegada: Date
  numeroComensales: number
  observaciones?: string | null
}

export interface ReservaPublicaDTO {
  id: string
  codigo: string
  fechaLlegada: Date
  numeroComensales: number
  estado: string
  observaciones: string | null
  restaurante: { nombre: string; slug: string; logoUrl: string | null }
}

export interface MisReservasQueryDTO {
  userId: string
  estado?: string
  take?: number
  page?: number
}

export interface IRestaurantePublicoRepository {
  // US1 — activación y configuración
  activar(tenantId: string, createdById?: string): Promise<ActivarRestauranteResultDTO>
  desactivar(tenantId: string): Promise<void>
  obtenerConfiguracion(tenantId: string): Promise<ConfiguracionPublicaDTO>
  actualizarConfiguracion(tenantId: string, datos: ActualizarConfiguracionPublicaDTO, updatedById?: string): Promise<ConfiguracionPublicaDTO>
  obtenerPerfilPublico(slug: string): Promise<PerfilPublicoRestauranteDTO | null>

  // US2 — directorio
  listarDirectorio(params: DirectorioRestauranteQueryDTO): Promise<DirectorioRestauranteResultDTO>

  // US3 — menú público
  listarMenusPublicos(query: MenuPublicoQueryDTO): Promise<{ data: unknown[]; total: number; page: number; take: number; totalPaginas: number; hayPaginaSiguiente: boolean; hayPaginaAnterior: boolean }>

  // US4 — reservas
  crearReservaPublica(datos: ReservaPublicaCreateDTO): Promise<{ id: string; codigo: string; fechaLlegada: Date; numeroComensales: number; estado: string }>
  listarMisReservas(query: MisReservasQueryDTO): Promise<{ data: ReservaPublicaDTO[]; total: number; page: number; take: number; totalPaginas: number; hayPaginaSiguiente: boolean; hayPaginaAnterior: boolean }>
  cancelarReservaPublica(reservaId: string, userId: string): Promise<{ id: string; estado: string }>
}
