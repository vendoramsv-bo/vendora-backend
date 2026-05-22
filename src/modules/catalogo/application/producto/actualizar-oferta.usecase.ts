import type { IProductoRepository, OfertaUpdateDTO } from "../../domain/ports/IProductoRepository.js"
import type { ICatalogoNotificador } from "../../domain/ports/ICatalogoNotificador.js"
import { OfertaNoEncontrada } from "../../domain/catalogo.errors.js"

export class ActualizarOfertaUseCase {
  constructor(
    private readonly repo: IProductoRepository,
    private readonly notificador: ICatalogoNotificador,
  ) {}

  async ejecutar(id: string, productoId: string, data: OfertaUpdateDTO, tenantId: string): Promise<unknown> {
    let oferta: unknown
    try {
      oferta = await this.repo.actualizarOferta(id, productoId, data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("Record to update not found") || msg.includes("P2025")) throw new OfertaNoEncontrada(id)
      throw err
    }

    const ofertaRaw = oferta as { estado: string }
    this.notificador.ofertaActualizada(tenantId, {
      tenantId,
      ofertaId: id,
      productoId,
      estado: ofertaRaw.estado,
    })

    return oferta
  }
}
