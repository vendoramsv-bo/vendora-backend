import type {
  IMiembrosRepository,
  MiembroDetalle,
  InvitacionDetalle,
} from "../domain/ports/IMiembrosRepository.js"
import type { TipoVertical } from "../domain/capacidades.js"
import { normalizarRol } from "../domain/roles-por-vertical.js"

const ROLES_PROPIETARIO = ["owner", "PROPIETARIO"]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any

export class MiembrosPrismaRepository implements IMiembrosRepository {
  constructor(private readonly db: Db) {}

  async buscarMiembro(tenantId: string, miembroId: string) {
    const m = await this.db.tenantMember.findFirst({
      where: { id: miembroId, organizationId: tenantId },
      select: { id: true, userId: true, role: true },
    })
    return m ? { id: m.id, userId: m.userId, rol: m.role } : null
  }

  async rolDeUsuario(tenantId: string, userId: string) {
    const m = await this.db.tenantMember.findUnique({
      where: { organizationId_userId: { organizationId: tenantId, userId } },
      select: { role: true },
    })
    return m?.role ?? null
  }

  async contarPropietarios(tenantId: string) {
    return this.db.tenantMember.count({ where: { organizationId: tenantId, role: { in: ROLES_PROPIETARIO } } })
  }

  async verticalesActivas(tenantId: string): Promise<TipoVertical[]> {
    const t = await this.db.tenant.findUnique({
      where: { id: tenantId },
      select: { esTienda: true, esConsultorio: true, esRestaurante: true },
    })
    const v: TipoVertical[] = []
    if (t?.esTienda) v.push("tienda")
    if (t?.esConsultorio) v.push("consultorio")
    if (t?.esRestaurante) v.push("restaurante")
    return v
  }

  async existeMiembroConEmail(tenantId: string, email: string) {
    const n = await this.db.tenantMember.count({
      where: { organizationId: tenantId, user: { email: { equals: email, mode: "insensitive" } } },
    })
    return n > 0
  }

  async existeInvitacionPendiente(tenantId: string, email: string, ahora: Date) {
    const n = await this.db.invitacion.count({
      where: {
        organizationId: tenantId,
        email: { equals: email, mode: "insensitive" },
        status: "pending",
        expiresAt: { gt: ahora },
      },
    })
    return n > 0
  }

  async crearInvitacion(d: { tenantId: string; email: string; rol: string; inviterId: string; expiresAt: Date }): Promise<InvitacionDetalle> {
    const i = await this.db.invitacion.create({
      data: {
        organizationId: d.tenantId,
        email: d.email,
        role: d.rol,
        status: "pending",
        expiresAt: d.expiresAt,
        inviterId: d.inviterId,
      },
    })
    return aInvitacion(i)
  }

  async buscarInvitacionPendiente(tenantId: string, id: string) {
    return this.db.invitacion.findFirst({ where: { id, organizationId: tenantId, status: "pending" }, select: { id: true } })
  }

  async cancelarInvitacion(tenantId: string, id: string) {
    await this.db.invitacion.updateMany({ where: { id, organizationId: tenantId }, data: { status: "canceled" } })
  }

  async cambiarRol(tenantId: string, miembroId: string, rol: string): Promise<MiembroDetalle> {
    await this.db.tenantMember.updateMany({ where: { id: miembroId, organizationId: tenantId }, data: { role: rol } })
    const m = await this.db.tenantMember.findFirst({
      where: { id: miembroId, organizationId: tenantId },
      include: { user: { select: { name: true, email: true } } },
    })
    return aMiembro(m)
  }

  async quitarMiembroYCerrarSesiones(tenantId: string, miembroId: string, userId: string) {
    await this.db.$transaction([
      this.db.tenantMember.deleteMany({ where: { id: miembroId, organizationId: tenantId } }),
      this.db.session.updateMany({
        where: { userId, activeOrganizationId: tenantId },
        data: { activeOrganizationId: null },
      }),
    ])
  }

  async nombreNegocio(tenantId: string) {
    const t = await this.db.tenant.findUnique({ where: { id: tenantId }, select: { name: true } })
    return t?.name ?? "Vendora"
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function aMiembro(m: any): MiembroDetalle {
  return {
    id: m.id,
    userId: m.userId,
    nombreCompleto: m.user?.name ?? "",
    email: m.user?.email ?? "",
    rol: normalizarRol(m.role),
    estado: "activo",
    joinedAt: new Date(m.createdAt).toISOString(),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function aInvitacion(i: any): InvitacionDetalle {
  return {
    id: i.id,
    email: i.email,
    rol: normalizarRol(i.role ?? ""),
    expiresAt: new Date(i.expiresAt).toISOString(),
    createdAt: new Date(i.createdAt).toISOString(),
  }
}
