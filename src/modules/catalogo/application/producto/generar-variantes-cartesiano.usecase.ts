import type { IProductoRepository, ConfirmarVarianteItemDTO, PropuestaVarianteItem } from "../../domain/ports/IProductoRepository.js"
import type { ICatalogoNotificador } from "../../domain/ports/ICatalogoNotificador.js"
import { ProductoNoEncontrado } from "../../domain/catalogo.errors.js"

export class GenerarVariantesCartesianoUseCase {
  constructor(
    private readonly repo: IProductoRepository,
    private readonly notificador: ICatalogoNotificador,
  ) {}

  async generarPropuesta(productoId: string, tenantId: string): Promise<PropuestaVarianteItem[]> {
    const producto = await this.repo.obtener(productoId, tenantId)
    if (!producto) throw new ProductoNoEncontrado(productoId)
    return this.repo.generarPropuestaVariantes(productoId, tenantId)
  }

  async confirmarVariantes(productoId: string, variantes: ConfirmarVarianteItemDTO[], tenantId: string): Promise<unknown[]> {
    const producto = await this.repo.obtener(productoId, tenantId)
    if (!producto) throw new ProductoNoEncontrado(productoId)

    const creadas = await this.repo.confirmarVariantes(productoId, variantes)

    this.notificador.variantesGeneradas(tenantId, {
      tenantId,
      productoId,
      cantidadVariantes: creadas.length,
    })

    return creadas
  }
}
