import type { IVentaRepository, VentaData, VentaDetalleInput } from "../../domain/ports/IVentaRepository.js"
import type { ICajaRepository } from "../../domain/ports/ICajaRepository.js"
import type { IVentasNotificador } from "../../domain/ports/IVentasNotificador.js"
import { CajaNoEncontradaError, CajaYaCerradaError } from "../../domain/ventas.errors.js"

export interface CrearVentaInput {
  tenantId: string
  puntoVentaId: string
  turnoId: string
  tenantMemberId: string
  aperturaCierreCajaId: string
  fecha?: Date
  clienteId?: string | null
  clienteNombre?: string | null
  clienteTipoDocumento?: string | null
  clienteNroDocumento?: string | null
  clienteEmail?: string | null
  tipoPago: string
  estadoPago: string
  efectivo: number
  referenciaTipo: string
  referenciaId?: string | null
  detalles: VentaDetalleInput[]
  createdById?: string | null
}

export class CrearVentaUseCase {
  constructor(
    private readonly repo: IVentaRepository,
    private readonly cajaRepo: ICajaRepository,
    private readonly notificador: IVentasNotificador,
  ) {}

  async execute(input: CrearVentaInput): Promise<VentaData> {
    const caja = await this.cajaRepo.obtener(input.aperturaCierreCajaId, input.tenantId)
    if (!caja) throw new CajaNoEncontradaError(input.aperturaCierreCajaId)
    if (caja.estadoCaja !== "APERTURADA") throw new CajaYaCerradaError()

    const totalCantidad = input.detalles.reduce((s, d) => s + d.cantidad, 0)
    const totalVenta = input.detalles.reduce((s, d) => s + d.precio * d.cantidad - (d.descuento ?? 0), 0)
    const totalDescuento = input.detalles.reduce((s, d) => s + (d.descuento ?? 0), 0)
    const diferencia = input.efectivo - totalVenta

    const venta = await this.repo.crear({
      tenantId: input.tenantId,
      puntoVentaId: input.puntoVentaId,
      turnoId: input.turnoId,
      tenantMemberId: input.tenantMemberId,
      aperturaCierreCajaId: input.aperturaCierreCajaId,
      fecha: input.fecha,
      clienteId: input.clienteId,
      clienteNombre: input.clienteNombre,
      clienteTipoDocumento: input.clienteTipoDocumento,
      clienteNroDocumento: input.clienteNroDocumento,
      clienteEmail: input.clienteEmail,
      totalCantidad,
      totalVenta,
      totalDescuento,
      efectivo: input.efectivo,
      diferencia,
      tipoPago: input.tipoPago,
      estadoPago: input.estadoPago,
      referenciaId: input.referenciaId,
      referenciaTipo: input.referenciaTipo,
      detalles: input.detalles,
      createdById: input.createdById,
    })

    this.notificador.ventaCreada(input.tenantId, {
      ventaId: venta.id,
      tenantId: input.tenantId,
      aperturaCierreCajaId: venta.aperturaCierreCajaId,
      totalVenta: venta.totalVenta,
    })

    return venta
  }
}
