import type { IUnidadMedidaRepository, UnidadCreateDTO, UnidadUpdateDTO } from "../domain/ports/IUnidadMedidaRepository.js"
import { UnidadMedidaEntity, type UnidadMedidaRaw } from "../domain/unidad-medida.entity.js"
import { withAudit } from "../../../core/prisma-scoped.js"

export class UnidadMedidaPrismaRepository implements IUnidadMedidaRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  async listar(tenantId: string): Promise<UnidadMedidaEntity[]> {
    const rows = await this.db.unidadMedida.findMany({
      where: { tenantId },
      orderBy: { unidad: "asc" },
    })
    return rows.map((r: UnidadMedidaRaw) => UnidadMedidaEntity.fromPrisma(r))
  }

  async crear(data: UnidadCreateDTO, tenantId: string, userId: string): Promise<UnidadMedidaEntity> {
    const raw = await this.db.unidadMedida.create({
      data: withAudit({ ...data, tenantId }, userId),
    })
    return UnidadMedidaEntity.fromPrisma(raw as UnidadMedidaRaw)
  }

  async obtener(id: string, tenantId: string): Promise<UnidadMedidaEntity | null> {
    const raw = await this.db.unidadMedida.findFirst({ where: { id, tenantId } })
    if (!raw) return null
    return UnidadMedidaEntity.fromPrisma(raw as UnidadMedidaRaw)
  }

  async actualizar(id: string, data: UnidadUpdateDTO, userId: string): Promise<UnidadMedidaEntity> {
    const raw = await this.db.unidadMedida.update({
      where: { id },
      data: { ...data, updatedById: userId },
    })
    return UnidadMedidaEntity.fromPrisma(raw as UnidadMedidaRaw)
  }

  async listarClasificadores(): Promise<Array<{ id: string; nombre: string; sigla: string }>> {
    return this.db.claUnidadMedida.findMany({ orderBy: { nombre: "asc" } })
  }
}
