import type { IProductoSocialRepository } from "../../domain/ports/IProductoSocialRepository.js"
import type { ISocialNotificador } from "../../domain/ports/ISocialNotificador.js"
import { ProductoNoEncontrado, PuntuacionInvalida } from "../../domain/social.errors.js"

export class ValorarProductoUseCase {
  constructor(
    private readonly repo: IProductoSocialRepository,
    private readonly notificador: ISocialNotificador,
  ) {}

  async ejecutar(productoId: string, userId: string, puntuacion: number, resena?: string) {
    if (puntuacion < 1 || puntuacion > 5) throw new PuntuacionInvalida()

    const tenantId = await this.repo.findProductoTenantId(productoId)
    if (!tenantId) throw new ProductoNoEncontrado(productoId)

    const valoracion = await this.repo.upsertValoracionProducto({ productoId, tenantId, userId, puntuacion, resena })
    const nuevoPromedio = await this.repo.getPromedioValoracionesProducto(productoId)

    this.notificador.valoracionCreada(tenantId, {
      elementoTipo: "PRODUCTO",
      elementoId: productoId,
      tenantId,
      userId,
      puntuacion,
      nuevoPromedio,
      fecha: new Date().toISOString(),
    })

    return valoracion
  }
}
