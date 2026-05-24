import type { VacunacionEntity } from "../vacunacion.entity.js"
import type { QueryParams } from "../../../../core/query-params.js"

export interface VacunacionCreateDTO {
  vacuna: string
  dosis?: string
  fechaAplicacion?: Date
  proximaDosis?: Date
  medicoId?: string
  lote?: string
}

export interface IVacunacionRepository {
  crear(pacienteId: string, data: VacunacionCreateDTO): Promise<VacunacionEntity>
  listar(pacienteId: string, params: QueryParams): Promise<VacunacionEntity[]>
  obtenerPorId(id: string): Promise<VacunacionEntity | null>
  eliminar(id: string, pacienteId: string): Promise<void>
}
