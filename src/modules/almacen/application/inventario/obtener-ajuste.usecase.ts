import type { IInventarioProductoRepository } from "../../domain/ports/IInventarioProductoRepository.js"
import { DocumentoNoEncontradoError } from "../../domain/almacen.errors.js"

export class ObtenerAjusteUseCase {
  constructor(private readonly repo: IInventarioProductoRepository) {}

  async execute(id: string, tenantId: string) {
    const ajuste = await this.repo.obtenerAjuste(id, tenantId)
    if (!ajuste) throw new DocumentoNoEncontradoError("AJUSTE", id)
    return ajuste
  }
}
