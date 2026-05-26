import type { IProductoSocialRepository } from "../../domain/ports/IProductoSocialRepository.js"
import { ProductoComentarioEntity } from "../../domain/producto-comentario.entity.js"
import { ComentarioNoEncontrado } from "../../domain/social.errors.js"

export class EditarComentarioProductoUseCase {
  constructor(private readonly repo: IProductoSocialRepository) {}

  async ejecutar(comentarioId: string, userId: string, contenido: string, rol?: string) {
    const raw = await this.repo.findComentarioProducto(comentarioId)
    if (!raw) throw new ComentarioNoEncontrado(comentarioId)

    const comentario = ProductoComentarioEntity.fromPrisma(raw)
    comentario.puedeEditarOEliminar(userId, rol)

    return this.repo.editarComentarioProducto(comentarioId, contenido)
  }
}
