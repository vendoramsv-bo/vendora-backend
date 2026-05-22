import type { ConsultorioEntity, ConsultorioRaw } from "../consultorio.entity.js"

export interface IConsultorioRepository {
  obtenerPorTenantId(tenantId: string): Promise<ConsultorioEntity>
  upsert(tenantId: string, data: Partial<ConsultorioRaw>, userId: string): Promise<ConsultorioEntity>
}
