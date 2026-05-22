import type { IConsultorioRepository } from "../../src/modules/consultorio/domain/ports/IConsultorioRepository.js"
import { ConsultorioEntity, type ConsultorioRaw } from "../../src/modules/consultorio/domain/consultorio.entity.js"
import { ConsultorioNoEncontrado } from "../../src/modules/consultorio/domain/consultorio.errors.js"

export class FakeConsultorioRepository implements IConsultorioRepository {
  private store = new Map<string, ConsultorioRaw>()

  seed(raw: ConsultorioRaw): ConsultorioEntity {
    this.store.set(raw.tenantId, raw)
    return ConsultorioEntity.fromPrisma(raw)
  }

  async obtenerPorTenantId(tenantId: string): Promise<ConsultorioEntity> {
    const raw = this.store.get(tenantId)
    if (!raw) throw new ConsultorioNoEncontrado(tenantId)
    return ConsultorioEntity.fromPrisma(raw)
  }

  async upsert(tenantId: string, data: Partial<ConsultorioRaw>, _userId: string): Promise<ConsultorioEntity> {
    const existing = this.store.get(tenantId) ?? {
      id: `consultorio-${tenantId}`,
      tenantId,
      especialidades: [],
      nroRegistro: null,
      estado: "ACTIVO",
      createdAt: new Date(),
      updatedAt: null,
      createdById: null,
      updatedById: null,
    }
    const updated = { ...existing, ...data }
    this.store.set(tenantId, updated)
    return ConsultorioEntity.fromPrisma(updated)
  }
}
