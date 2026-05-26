import type { IPublicacionRepository } from "../../domain/ports/IPublicacionRepository.js"
import type { ISocialNotificador } from "../../domain/ports/ISocialNotificador.js"
import { PublicacionNoEncontrada, ComentarioNoEncontrado, ComentarioEsRespuesta } from "../../domain/social.errors.js"

export class ComentarPublicacionUseCase {
  constructor(
    private readonly repo: IPublicacionRepository,
    private readonly notificador: ISocialNotificador,
  ) {}

  async ejecutar(publicacionId: string, userId: string, contenido: string, padreId?: string) {
    const raw = await this.repo.findById(publicacionId)
    if (!raw) throw new PublicacionNoEncontrada(publicacionId)

    if (padreId) {
      const padre = await this.repo.findComentarioPublicacion(padreId)
      if (!padre) throw new ComentarioNoEncontrado(padreId)
      if (padre.padreId !== null) throw new ComentarioEsRespuesta()
    }

    const comentario = await this.repo.crearComentarioPublicacion({ publicacionId, userId, contenido, padreId })

    this.notificador.comentarioCreado(raw.tenantId, {
      elementoTipo: "PUBLICACION",
      elementoId: publicacionId,
      tenantId: raw.tenantId,
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
