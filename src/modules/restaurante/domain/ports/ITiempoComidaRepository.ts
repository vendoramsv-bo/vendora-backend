import type { TiempoComidaEntity } from "../tiempo-comida.entity.js"

export interface TiempoComidaCreateDTO {
  restauranteId: string
  nombre: string
  horaInicio: string
  horaFin: string
  orden?: number
  icono?: string
}

export interface ITiempoComidaRepository {
  findAllByRestaurante(restauranteId: string, soloActivos?: boolean): Promise<TiempoComidaEntity[]>
  findById(id: string, restauranteId: string): Promise<TiempoComidaEntity | null>
  findByNombre(restauranteId: string, nombre: string): Promise<TiempoComidaEntity | null>
  create(data: TiempoComidaCreateDTO, userId: string): Promise<TiempoComidaEntity>
  update(id: string, data: Partial<TiempoComidaCreateDTO>, userId: string): Promise<TiempoComidaEntity>
  softDelete(id: string, userId: string): Promise<void>
  countMenuItemsActivos(tiempoComidaId: string): Promise<number>
}
