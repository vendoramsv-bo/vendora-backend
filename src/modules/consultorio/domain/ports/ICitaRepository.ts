import type { CitaEntity } from "../cita.entity.js"
import type { QueryParams } from "../../../../core/query-params.js"
import type { ListResult } from "./IMedicoRepository.js"

export interface CitaCreateDTO {
  pacienteId: string
  medicoId: string
  servicioId?: string
  fechaHora: Date
  duracionMin?: number
  motivo?: string
  canalOrigen?: string
  notas?: string
}

export interface ICitaRepository {
  crear(data: CitaCreateDTO, consultorioId: string, userId: string): Promise<CitaEntity>
  obtener(id: string, consultorioId: string): Promise<CitaEntity>
  listar(consultorioId: string, params: QueryParams): Promise<ListResult<CitaEntity>>
  listarPorMedico(medicoId: string, consultorioId: string, params: QueryParams): Promise<ListResult<CitaEntity>>
  cambiarEstado(id: string, estado: string, userId: string): Promise<CitaEntity>
  verificarSolapamiento(consultorioId: string, medicoId: string, fechaHora: Date, duracionMin: number, excluirId?: string): Promise<boolean>
}
