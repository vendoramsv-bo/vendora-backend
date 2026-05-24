import type { QueryParams } from "../../../../core/query-params.js"

export interface ProveedorData {
  id: string
  tenantId: string
  claProveedorId: string | null
  nombre: string
  direccion: string | null
  telefono: string | null
  nit: string | null
  departamento: string | null
  productosOfrece: string | null
  sitioWeb: string | null
  estado: string
  createdAt: Date
  updatedAt?: Date | null
  createdById: string | null
  updatedById: string | null
}

export interface CrearProveedorDTO {
  tenantId: string
  nombre: string
  nit?: string | null
  telefono?: string | null
  direccion?: string | null
  departamento?: string | null
  sitioWeb?: string | null
  productosOfrece?: string | null
  createdById?: string | null
}

export interface ActualizarProveedorDTO {
  nombre?: string
  nit?: string | null
  telefono?: string | null
  direccion?: string | null
  departamento?: string | null
  sitioWeb?: string | null
  productosOfrece?: string | null
  updatedById?: string | null
}

export interface IProveedorRepository {
  crear(dto: CrearProveedorDTO): Promise<ProveedorData>
  obtenerPorId(id: string, tenantId: string): Promise<ProveedorData | null>
  obtenerPorNombre(nombre: string, tenantId: string): Promise<ProveedorData | null>
  obtenerPorNit(nit: string, tenantId: string): Promise<ProveedorData | null>
  actualizar(id: string, tenantId: string, dto: ActualizarProveedorDTO): Promise<ProveedorData>
  cambiarEstado(id: string, tenantId: string, estado: string, updatedById?: string | null): Promise<ProveedorData>
  eliminar(id: string, tenantId: string): Promise<void>
  tieneCompras(id: string, tenantId: string): Promise<boolean>
  listar(tenantId: string, params: QueryParams, estado?: string): Promise<{ data: ProveedorData[]; total: number }>
}
