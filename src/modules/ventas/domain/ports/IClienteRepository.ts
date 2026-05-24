import type { QueryParams } from "../../../../core/query-params.js"

export interface ClienteData {
  id: string
  tenantId: string
  nombre: string
  email: string | null
  telefono: string | null
  direccion: string | null
  diaNacimiento: number | null
  mesNacimiento: number | null
  estado: string
  createdAt: Date
  updatedAt?: Date | null
  createdById: string | null
  updatedById: string | null
}

export interface CrearClienteDTO {
  tenantId: string
  nombre: string
  email?: string | null
  telefono?: string | null
  direccion?: string | null
  diaNacimiento?: number | null
  mesNacimiento?: number | null
  createdById?: string | null
}

export interface ActualizarClienteDTO {
  nombre?: string
  email?: string | null
  telefono?: string | null
  direccion?: string | null
  diaNacimiento?: number | null
  mesNacimiento?: number | null
  updatedById?: string | null
}

export interface IClienteRepository {
  crear(dto: CrearClienteDTO): Promise<ClienteData>
  obtenerPorId(id: string, tenantId: string): Promise<ClienteData | null>
  obtenerPorNombre(nombre: string, tenantId: string): Promise<ClienteData | null>
  obtenerPorEmail(email: string, tenantId: string): Promise<ClienteData | null>
  actualizar(id: string, tenantId: string, dto: ActualizarClienteDTO): Promise<ClienteData>
  cambiarEstado(id: string, tenantId: string, estado: string, updatedById?: string | null): Promise<ClienteData>
  listar(tenantId: string, params: QueryParams, estado?: string): Promise<{ data: ClienteData[]; total: number }>
}
