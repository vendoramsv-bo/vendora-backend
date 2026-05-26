import type { ITiendaSocialRepository } from "../../domain/ports/ITiendaSocialRepository.js"
import type { ISocialNotificador } from "../../domain/ports/ISocialNotificador.js"

export class ReaccionarTiendaUseCase {
  constructor(
    private readonly repo: ITiendaSocialRepository,
    private readonly notificador: ISocialNotificador,
  ) {}

  async ejecutar(slug: string, userId: string, tipo: string) {
    const tiendaId = await this.repo.resolveTiendaId(slug)
    const { reaccion, removed } = await this.repo.upsertReaccionTienda(tiendaId, userId, tipo)

    this.notificador.reaccionCreada(tiendaId, {
      elementoTipo: "TIENDA",
      elementoId: tiendaId,
      tenantId: tiendaId,
      userId,
      tipo,
      removed,
      fecha: new Date().toISOString(),
    })

    if (removed) return { removed: true }
    return reaccion
  }
}
