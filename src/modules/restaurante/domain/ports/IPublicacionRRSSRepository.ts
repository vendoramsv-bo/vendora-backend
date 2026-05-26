import type { PublicacionRRSSEntity } from "../publicacion-rrss.entity.js"

export interface PublicacionQueryParams {
  redSocial?: string
  estado?: string
  page?: number
  limit?: number
}

export interface PublicacionCreateData {
  restauranteId: string
  menuId: string
  redSocial: string
  fechaProgramada: Date
  creadoPorId?: string | null
}

export interface PublicacionUpdateData {
  estado?: string
  urlPublicacion?: string | null
  urlImagenGenerada?: string | null
  fechaPublicada?: Date | null
  alcance?: number | null
  reacciones?: number | null
  comentarios?: number | null
  errorMensaje?: string | null
}

export interface IPublicacionRRSSRepository {
  findAllByRestaurante(restauranteId: string, params?: PublicacionQueryParams): Promise<PublicacionRRSSEntity[]>
  findById(id: string, restauranteId?: string): Promise<PublicacionRRSSEntity | null>
  create(data: PublicacionCreateData, userId: string): Promise<PublicacionRRSSEntity>
  update(id: string, data: PublicacionUpdateData, userId: string): Promise<PublicacionRRSSEntity>
  findProgramadasPendientes(): Promise<PublicacionRRSSEntity[]>
}
