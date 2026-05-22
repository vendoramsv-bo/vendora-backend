import type { RecetaMedicaEntity } from "../receta-medica.entity.js"
import type { QueryParams } from "../../../../core/query-params.js"
import type { ListResult } from "./IMedicoRepository.js"

export interface RecetaDetalleDTO {
  productoId?: string
  medicamento: string
  principioActivo?: string
  concentracion?: string
  presentacion?: string
  dosis: string
  frecuencia: string
  duracion: string
  via?: string
  cantidadPrescrita?: number
  indicaciones?: string
  permiteSustitucion?: boolean
}

export interface RecetaCreateDTO {
  atencionId: string
  pacienteId: string
  medicoId: string
  indicacionesGenerales?: string
  diagnosticoCie10?: string
  fechaVencimiento?: Date
  observaciones?: string
  detalle: RecetaDetalleDTO[]
}

export interface IRecetaMedicaRepository {
  crear(data: RecetaCreateDTO, consultorioId: string, userId: string): Promise<RecetaMedicaEntity>
  obtener(id: string, consultorioId: string): Promise<RecetaMedicaEntity>
  listar(consultorioId: string, params: QueryParams): Promise<ListResult<RecetaMedicaEntity>>
  anular(id: string, userId: string): Promise<RecetaMedicaEntity>
  ultimaReceta(consultorioId: string): Promise<{ numeroReceta: string } | null>
}
