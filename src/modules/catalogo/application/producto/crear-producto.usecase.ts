import type { IProductoRepository, ProductoCreateDTO } from "../../domain/ports/IProductoRepository.js"
import type { ProductoEntity } from "../../domain/producto.entity.js"
import type { ICatalogoNotificador } from "../../domain/ports/ICatalogoNotificador.js"
import { ProductoCodigoDuplicado, ProductoNombreDuplicado } from "../../domain/catalogo.errors.js"

export class CrearProductoUseCase {
  constructor(
    private readonly repo: IProductoRepository,
    private readonly notificador: ICatalogoNotificador,
  ) {}

  async ejecutar(data: ProductoCreateDTO, tenantId: string, userId: string): Promise<ProductoEntity> {
    let producto: ProductoEntity
    try {
      producto = await this.repo.crear(data, tenantId, userId)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("catalogo_actividadId_categoriaId_codigo")) throw new ProductoCodigoDuplicado()
      if (msg.includes("catalogo_actividadId_categoriaId_nombre")) throw new ProductoNombreDuplicado()
      if (msg.includes("Unique constraint") || msg.includes("unique")) {
        if (msg.toLowerCase().includes("codigo")) throw new ProductoCodigoDuplicado()
        throw new ProductoNombreDuplicado()
      }
      throw err
    }

    this.notificador.productoCreado(tenantId, {
      tenantId,
      productoId: producto.id,
      nombre: producto.nombre,
      categoriaId: producto.categoriaId,
      precio: producto.precio,
      tipoProducto: producto.tipoProducto,
    })

    return producto
  }
}
