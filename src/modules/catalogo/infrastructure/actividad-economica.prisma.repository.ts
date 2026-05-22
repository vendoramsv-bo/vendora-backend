import type { IActividadEconomicaRepository, ActividadCreateDTO } from "../domain/ports/IActividadEconomicaRepository.js"
import { ActividadEconomicaEntity, type ActividadEconomicaRaw } from "../domain/actividad-economica.entity.js"
import { withAudit } from "../../../core/prisma-scoped.js"

export class ActividadEconomicaPrismaRepository implements IActividadEconomicaRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  async listar(tenantId: string): Promise<ActividadEconomicaEntity[]> {
    const rows = await this.db.actividadEconomica.findMany({
      where: { tenantId },
      include: { claActividadEconomica: true },
      orderBy: { createdAt: "desc" },
    })
    return rows.map((r: ActividadEconomicaRaw) => ActividadEconomicaEntity.fromPrisma(r))
  }

  async crear(data: ActividadCreateDTO, tenantId: string, userId: string): Promise<ActividadEconomicaEntity> {
    const raw = await this.db.actividadEconomica.create({
      data: withAudit({ ...data, tenantId }, userId),
      include: { claActividadEconomica: true },
    })
    return ActividadEconomicaEntity.fromPrisma(raw as ActividadEconomicaRaw)
  }

  async obtener(id: string, tenantId: string): Promise<ActividadEconomicaEntity | null> {
    const raw = await this.db.actividadEconomica.findFirst({
      where: { id, tenantId },
      include: { claActividadEconomica: true },
    })
    if (!raw) return null
    return ActividadEconomicaEntity.fromPrisma(raw as ActividadEconomicaRaw)
  }

  async desactivar(id: string, userId: string): Promise<void> {
    await this.db.actividadEconomica.update({
      where: { id },
      data: { estado: "INACTIVO", updatedById: userId },
    })
  }

  async tieneUsoActivo(id: string): Promise<boolean> {
    const [categorias, productos] = await Promise.all([
      this.db.categoria.count({ where: { actividadId: id, estado: "ACTIVO" } }),
      this.db.producto.count({ where: { actividadId: id, estado: "ACTIVO" } }),
    ])
    return categorias > 0 || productos > 0
  }

  async listarClasificadores(): Promise<Array<{ id: string; nombre: string; descripcion?: string | null }>> {
    return this.db.claActividadEconomica.findMany({ orderBy: { nombre: "asc" } })
  }
}
