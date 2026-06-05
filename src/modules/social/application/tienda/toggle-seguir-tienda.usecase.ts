import type { ITiendaSocialRepository } from "../../domain/ports/ITiendaSocialRepository.js"
import type { ISocialNotificador } from "../../domain/ports/ISocialNotificador.js"

export class ToggleSeguirTiendaUseCase {
  constructor(
    private readonly repo: ITiendaSocialRepository,
    private readonly notificador?: ISocialNotificador,
  ) {}

  async ejecutar(slug: string, userId: string) {
    const { tiendaId, tenantId } = await this.repo.resolveTiendaInfo(slug)
    const result = await this.repo.toggleSeguirTienda(tiendaId, userId)
    if (result.siguiendo) {
      this.notificador?.seguidorTiendaNuevo(tenantId, {
        tiendaId,
        userId,
        tenantId,
        fecha: new Date().toISOString(),
      })
    }
    return result
  }
}
