import type { IProductoSocialRepository } from "../../domain/ports/IProductoSocialRepository.js"
import type { ISocialNotificador } from "../../domain/ports/ISocialNotificador.js"
import { ProductoNoEncontrado } from "../../domain/social.errors.js"

export class ReaccionarProductoUseCase {
  constructor(
    private readonly repo: IProductoSocialRepository,
    private readonly notificador: ISocialNotificador,
  ) {}

  async ejecutar(productoId: string, userId: string, emoji: string) {
    const tenantId = await this.repo.findProductoTenantId(productoId)
    if (!tenantId) throw new ProductoNoEncontrado(productoId)

    const { reaccion, removed } = await this.repo.toggleReaccionProducto(productoId, tenantId, userId, emoji)

    this.notificador.reaccionCreada(tenantId, {
      elementoTipo: "PRODUCTO",
      elementoId: productoId,
      tenantId,
      userId,
      emoji,
      removed,
      fecha: new Date().toISOString(),
    })

    if (removed) return { removed: true }
    return reaccion
  }
}
