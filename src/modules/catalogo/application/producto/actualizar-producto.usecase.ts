import type { IProductoRepository, ProductoUpdateDTO } from "../../domain/ports/IProductoRepository.js"
import type { ProductoEntity } from "../../domain/producto.entity.js"
import type { ICatalogoNotificador } from "../../domain/ports/ICatalogoNotificador.js"
import { ProductoNoEncontrado } from "../../domain/catalogo.errors.js"

export class ActualizarProductoUseCase {
  constructor(
    private readonly repo: IProductoRepository,
    private readonly notificador: ICatalogoNotificador,
  ) {}

  async ejecutar(id: string, data: ProductoUpdateDTO, tenantId: string, userId: string): Promise<ProductoEntity> {
    const actual = await this.repo.obtener(id, tenantId)
    if (!actual) throw new ProductoNoEncontrado(id)

    let precioAnterior: string | undefined
    if (data.precio !== undefined && String(data.precio) !== actual.precio) {
      precioAnterior = actual.precio
    }

    const producto = await this.repo.actualizar(id, data, userId, precioAnterior)

    this.notificador.productoActualizado(tenantId, {
      tenantId,
      productoId: producto.id,
      precio: producto.precio,
    })

    return producto
  }
}
