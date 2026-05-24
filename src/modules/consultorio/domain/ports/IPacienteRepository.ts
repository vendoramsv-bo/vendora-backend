import type { PacienteEntity, PacienteRaw } from "../paciente.entity.js"
import type { QueryParams } from "../../../../core/query-params.js"
import type { ListResult } from "./IMedicoRepository.js"

export interface PacienteCreateDTO {
  nombre: string
  apellido: string
  dni?: string
  fechaNacimiento?: string
  genero?: string
  telefono?: string
  email?: string
  direccion?: string
  tipoSangre?: string
  alergias?: string
  seguroNombre?: string
  seguroNumero?: string
  canalNotificacion?: string | null
}

export interface VacunacionDTO {
  vacuna: string
  dosis?: string
  fechaAplicacion?: string
  proximaDosis?: string
  medicoId?: string
  lote?: string
}

export interface Vacunacion {
  id: string
  pacienteId: string
  vacuna: string
  dosis: string | null
  fechaAplicacion: Date
  proximaDosis: Date | null
  medicoId: string | null
  lote: string | null
  createdAt: Date
}

export interface IPacienteRepository {
  crear(data: PacienteCreateDTO, consultorioId: string, userId: string): Promise<PacienteEntity>
  obtener(id: string, consultorioId: string): Promise<PacienteEntity>
  listar(consultorioId: string, params: QueryParams): Promise<ListResult<PacienteEntity>>
  actualizar(id: string, data: Partial<PacienteRaw>, userId: string): Promise<PacienteEntity>
  existeDni(consultorioId: string, dni: string, excludeId?: string): Promise<boolean>
  registrarVacunacion(pacienteId: string, data: VacunacionDTO): Promise<Vacunacion>
  listarVacunaciones(pacienteId: string): Promise<Vacunacion[]>
}
