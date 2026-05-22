import type { IProductoRepository, OfertaCreateDTO } from "../../domain/ports/IProductoRepository.js"
import type { ICatalogoNotificador } from "../../domain/ports/ICatalogoNotificador.js"
import { ProductoNoEncontrado, OfertaSolapada } from "../../domain/catalogo.errors.js"

export class CrearOfertaUseCase {
  constructor(
    private readonly repo: IProductoRepository,
    private readonly notificador: ICatalogoNotificador,
  ) {}

  async ejecutar(productoId: string, data: OfertaCreateDTO, tenantId: string): Promise<unknown> {
    const producto = await this.repo.obtener(productoId, tenantId)
    if (!producto) throw new ProductoNoEncontrado(productoId)

    let oferta: unknown
    try {
      oferta = await this.repo.crearOferta(productoId, data, tenantId)
    } catch (err) {
      if (err instanceof OfertaSolapada) throw err
      throw err
    }

    const ofertaRaw = oferta as { id: string; precioOferta: { toString(): string }; fechaFin: Date }
    this.notificador.ofertaCreada(tenantId, {
      tenantId,
      ofertaId: ofertaRaw.id,
      productoId,
      precioOferta: ofertaRaw.precioOferta.toString(),
      fechaFin: ofertaRaw.fechaFin.toISOString(),
    })

    return oferta
  }
}
