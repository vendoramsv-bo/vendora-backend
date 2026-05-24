import type { IPedidoRepository, PedidoData } from "../../domain/ports/IPedidoRepository.js"
import { PedidoNoEncontradoError } from "../../domain/ventas.errors.js"

export class ObtenerPedidoUseCase {
  constructor(private readonly repo: IPedidoRepository) {}

  async execute(id: string, tenantId: string): Promise<PedidoData> {
    const pedido = await this.repo.obtener(id, tenantId)
    if (!pedido) throw new PedidoNoEncontradoError(id)
    return pedido
  }
}
