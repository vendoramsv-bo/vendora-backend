import type { IConsultorioRepository } from "../domain/ports/IConsultorioRepository.js"
import { ConsultorioEntity, type ConsultorioRaw } from "../domain/consultorio.entity.js"
import { ConsultorioNoEncontrado } from "../domain/consultorio.errors.js"
import { crearPrismaScoped, withAudit } from "../../../core/prisma-scoped.js"

export class ConsultorioPrismaRepository implements IConsultorioRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get client(): any {
    return this.db
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  static crear(tenantId: string, userId: string): ConsultorioPrismaRepository {
    return new ConsultorioPrismaRepository(crearPrismaScoped(tenantId, userId))
  }

  async obtenerPorTenantId(tenantId: string): Promise<ConsultorioEntity> {
    const raw = await this.client.consultorio.findUnique({ where: { tenantId } })
    if (!raw) throw new ConsultorioNoEncontrado()
    return ConsultorioEntity.fromPrisma(raw as ConsultorioRaw)
  }

  async upsert(tenantId: string, data: Partial<ConsultorioRaw>, userId: string): Promise<ConsultorioEntity> {
    const raw = await this.client.consultorio.upsert({
      where: { tenantId },
      create: withAudit({ tenantId, especialidades: [], ...data }, userId),
      update: { ...data, updatedById: userId },
    })
    return ConsultorioEntity.fromPrisma(raw as ConsultorioRaw)
  }
}
