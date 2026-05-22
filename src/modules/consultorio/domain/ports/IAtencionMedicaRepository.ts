import type { AtencionMedicaEntity } from "../atencion-medica.entity.js"
import type { QueryParams } from "../../../../core/query-params.js"
import type { ListResult } from "./IMedicoRepository.js"

export interface DetalleDTO {
  servicioId: string
  tipoTratamiento: string
  descripcionTratamiento?: string
  referenciaClin?: string
  cantidad?: number
  precioUnitario?: number
  descuento?: number
  nota?: string
}

export interface AtencionCreateDTO {
  pacienteId: string
  medicoId: string
  citaId?: string
  tipoPago?: string
  observaciones?: string
  detalle: DetalleDTO[]
}

export interface PagoDTO {
  monto: number
  metodo: string
  referencia?: string
  nota?: string
  registradoPor?: string
}

export interface IAtencionMedicaRepository {
  crear(data: AtencionCreateDTO, consultorioId: string, userId: string): Promise<AtencionMedicaEntity>
  obtener(id: string, consultorioId: string): Promise<AtencionMedicaEntity>
  listar(consultorioId: string, params: QueryParams): Promise<ListResult<AtencionMedicaEntity>>
  registrarPago(atencionId: string, data: PagoDTO, userId: string): Promise<AtencionMedicaEntity>
  actualizarEstado(id: string, estado: string, estadoPago: string, userId: string): Promise<AtencionMedicaEntity>
}
