import type { ITiendaSocialRepository } from "../../domain/ports/ITiendaSocialRepository.js"
import type { ISocialNotificador } from "../../domain/ports/ISocialNotificador.js"
import { ComentarioNoEncontrado, ComentarioEsRespuesta } from "../../domain/social.errors.js"

export class ComentarTiendaUseCase {
  constructor(
    private readonly repo: ITiendaSocialRepository,
    private readonly notificador: ISocialNotificador,
  ) {}

  async ejecutar(slug: string, userId: string, contenido: string, padreId?: string) {
    const tiendaId = await this.repo.resolveTiendaId(slug)

    if (padreId) {
      const padre = await this.repo.findComentarioTienda(padreId)
      if (!padre) throw new ComentarioNoEncontrado(padreId)
      if (padre.padreId !== null) throw new ComentarioEsRespuesta()
    }

    const comentario = await this.repo.crearComentarioTienda({ tiendaId, userId, contenido, padreId })

    this.notificador.comentarioCreado(tiendaId, {
      elementoTipo: "TIENDA",
      elementoId: tiendaId,
      tenantId: tiendaId,
      comentarioId: comentario.id,
      padreId,
      userId,
      contenido,
      esRespuesta: !!padreId,
      fecha: new Date().toISOString(),
    })

    return comentario
  }
}
