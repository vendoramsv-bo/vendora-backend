import type {
  IVentaRepository,
  VentaData,
  CrearVentaDTO,
  ConfirmarVentaResultado,
} from "../../src/modules/ventas/domain/ports/IVentaRepository.js"
import type { QueryParams } from "../../src/core/query-params.js"
import { VentaNoEncontradaError, VentaYaConfirmadaError } from "../../src/modules/ventas/domain/ventas.errors.js"

let idCounter = 1

export class FakeVentaRepository implements IVentaRepository {
  readonly ventas: VentaData[] = []

  async crear(dto: CrearVentaDTO): Promise<VentaData> {
    const venta: VentaData = {
      id: `venta-${idCounter++}`,
      tenantId: dto.tenantId,
      puntoVentaId: dto.puntoVentaId,
      turnoId: dto.turnoId,
      tenantMemberId: dto.tenantMemberId,
      aperturaCierreCajaId: dto.aperturaCierreCajaId,
      fecha: dto.fecha ?? new Date(),
      clienteId: dto.clienteId ?? null,
      clienteNombre: dto.clienteNombre ?? null,
      clienteTipoDocumento: dto.clienteTipoDocumento ?? null,
      clienteNroDocumento: dto.clienteNroDocumento ?? null,
      clienteEmail: dto.clienteEmail ?? null,
      totalCantidad: dto.totalCantidad,
      totalVenta: dto.totalVenta,
      totalDescuento: dto.totalDescuento,
      efectivo: dto.efectivo,
      diferencia: dto.diferencia,
      tipoPago: dto.tipoPago,
      estadoPago: dto.estadoPago,
      referenciaId: dto.referenciaId ?? null,
      referenciaTipo: dto.referenciaTipo,
      createdById: dto.createdById ?? null,
      updatedById: null,
      createdAt: new Date(),
      updatedAt: null,
      detalles: dto.detalles.map((d, i) => ({
        id: `det-${i}-${idCounter}`,
        ventaId: `venta-${idCounter - 1}`,
        productoId: d.productoId,
        varianteId: d.varianteId ?? null,
        etiquetaVariante: d.etiquetaVariante ?? null,
        precioVolumenId: d.precioVolumenId ?? null,
        etiquetaVolumen: d.etiquetaVolumen ?? null,
        precio: d.precio,
        cantidad: d.cantidad,
        descuento: d.descuento ?? 0,
        total: d.precio * d.cantidad - (d.descuento ?? 0),
        notaVenta: d.notaVenta ?? null,
      })),
    }
    this.ventas.push(venta)
    return venta
  }

  async confirmar(id: string, tenantId: string): Promise<ConfirmarVentaResultado> {
    const venta = this.ventas.find((v) => v.id === id && v.tenantId === tenantId)
    if (!venta) throw new VentaNoEncontradaError(id)
    if (venta.estadoPago === "PAGADO" && venta.updatedAt !== null) throw new VentaYaConfirmadaError()

    venta.estadoPago = "PAGADO"
    venta.updatedAt = new Date()
    return { venta, advertencias: [] }
  }

  async obtener(id: string, tenantId: string): Promise<VentaData | null> {
    return this.ventas.find((v) => v.id === id && v.tenantId === tenantId) ?? null
  }

  async listar(tenantId: string, _params: QueryParams): Promise<{ data: VentaData[]; total: number }> {
    const data = this.ventas.filter((v) => v.tenantId === tenantId)
    return { data, total: data.length }
  }
}
