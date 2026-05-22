import type { UnidadMedidaEntity } from "../unidad-medida.entity.js"

export interface UnidadCreateDTO {
  unidad: string
  sigla: string
  descripcion: string
  claUnidadId?: string
}

export interface UnidadUpdateDTO {
  unidad?: string
  sigla?: string
  descripcion?: string
  claUnidadId?: string
}

export interface IUnidadMedidaRepository {
  listar(tenantId: string): Promise<UnidadMedidaEntity[]>
  crear(data: UnidadCreateDTO, tenantId: string, userId: string): Promise<UnidadMedidaEntity>
  obtener(id: string, tenantId: string): Promise<UnidadMedidaEntity | null>
  actualizar(id: string, data: UnidadUpdateDTO, userId: string): Promise<UnidadMedidaEntity>
  listarClasificadores(): Promise<Array<{ id: string; nombre: string; sigla: string }>>
}
