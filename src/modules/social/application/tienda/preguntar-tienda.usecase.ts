import type { ITiendaSocialRepository } from "../../domain/ports/ITiendaSocialRepository.js"
import type { ISocialNotificador } from "../../domain/ports/ISocialNotificador.js"

export class PreguntarTiendaUseCase {
  constructor(
    private readonly repo: ITiendaSocialRepository,
    private readonly notificador?: ISocialNotificador,
  ) {}

  async ejecutar(slug: string, userId: string, pregunta: string) {
    const { tiendaId, tenantId } = await this.repo.resolveTiendaInfo(slug)
    const result = await this.repo.crearPreguntaTienda({ tiendaId, userId, pregunta })
    this.notificador?.preguntaTiendaNueva(tenantId, {
      tiendaId,
      preguntaId: result.id,
      userId,
      tenantId,
      fecha: new Date().toISOString(),
    })
    return result
  }
}
