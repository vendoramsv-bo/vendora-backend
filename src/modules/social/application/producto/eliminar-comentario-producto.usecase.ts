import type { IProductoSocialRepository } from "../../domain/ports/IProductoSocialRepository.js"
import { ProductoComentarioEntity } from "../../domain/producto-comentario.entity.js"
import { ComentarioNoEncontrado } from "../../domain/social.errors.js"

export class EliminarComentarioProductoUseCase {
  constructor(private readonly repo: IProductoSocialRepository) {}

  async ejecutar(comentarioId: string, userId: string, rol?: string): Promise<{ deleted: boolean }> {
    const raw = await this.repo.findComentarioProducto(comentarioId)
    if (!raw) throw new ComentarioNoEncontrado(comentarioId)

    const comentario = ProductoComentarioEntity.fromPrisma(raw)
    comentario.puedeEditarOEliminar(userId, rol)

    if (!comentario.esRespuesta()) {
      await this.repo.deleteRespuestasProducto(comentarioId)
    }
    await this.repo.deleteComentarioProducto(comentarioId)

    return { deleted: true }
  }
}
