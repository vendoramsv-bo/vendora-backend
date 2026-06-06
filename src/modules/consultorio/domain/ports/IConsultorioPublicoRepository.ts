export interface ConsultorioInfoResult {
  consultorioId: string
  tenantId: string
}

export interface ConsultorioPublicoConfig {
  horarios?: unknown
  contactoPublico?: unknown
  tipoServicio?: string
  fotos?: string[]
  especialidades?: string[]
}

export interface ConsultorioPublicoRaw {
  id: string
  tenantId: string
  slug: string
  nombre: string
  descripcion: string
  logo: string | null
  fotos: string[]
  especialidades: string[]
  nroRegistro: string | null
  tipoServicio: string
  horarios: unknown | null
  contactoPublico: unknown | null
  medicos: ConsultorioMedicoPublicoRaw[]
  promedioValoracion: number | null
  totalValoraciones: number
  totalSeguidores: number
  localizaciones: { direccion: string; ciudad: string; lat: number; lng: number }[]
}

export interface ConsultorioMedicoPublicoRaw {
  id: string
  especialidad: string
  bio: string | null
  fotoUrl: string | null
  visiblePublico: boolean
}

export interface ConsultorioDirectorioItem {
  slug: string
  nombre: string
  descripcion: string
  logoUrl: string | null
  especialidades: string[]
  tipoServicio: string
  puntuacionPromedio: number | null
  totalValoraciones: number
  totalSeguidores: number
  distanciaKm: number | null
  ciudad: string | null
}

export interface DirectorioParams {
  lat?: number
  lon?: number
  especialidad?: string
  tipoServicio?: string
  orderBy?: string
  order?: "asc" | "desc"
  page?: number
  take?: number
}

export interface ServicioPublicoRaw {
  id: string
  nombre: string
  descripcion: string | null
  especialidad: string | null
  duracionMin: number
  precioBase: unknown
  mostrarPrecio: boolean
  visiblePublico: boolean
}

export interface ServiciosParams {
  especialidad?: string
  page?: number
  take?: number
}

export interface HorarioAtencion {
  id: string
  medicoId: string
  diaSemana: number
  horaInicio: string
  horaFin: string
  activo: boolean
}

export interface CitaRaw {
  id: string
  consultorioId: string
  medicoId: string
  servicioId: string | null
  pacienteId: string | null
  consumerUserId: string | null
  origenOnline: boolean
  fechaHora: Date
  duracionMin: number
  estado: string
  motivo: string | null
  canalOrigen: string | null
  createdAt: Date
}

export interface CrearCitaOnlineInput {
  consultorioId: string
  medicoId: string
  servicioId: string
  consumerUserId: string
  fechaHora: Date
  duracionMin: number
  motivo?: string
}

export interface MisCitasParams {
  estado?: string
  page?: number
  take?: number
  order?: "asc" | "desc"
}

export interface CitasOnlineParams {
  estado?: string
  page?: number
  take?: number
}

export interface IConsultorioPublicoRepository {
  resolveConsultorioInfo(slug: string): Promise<ConsultorioInfoResult>
  activarPerfil(tenantId: string, actorId: string): Promise<void>
  desactivarPerfil(tenantId: string, actorId: string): Promise<void>
  actualizarConfiguracion(consultorioId: string, data: ConsultorioPublicoConfig, updatedById?: string): Promise<ConsultorioPublicoConfig>
  obtenerPerfil(slug: string): Promise<ConsultorioPublicoRaw | null>

  listarDirectorio(params: DirectorioParams): Promise<{ data: ConsultorioDirectorioItem[]; total: number }>

  listarServiciosPublicos(consultorioId: string, params: ServiciosParams): Promise<{ data: ServicioPublicoRaw[]; total: number }>
  setVisibilidadServicio(servicioId: string, consultorioId: string, visiblePublico: boolean, mostrarPrecio?: boolean): Promise<void>
  setVisibilidadMedico(medicoId: string, consultorioId: string, visiblePublico: boolean): Promise<void>
  getServicio(servicioId: string, consultorioId: string): Promise<ServicioPublicoRaw | null>

  getMedicoHorarios(medicoId: string, consultorioId: string): Promise<HorarioAtencion[]>
  getCitasEnRango(medicoId: string, desde: Date, hasta: Date): Promise<CitaRaw[]>

  crearCitaOnline(data: CrearCitaOnlineInput): Promise<CitaRaw>
  getCitaById(citaId: string): Promise<CitaRaw | null>
  cancelarCitaOnline(citaId: string, consumerUserId: string): Promise<CitaRaw>
  listarMisCitas(consumerUserId: string, params: MisCitasParams): Promise<{ data: CitaRaw[]; total: number }>
  confirmarCitaOnline(citaId: string, consultorioId: string): Promise<CitaRaw>
  rechazarCitaOnline(citaId: string, consultorioId: string, motivo?: string): Promise<CitaRaw>
  listarCitasOnline(consultorioId: string, params: CitasOnlineParams): Promise<{ data: CitaRaw[]; total: number }>
}
