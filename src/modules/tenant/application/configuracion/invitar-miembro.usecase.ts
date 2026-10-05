import type { IMiembrosRepository, InvitacionDetalle } from "../../domain/ports/IMiembrosRepository.js"
import type { INotificadorInvitacion } from "../../domain/ports/INotificadorInvitacion.js"
import { rolesAsignables, normalizarRol } from "../../domain/roles-por-vertical.js"
import {
  InvitacionPendienteError,
  RolNoAsignableError,
  SoloPropietarioError,
  YaEsMiembroError,
} from "../../domain/tenant.errors.js"

const DIAS_VIGENCIA = 7

export class InvitarMiembroUseCase {
  constructor(
    private readonly repo: IMiembrosRepository,
    private readonly correo: INotificadorInvitacion,
  ) {}

  async ejecutar(input: { tenantId: string; actorUserId: string; email: string; rol: string }): Promise<InvitacionDetalle> {
    const { tenantId, actorUserId } = input
    const email = input.email.trim().toLowerCase()
    const rol = normalizarRol(input.rol)

    const validos = rolesAsignables(await this.repo.verticalesActivas(tenantId))
    if (!validos.includes(rol)) throw new RolNoAsignableError(rol, validos)

    if (rol === "PROPIETARIO") {
      const actorRol = await this.repo.rolDeUsuario(tenantId, actorUserId)
      if (normalizarRol(actorRol ?? "") !== "PROPIETARIO") throw new SoloPropietarioError()
    }

    if (await this.repo.existeMiembroConEmail(tenantId, email)) throw new YaEsMiembroError(email)
    const ahora = new Date()
    if (await this.repo.existeInvitacionPendiente(tenantId, email, ahora)) throw new InvitacionPendienteError(email)

    const invitacion = await this.repo.crearInvitacion({
      tenantId,
      email,
      rol,
      inviterId: actorUserId,
      expiresAt: new Date(ahora.getTime() + DIAS_VIGENCIA * 86_400_000),
    })

    await this.correo.enviarInvitacion({
      email,
      invitacionId: invitacion.id,
      nombreNegocio: await this.repo.nombreNegocio(tenantId),
    })

    return invitacion
  }
}
