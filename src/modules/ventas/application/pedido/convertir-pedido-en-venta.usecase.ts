import type { IPedidoRepository, ConvertirPedidoEnVentaDTO } from "../../domain/ports/IPedidoRepository.js"
import type { IVentasNotificador } from "../../domain/ports/IVentasNotificador.js"
import type { IAlmacenInventarioPort } from "../../domain/ports/IAlmacenInventarioPort.js"
import { PedidoNoEncontradoError, PedidoTerminalError } from "../../domain/ventas.errors.js"

const TERMINALES = ["FINALIZADO", "RECHAZADO"]

export interface ConvertirPedidoInput {
  pedidoId: string
  tenantId: string
  aperturaCierreCajaId: string
  puntoVentaId: string
  turnoId: string
  tenantMemberId: string
  tipoPago: string
  estadoPago: string
  efectivo: number
  updatedById?: string | null
}

export class ConvertirPedidoEnVentaUseCase {
  constructor(
    private readonly repo: IPedidoRepository,
    private readonly notificador: IVentasNotificador,
    private readonly almacenPort?: IAlmacenInventarioPort,
  ) {}

  async execute(input: ConvertirPedidoInput) {
    const pedido = await this.repo.obtener(input.pedidoId, input.tenantId)
    if (!pedido) throw new PedidoNoEncontradoError(input.pedidoId)
    if (TERMINALES.includes(pedido.estado)) throw new PedidoTerminalError()

    const dto: ConvertirPedidoEnVentaDTO = {
      pedidoId: input.pedidoId,
      tenantId: input.tenantId,
      aperturaCierreCajaId: input.aperturaCierreCajaId,
      puntoVentaId: input.puntoVentaId,
      turnoId: input.turnoId,
      tenantMemberId: input.tenantMemberId,
      tipoPago: input.tipoPago,
      estadoPago: input.estadoPago,
      efectivo: input.efectivo,
      updatedById: input.updatedById,
    }

    const { pedido: pedidoFinalizado, venta } = await this.repo.convertirEnVenta(dto)

    this.notificador.pedidoActualizado(input.tenantId, {
      pedidoId: pedidoFinalizado.id,
      tenantId: input.tenantId,
      estado: pedidoFinalizado.estado,
    })

    if (this.almacenPort && pedido.detalles && pedido.detalles.length > 0) {
      const detallesAlmacen = pedido.detalles.map((d) => ({
        productoId: d.productoId,
        varianteId: d.varianteId ?? undefined,
        cantidad: d.cantidad,
      }))
      this.almacenPort.registrarSalidaVenta(venta.id, input.tenantId, detallesAlmacen).catch(() => {})
    }

    return { pedido: pedidoFinalizado, venta }
  }
}
