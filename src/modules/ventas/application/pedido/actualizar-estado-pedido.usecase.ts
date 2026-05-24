import type { IPedidoRepository, PedidoData } from "../../domain/ports/IPedidoRepository.js"
import type { IVentasNotificador } from "../../domain/ports/IVentasNotificador.js"
import { PedidoNoEncontradoError, PedidoTerminalError } from "../../domain/ventas.errors.js"

const TRANSICIONES_PEDIDO: Record<string, string[]> = {
  PENDIENTE: ["ELABORADO", "RECHAZADO"],
  ELABORADO: ["FINALIZADO", "RECHAZADO"],
  FINALIZADO: [],
  RECHAZADO: [],
}

export interface ActualizarEstadoPedidoInput {
  id: string
  tenantId: string
  estado: string
  respuesta?: string | null
  updatedById?: string | null
}

export class ActualizarEstadoPedidoUseCase {
  constructor(
    private readonly repo: IPedidoRepository,
    private readonly notificador: IVentasNotificador,
  ) {}

  async execute(input: ActualizarEstadoPedidoInput): Promise<PedidoData> {
    const pedido = await this.repo.obtener(input.id, input.tenantId)
    if (!pedido) throw new PedidoNoEncontradoError(input.id)

    const transicionesValidas = TRANSICIONES_PEDIDO[pedido.estado] ?? []
    if (!transicionesValidas.includes(input.estado)) throw new PedidoTerminalError()

    const actualizado = await this.repo.actualizarEstado(
      input.id,
      input.tenantId,
      input.estado,
      input.respuesta,
      input.updatedById,
    )

    this.notificador.pedidoActualizado(input.tenantId, {
      pedidoId: actualizado.id,
      tenantId: input.tenantId,
      estado: actualizado.estado,
    })

    return actualizado
  }
}
