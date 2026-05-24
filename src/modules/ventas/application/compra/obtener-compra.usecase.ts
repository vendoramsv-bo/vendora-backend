import type { ICompraRepository } from "../../domain/ports/ICompraRepository.js"
import { CompraNoEncontradaError } from "../../domain/ventas.errors.js"

export class ObtenerCompraUseCase {
  constructor(private readonly repo: ICompraRepository) {}

  async execute(id: string, tenantId: string) {
    const compra = await this.repo.obtenerPorId(id, tenantId)
    if (!compra) throw new CompraNoEncontradaError(id)
    return compra
  }
}
