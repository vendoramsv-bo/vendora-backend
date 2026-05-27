import type { IProductoRepository } from "../../domain/ports/IProductoRepository.js"
import type { ICatalogoNotificador } from "../../domain/ports/ICatalogoNotificador.js"
import { ProductoNoEncontrado } from "../../domain/catalogo.errors.js"

export class EliminarProductoUseCase {
  constructor(
    private readonly repo: IProductoRepository,
    private readonly notificador: ICatalogoNotificador,
  ) {}

  async ejecutar(id: string, tenantId: string, userId: string): Promise<void> {
    const producto = await this.repo.obtener(id, tenantId)
    if (!producto) throw new ProductoNoEncontrado(id)

    void userId

    await this.repo.eliminarMovimientoCreacion(id, tenantId)
    await this.repo.eliminar(id, tenantId)

    this.notificador.productoEliminado(tenantId, {
      tenantId,
      productoId: id,
      nombre: producto.nombre,
    })
  }
}
