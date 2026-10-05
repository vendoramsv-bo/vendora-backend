import type { IMiembrosRepository } from "../../domain/ports/IMiembrosRepository.js"
import type { ITenantNotificador } from "../../domain/ports/ITenantNotificador.js"
import { validarCambioDeRol } from "../../domain/roles-por-vertical.js"
import { RecursoConfiguracionNoEncontrado } from "../../domain/tenant.errors.js"

export class QuitarMiembroUseCase {
  constructor(
    private readonly repo: IMiembrosRepository,
    private readonly notificador: ITenantNotificador,
  ) {}

  async ejecutar(input: { tenantId: string; actorUserId: string; miembroId: string }): Promise<void> {
    const { tenantId, actorUserId, miembroId } = input

    const objetivo = await this.repo.buscarMiembro(tenantId, miembroId)
    if (!objetivo) throw new RecursoConfiguracionNoEncontrado("Miembro")

    validarCambioDeRol(
      (await this.repo.rolDeUsuario(tenantId, actorUserId)) ?? "",
      objetivo.rol,
      null,
      await this.repo.contarPropietarios(tenantId),
    )

    // Cerrar las sesiones es lo que corta el acceso en la request siguiente:
    // requireTenantActivo confía en session.activeOrganizationId sin mirar la membresía.
    await this.repo.quitarMiembroYCerrarSesiones(tenantId, miembroId, objetivo.userId)
    this.notificador.miembroRemovido(tenantId, objetivo.userId)
  }
}
