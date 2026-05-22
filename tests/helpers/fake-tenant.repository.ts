import type { ITenantRepository, MiembroDTO, InvitacionDTO, ListResult } from "../../src/modules/tenant/domain/ports/ITenantRepository.js"
import { TenantEntity, type TenantRaw } from "../../src/modules/tenant/domain/tenant.entity.js"
import { TenantNoEncontrado } from "../../src/modules/tenant/domain/tenant.errors.js"
import type { QueryParams } from "../../src/core/query-params.js"

// T051 — Implementación en memoria de ITenantRepository para tests unitarios

export class FakeTenantRepository implements ITenantRepository {
  private tenants = new Map<string, TenantRaw>()
  private miembros: Array<{ tenantId: string } & MiembroDTO> = []
  private invitaciones: Array<{ tenantId: string } & InvitacionDTO> = []

  agregarTenant(raw: TenantRaw): TenantEntity {
    this.tenants.set(raw.id, raw)
    return TenantEntity.fromPrisma(raw)
  }

  agregarMiembro(tenantId: string, miembro: MiembroDTO): void {
    this.miembros.push({ tenantId, ...miembro })
  }

  agregarInvitacion(tenantId: string, invitacion: InvitacionDTO): void {
    this.invitaciones.push({ tenantId, ...invitacion })
  }

  async obtener(id: string): Promise<TenantEntity> {
    const raw = this.tenants.get(id)
    if (!raw) throw new TenantNoEncontrado(id)
    return TenantEntity.fromPrisma(raw)
  }

  async listarPorUsuario(
    userId: string,
    params: QueryParams,
  ): Promise<ListResult<{ tenant: TenantEntity; miRol: string }>> {
    const { take, skip } = params
    const membresíasUsuario = this.miembros.filter((m) => m.userId === userId)
    const paginados = membresíasUsuario.slice(skip, skip + take)

    return {
      data: paginados.map((m) => ({
        tenant: TenantEntity.fromPrisma(this.tenants.get(m.tenantId)!),
        miRol: m.role,
      })),
      total: membresíasUsuario.length,
    }
  }

  async listarMiembros(tenantId: string, params: QueryParams): Promise<ListResult<MiembroDTO>> {
    const { take, skip } = params
    const tenantMiembros = this.miembros.filter((m) => m.tenantId === tenantId)
    return {
      data: tenantMiembros.slice(skip, skip + take).map(({ tenantId: _tid, ...m }) => m),
      total: tenantMiembros.length,
    }
  }

  async listarInvitaciones(tenantId: string, params: QueryParams): Promise<ListResult<InvitacionDTO>> {
    const { take, skip } = params
    const tenantInvitaciones = this.invitaciones.filter((i) => i.tenantId === tenantId)
    return {
      data: tenantInvitaciones.slice(skip, skip + take).map(({ tenantId: _tid, ...i }) => i),
      total: tenantInvitaciones.length,
    }
  }
}
