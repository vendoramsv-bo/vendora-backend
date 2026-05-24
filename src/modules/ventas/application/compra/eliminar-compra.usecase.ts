import type { ICompraRepository } from "../../domain/ports/ICompraRepository.js"
import { CompraNoEncontradaError, CompraYaConfirmadaError } from "../../domain/ventas.errors.js"

export class EliminarCompraUseCase {
  constructor(private readonly repo: ICompraRepository) {}

  async execute(id: string, tenantId: string) {
    const existente = await this.repo.obtenerPorId(id, tenantId)
    if (!existente) throw new CompraNoEncontradaError(id)
    if (existente.estado === "CONFIRMADA") throw new CompraYaConfirmadaError()
    return this.repo.eliminar(id, tenantId)
  }
}
