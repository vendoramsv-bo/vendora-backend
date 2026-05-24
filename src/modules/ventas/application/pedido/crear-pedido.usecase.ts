import type { IPedidoRepository, PedidoData, PedidoDetalleInput } from "../../domain/ports/IPedidoRepository.js"
import type { IVentasNotificador } from "../../domain/ports/IVentasNotificador.js"

export interface CrearPedidoInput {
  tenantId: string
  userId: string
  detalles: PedidoDetalleInput[]
  respuesta?: string | null
  createdById?: string | null
}

export class CrearPedidoUseCase {
  constructor(
    private readonly repo: IPedidoRepository,
    private readonly notificador: IVentasNotificador,
  ) {}

  async execute(input: CrearPedidoInput): Promise<PedidoData> {
    const totalCantidad = input.detalles.reduce((s, d) => s + d.cantidad, 0)
    const totalPedido = input.detalles.reduce((s, d) => s + d.precio * d.cantidad, 0)

    const pedido = await this.repo.crear({
      tenantId: input.tenantId,
      userId: input.userId,
      totalCantidad,
      totalPedido,
      respuesta: input.respuesta ?? null,
      detalles: input.detalles,
      createdById: input.createdById ?? null,
    })

    this.notificador.pedidoActualizado(input.tenantId, {
      pedidoId: pedido.id,
      tenantId: input.tenantId,
      estado: pedido.estado,
    })

    return pedido
  }
}
