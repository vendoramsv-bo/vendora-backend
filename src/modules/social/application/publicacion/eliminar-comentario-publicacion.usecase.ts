import type { IPublicacionRepository } from "../../domain/ports/IPublicacionRepository.js"
import { PublicacionComentarioEntity } from "../../domain/publicacion-comentario.entity.js"
import { ComentarioNoEncontrado } from "../../domain/social.errors.js"

export class EliminarComentarioPublicacionUseCase {
  constructor(private readonly repo: IPublicacionRepository) {}

  async ejecutar(comentarioId: string, userId: string, rol?: string): Promise<{ deleted: boolean }> {
    const raw = await this.repo.findComentarioPublicacion(comentarioId)
    if (!raw) throw new ComentarioNoEncontrado(comentarioId)

    const comentario = PublicacionComentarioEntity.fromPrisma(raw)
    comentario.puedeEditarOEliminar(userId, rol)

    if (!comentario.esRespuesta()) {
      await this.repo.deleteRespuestasPublicacion(comentarioId)
    }
    await this.repo.deleteComentarioPublicacion(comentarioId)

    return { deleted: true }
  }
}
