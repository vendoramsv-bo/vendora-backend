import type { ServicioMedicoEntity } from "../servicio-medico.entity.js"
import type { QueryParams } from "../../../../core/query-params.js"
import type { ListResult } from "./IMedicoRepository.js"

export interface ServicioCreateDTO {
  nombre: string
  especialidad?: string
  descripcion?: string
  duracionMin?: number
  precioBase?: number
}

export interface IServicioMedicoRepository {
  crear(data: ServicioCreateDTO, consultorioId: string, userId: string): Promise<ServicioMedicoEntity>
  obtener(id: string, consultorioId: string): Promise<ServicioMedicoEntity>
  listar(consultorioId: string, params: QueryParams): Promise<ListResult<ServicioMedicoEntity>>
  actualizar(id: string, data: Partial<ServicioCreateDTO & { estado: string }>, userId: string): Promise<ServicioMedicoEntity>
  tieneUsoActivo(id: string): Promise<boolean>
}
