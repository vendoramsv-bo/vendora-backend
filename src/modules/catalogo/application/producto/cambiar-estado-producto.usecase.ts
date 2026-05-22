import type { IProductoRepository } from "../../domain/ports/IProductoRepository.js"
import type { ICatalogoNotificador } from "../../domain/ports/ICatalogoNotificador.js"
import { ProductoNoEncontrado } from "../../domain/catalogo.errors.js"

export class CambiarEstadoProductoUseCase {
  constructor(
    private readonly repo: IProductoRepository,
    private readonly notificador: ICatalogoNotificador,
  ) {}

  async ejecutar(id: string, estado: string, tenantId: string, userId: string): Promise<void> {
    const producto = await this.repo.obtener(id, tenantId)
    if (!producto) throw new ProductoNoEncontrado(id)

    await this.repo.cambiarEstado(id, estado, userId)

    this.notificador.productoEstadoCambiado(tenantId, {
      tenantId,
      productoId: id,
      estado,
    })
  }
}
