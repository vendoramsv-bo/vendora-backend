import type { ITiendaSocialRepository } from "../../domain/ports/ITiendaSocialRepository.js"
import { TiendaComentarioEntity } from "../../domain/tienda-comentario.entity.js"
import { ComentarioNoEncontrado } from "../../domain/social.errors.js"

export class EditarComentarioTiendaUseCase {
  constructor(private readonly repo: ITiendaSocialRepository) {}

  async ejecutar(comentarioId: string, userId: string, contenido: string, rol?: string) {
    const raw = await this.repo.findComentarioTienda(comentarioId)
    if (!raw) throw new ComentarioNoEncontrado(comentarioId)

    TiendaComentarioEntity.fromPrisma(raw).puedeEditarOEliminar(userId, rol)
    return this.repo.editarComentarioTienda(comentarioId, contenido)
  }
}
