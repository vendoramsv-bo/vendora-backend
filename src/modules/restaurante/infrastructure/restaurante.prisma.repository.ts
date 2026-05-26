import type { IRestauranteRepository } from "../domain/ports/IRestauranteRepository.js"
import { RestauranteEntity, type RestauranteRaw } from "../domain/restaurante.entity.js"
import { prismaBase, withAudit } from "../../../core/prisma-scoped.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prismaBase as any

export class RestaurantePrismaRepository implements IRestauranteRepository {
  async findByTenantId(tenantId: string): Promise<RestauranteEntity | null> {
    const raw = await db.restaurante.findUnique({ where: { tenantId } })
    if (!raw) return null
    return RestauranteEntity.fromPrisma(raw as RestauranteRaw)
  }

  async upsert(tenantId: string, data: Partial<RestauranteRaw>, userId: string): Promise<RestauranteEntity> {
    const raw = await db.restaurante.upsert({
      where: { tenantId },
      create: withAudit({ tenantId, duracionPromedioMin: 60, publicacionAutomatica: false, ...data }, userId),
      update: { ...data, updatedById: userId },
    })
    return RestauranteEntity.fromPrisma(raw as RestauranteRaw)
  }
}
