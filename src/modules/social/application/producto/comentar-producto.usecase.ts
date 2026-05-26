import type { IProductoSocialRepository } from "../../domain/ports/IProductoSocialRepository.js"
import type { ISocialNotificador } from "../../domain/ports/ISocialNotificador.js"
import { ProductoNoEncontrado, ComentarioNoEncontrado, ComentarioEsRespuesta } from "../../domain/social.errors.js"

export class ComentarProductoUseCase {
  constructor(
    private readonly repo: IProductoSocialRepository,
    private readonly notificador: ISocialNotificador,
  ) {}

  async ejecutar(productoId: string, userId: string, contenido: string, padreId?: string) {
    const tenantId = await this.repo.findProductoTenantId(productoId)
    if (!tenantId) throw new ProductoNoEncontrado(productoId)

    if (padreId) {
      const padre = await this.repo.findComentarioProducto(padreId)
      if (!padre) throw new ComentarioNoEncontrado(padreId)
      if (padre.padreId !== null) throw new ComentarioEsRespuesta()
    }

    const comentario = await this.repo.crearComentarioProducto({ productoId, tenantId, userId, contenido, padreId })

    this.notificador.comentarioCreado(tenantId, {
      elementoTipo: "PRODUCTO",
      elementoId: productoId,
      tenantId,
      comentarioId: comentario.id,
      padreId: padreId,
      userId,
      contenido,
      esRespuesta: !!padreId,
      fecha: new Date().toISOString(),
    })

    return comentario
  }
}
