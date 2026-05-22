import type { ITenantRepository, MiembroDTO, InvitacionDTO, ListResult } from "../domain/ports/ITenantRepository.js"
import { TenantEntity } from "../domain/tenant.entity.js"
import { TenantNoEncontrado } from "../domain/tenant.errors.js"
import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs } from "../../../core/query-params.js"
export class TenantPrismaRepository implements ITenantRepository {
  // Constructor acepta PrismaClient estándar o ScopedPrismaClient —
  // garantiza Artículo III.3 desde el inicio (injectable desde el principio).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  private get client() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.db as any
  }

  async obtener(id: string): Promise<TenantEntity> {
    const raw = await this.client.tenant.findUnique({ where: { id } })
    if (!raw) throw new TenantNoEncontrado(id)
    return TenantEntity.fromPrisma({ ...raw, plan: String(raw.plan), estado: String(raw.estado) })
  }

  async listarPorUsuario(
    userId: string,
    params: QueryParams,
  ): Promise<ListResult<{ tenant: TenantEntity; miRol: string }>> {
    const { take, skip, orderBy } = toPrismaArgs(params)

    const [membresías, total] = await Promise.all([
      this.client.tenantMember.findMany({
        where: { userId },
        take,
        skip,
        orderBy,
        include: { tenant: true },
      }),
      this.client.tenantMember.count({ where: { userId } }),
    ])

    return {
      data: membresías.map((m: { role: string; tenant: TenantEntity }) => ({
        tenant: TenantEntity.fromPrisma({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(m.tenant as any),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          plan: String((m.tenant as any).plan),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          estado: String((m.tenant as any).estado),
        }),
        miRol: m.role === "owner" ? "PROPIETARIO" : m.role,
      })),
      total,
    }
  }

  async listarMiembros(tenantId: string, params: QueryParams): Promise<ListResult<MiembroDTO>> {
    const prismaArgs = toPrismaArgs(params, ["role"])
    const whereBase = { organizationId: tenantId }

    const [miembros, total] = await Promise.all([
      this.client.tenantMember.findMany({
        where: { ...whereBase, ...prismaArgs.where },
        take: prismaArgs.take,
        skip: prismaArgs.skip,
        orderBy: prismaArgs.orderBy,
        include: { user: { select: { name: true, email: true, image: true } } },
      }),
      this.client.tenantMember.count({ where: whereBase }),
    ])

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: miembros.map((m: any) => ({
        id: m.id,
        userId: m.userId,
        role: m.role === "owner" ? "PROPIETARIO" : m.role,
        estado: String(m.estado),
        createdAt: m.createdAt,
        usuario: { name: m.user.name, email: m.user.email, image: m.user.image },
      })),
      total,
    }
  }

  async listarInvitaciones(tenantId: string, params: QueryParams): Promise<ListResult<InvitacionDTO>> {
    const prismaArgs = toPrismaArgs(params, ["status", "createdAt"])
    const whereBase = { organizationId: tenantId }

    const [invitaciones, total] = await Promise.all([
      this.client.invitacion.findMany({
        where: { ...whereBase, ...prismaArgs.where },
        take: prismaArgs.take,
        skip: prismaArgs.skip,
        orderBy: prismaArgs.orderBy,
        include: { inviter: { select: { name: true, email: true } } },
      }),
      this.client.invitacion.count({ where: whereBase }),
    ])

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: invitaciones.map((i: any) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        status: i.status,
        expiresAt: i.expiresAt,
        createdAt: i.createdAt,
        invitador: { name: i.inviter.name, email: i.inviter.email },
      })),
      total,
    }
  }
}
