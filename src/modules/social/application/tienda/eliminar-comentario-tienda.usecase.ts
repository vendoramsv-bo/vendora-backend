import type { ITiendaSocialRepository } from "../../domain/ports/ITiendaSocialRepository.js"
import { TiendaComentarioEntity } from "../../domain/tienda-comentario.entity.js"
import { ComentarioNoEncontrado } from "../../domain/social.errors.js"

export class EliminarComentarioTiendaUseCase {
  constructor(private readonly repo: ITiendaSocialRepository) {}

  async ejecutar(comentarioId: string, userId: string, rol?: string): Promise<{ deleted: boolean }> {
    const raw = await this.repo.findComentarioTienda(comentarioId)
    if (!raw) throw new ComentarioNoEncontrado(comentarioId)

    const comentario = TiendaComentarioEntity.fromPrisma(raw)
    comentario.puedeEditarOEliminar(userId, rol)

    if (!comentario.esRespuesta()) {
      await this.repo.deleteRespuestasTienda(comentarioId)
    }
    await this.repo.deleteComentarioTienda(comentarioId)

    return { deleted: true }
  }
}
