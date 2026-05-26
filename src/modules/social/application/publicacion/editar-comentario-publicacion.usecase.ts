import type { IPublicacionRepository } from "../../domain/ports/IPublicacionRepository.js"
import { PublicacionComentarioEntity } from "../../domain/publicacion-comentario.entity.js"
import { ComentarioNoEncontrado } from "../../domain/social.errors.js"

export class EditarComentarioPublicacionUseCase {
  constructor(private readonly repo: IPublicacionRepository) {}

  async ejecutar(comentarioId: string, userId: string, contenido: string, rol?: string) {
    const raw = await this.repo.findComentarioPublicacion(comentarioId)
    if (!raw) throw new ComentarioNoEncontrado(comentarioId)

    PublicacionComentarioEntity.fromPrisma(raw).puedeEditarOEliminar(userId, rol)
    return this.repo.editarComentarioPublicacion(comentarioId, contenido)
  }
}
