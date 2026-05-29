import type { IInventarioProductoRepository } from "../../domain/ports/IInventarioProductoRepository.js"
import { DocumentoNoEncontradoError } from "../../domain/almacen.errors.js"

export class ObtenerRecuentoUseCase {
  constructor(private readonly repo: IInventarioProductoRepository) {}

  async execute(id: string, tenantId: string) {
    const recuento = await this.repo.obtenerRecuento(id, tenantId)
    if (!recuento) throw new DocumentoNoEncontradoError("RECUENTO", id)
    return recuento
  }
}
