import type { IMiembrosRepository, MiembroDetalle } from "../../domain/ports/IMiembrosRepository.js"
import { rolesAsignables, normalizarRol, validarCambioDeRol } from "../../domain/roles-por-vertical.js"
import { RecursoConfiguracionNoEncontrado, RolNoAsignableError } from "../../domain/tenant.errors.js"

export class CambiarRolMiembroUseCase {
  constructor(private readonly repo: IMiembrosRepository) {}

  async ejecutar(input: { tenantId: string; actorUserId: string; miembroId: string; rol: string }): Promise<MiembroDetalle> {
    const { tenantId, actorUserId, miembroId } = input
    const rol = normalizarRol(input.rol)

    const objetivo = await this.repo.buscarMiembro(tenantId, miembroId)
    if (!objetivo) throw new RecursoConfiguracionNoEncontrado("Miembro")

    const validos = rolesAsignables(await this.repo.verticalesActivas(tenantId))
    if (!validos.includes(rol)) throw new RolNoAsignableError(rol, validos)

    validarCambioDeRol(
      (await this.repo.rolDeUsuario(tenantId, actorUserId)) ?? "",
      objetivo.rol,
      rol,
      await this.repo.contarPropietarios(tenantId),
    )

    return this.repo.cambiarRol(tenantId, miembroId, rol)
  }
}
