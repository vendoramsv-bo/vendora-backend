import type { ActividadEconomicaEntity } from "../actividad-economica.entity.js"

export interface ActividadCreateDTO {
  claActividadId: string
}

export interface IActividadEconomicaRepository {
  listar(tenantId: string): Promise<ActividadEconomicaEntity[]>
  crear(data: ActividadCreateDTO, tenantId: string, userId: string): Promise<ActividadEconomicaEntity>
  obtener(id: string, tenantId: string): Promise<ActividadEconomicaEntity | null>
  desactivar(id: string, userId: string): Promise<void>
  tieneUsoActivo(id: string): Promise<boolean>
  listarClasificadores(): Promise<Array<{ id: string; nombre: string; descripcion?: string | null }>>
}
