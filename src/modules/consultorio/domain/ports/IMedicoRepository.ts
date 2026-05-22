import type { MedicoEntity, MedicoRaw, HorarioAtencionRaw } from "../medico.entity.js"
import type { QueryParams } from "../../../../core/query-params.js"

export interface ListResult<T> {
  data: T[]
  total: number
}

export interface MedicoCreateDTO {
  memberId: string
  consultorioId: string
  especialidad: string
  nroRegistro?: string
  bio?: string
  fotoUrl?: string
}

export interface HorarioCreateDTO {
  diaSemana: number
  horaInicio: string
  horaFin: string
}

export interface IMedicoRepository {
  crear(data: MedicoCreateDTO, userId: string): Promise<MedicoEntity>
  obtener(id: string, consultorioId: string): Promise<MedicoEntity>
  listar(consultorioId: string, params: QueryParams): Promise<ListResult<MedicoEntity>>
  actualizar(id: string, data: Partial<MedicoRaw>, userId: string): Promise<MedicoEntity>
  buscarPorMiembro(memberId: string, consultorioId: string): Promise<MedicoEntity | null>
  agregarHorario(medicoId: string, data: HorarioCreateDTO): Promise<HorarioAtencionRaw>
  eliminarHorario(horarioId: string, medicoId: string): Promise<void>
  listarHorarios(medicoId: string): Promise<HorarioAtencionRaw[]>
  tieneCitasPendientes(id: string): Promise<boolean>
}
