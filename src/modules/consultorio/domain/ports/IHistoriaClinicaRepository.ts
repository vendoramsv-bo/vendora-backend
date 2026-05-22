import type { HistoriaClinicaEntity, AdjuntoClinicoRaw } from "../historia-clinica.entity.js"
import type { QueryParams } from "../../../../core/query-params.js"
import type { ListResult } from "./IMedicoRepository.js"

export interface HistoriaCreateDTO {
  pacienteId: string
  medicoId: string
  citaId?: string
  especialidad: string
  motivoConsulta: string
  diagnostico?: string
  tratamiento?: string
  observaciones?: string
  fecha?: Date
}

export interface AdjuntoDTO {
  tipo: string
  url: string
  nombreArchivo: string
}

export type ExtensionTipo = "odontologia" | "pediatria" | "general" | "perinatal"

export interface IHistoriaClinicaRepository {
  crear(data: HistoriaCreateDTO, consultorioId: string, userId: string): Promise<HistoriaClinicaEntity>
  obtener(id: string, consultorioId: string): Promise<HistoriaClinicaEntity>
  listar(consultorioId: string, params: QueryParams): Promise<ListResult<HistoriaClinicaEntity>>
  actualizar(id: string, data: Partial<HistoriaCreateDTO>, userId: string): Promise<HistoriaClinicaEntity>
  upsertExtension(historiaId: string, tipo: ExtensionTipo, data: Record<string, unknown>): Promise<void>
  agregarAdjunto(historiaId: string, data: AdjuntoDTO): Promise<AdjuntoClinicoRaw>
  agregarControlPerinatal(perinatalId: string, data: Record<string, unknown>): Promise<void>
}
