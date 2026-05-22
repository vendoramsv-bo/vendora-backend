import type { CategoriaEntity } from "../categoria.entity.js"

export interface CategoriaCreateDTO {
  actividadId: string
  nombre: string
  descripcion?: string
  imagenUrl?: string
  padreId?: string | null
  nivel?: number
}

export interface CategoriaUpdateDTO {
  nombre?: string
  descripcion?: string
  imagenUrl?: string
}

export interface ICategoriaRepository {
  listar(tenantId: string, actividadId?: string, estado?: string): Promise<CategoriaEntity[]>
  crear(data: CategoriaCreateDTO, tenantId: string, userId: string): Promise<CategoriaEntity>
  obtener(id: string, tenantId: string): Promise<CategoriaEntity | null>
  actualizar(id: string, data: CategoriaUpdateDTO, userId: string): Promise<CategoriaEntity>
  desactivarConCascada(id: string, userId: string): Promise<void>
}
