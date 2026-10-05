import type {
  IMiembrosRepository,
  MiembroResumen,
  MiembroDetalle,
  InvitacionDetalle,
} from "../../../../../src/modules/tenant/domain/ports/IMiembrosRepository.js"
import type { INotificadorInvitacion } from "../../../../../src/modules/tenant/domain/ports/INotificadorInvitacion.js"
import type { TipoVertical } from "../../../../../src/modules/tenant/domain/capacidades.js"
import type { ITenantNotificador } from "../../../../../src/modules/tenant/domain/ports/ITenantNotificador.js"

type MiembroFake = MiembroResumen & { tenantId: string; email: string }
type InvitacionFake = InvitacionDetalle & { tenantId: string; status: string }

export class FakeMiembrosRepository implements IMiembrosRepository {
  miembros: MiembroFake[] = []
  invitaciones: InvitacionFake[] = []
  verticales: TipoVertical[] = ["tienda"]
  sesionesCerradas: Array<{ tenantId: string; userId: string }> = []

  async buscarMiembro(tenantId: string, miembroId: string) {
    return this.miembros.find((m) => m.tenantId === tenantId && m.id === miembroId) ?? null
  }

  async rolDeUsuario(tenantId: string, userId: string) {
    return this.miembros.find((m) => m.tenantId === tenantId && m.userId === userId)?.rol ?? null
  }

  async contarPropietarios(tenantId: string) {
    return this.miembros.filter((m) => m.tenantId === tenantId && ["PROPIETARIO", "owner"].includes(m.rol)).length
  }

  async verticalesActivas() {
    return this.verticales
  }

  async existeMiembroConEmail(tenantId: string, email: string) {
    return this.miembros.some((m) => m.tenantId === tenantId && m.email === email)
  }

  async existeInvitacionPendiente(tenantId: string, email: string, ahora: Date) {
    return this.invitaciones.some(
      (i) => i.tenantId === tenantId && i.email === email && i.status === "pending" && new Date(i.expiresAt) > ahora,
    )
  }

  async crearInvitacion(d: { tenantId: string; email: string; rol: string; inviterId: string; expiresAt: Date }) {
    const inv: InvitacionFake = {
      id: `inv-${this.invitaciones.length + 1}`,
      tenantId: d.tenantId,
      email: d.email,
      rol: d.rol,
      status: "pending",
      expiresAt: d.expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    }
    this.invitaciones.push(inv)
    return { id: inv.id, email: inv.email, rol: inv.rol, expiresAt: inv.expiresAt, createdAt: inv.createdAt }
  }

  async buscarInvitacionPendiente(tenantId: string, id: string) {
    const i = this.invitaciones.find((x) => x.tenantId === tenantId && x.id === id && x.status === "pending")
    return i ? { id: i.id } : null
  }

  async cancelarInvitacion(tenantId: string, id: string) {
    const i = this.invitaciones.find((x) => x.tenantId === tenantId && x.id === id)
    if (i) i.status = "canceled"
  }

  async cambiarRol(tenantId: string, miembroId: string, rol: string): Promise<MiembroDetalle> {
    const m = this.miembros.find((x) => x.tenantId === tenantId && x.id === miembroId)!
    m.rol = rol
    return { id: m.id, userId: m.userId, nombreCompleto: "x", email: m.email, rol, estado: "activo", joinedAt: new Date().toISOString() }
  }

  async quitarMiembroYCerrarSesiones(tenantId: string, miembroId: string, userId: string) {
    this.miembros = this.miembros.filter((m) => !(m.tenantId === tenantId && m.id === miembroId))
    this.sesionesCerradas.push({ tenantId, userId })
  }

  async nombreNegocio() {
    return "Negocio de prueba"
  }
}

export class FakeNotificadorInvitacion implements INotificadorInvitacion {
  enviados: Array<{ email: string; invitacionId: string; nombreNegocio: string }> = []
  async enviarInvitacion(d: { email: string; invitacionId: string; nombreNegocio: string }) {
    this.enviados.push(d)
  }
}

export class FakeTenantNotificador implements ITenantNotificador {
  removidos: string[] = []
  tenantActualizado() {}
  tenantEliminado() {}
  miembroUnido() {}
  miembroRemovido(_tenantId: string, userId: string) {
    this.removidos.push(userId)
  }
}
