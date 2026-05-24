import type { IVentaService, CrearDesdeAtencionInput } from "../domain/ports/IVentaService.js"

export class VentaServiceAdapter implements IVentaService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get client(): any {
    return this.db
  }

  async crearDesdeAtencion(data: CrearDesdeAtencionInput): Promise<{ ventaId: string }> {
    if (!data.aperturaCierreCajaId || !data.puntoVentaId || !data.turnoId) {
      return { ventaId: "" }
    }

    const totalVenta = data.detalle.reduce(
      (s, d) => s + Number(d.precioUnitario) * d.cantidad - Number(d.descuento),
      0,
    )
    const totalDescuento = data.detalle.reduce((s, d) => s + Number(d.descuento), 0)
    const totalCantidad = data.detalle.reduce((s, d) => s + d.cantidad, 0)

    const venta = await this.client.venta.create({
      data: {
        tenantId: data.tenantId,
        puntoVentaId: data.puntoVentaId,
        turnoId: data.turnoId,
        tenantMemberId: data.creadoPorId,
        aperturaCierreCajaId: data.aperturaCierreCajaId,
        referenciaTipo: "ATENCION_MEDICA",
        referenciaId: data.atencionId,
        totalCantidad,
        totalVenta,
        totalDescuento,
        efectivo: totalVenta,
        diferencia: 0,
        tipoPago: "EFECTIVO",
        estadoPago: "PAGADO",
        createdById: data.creadoPorId,
        detalles: {
          create: data.detalle.map((d) => ({
            productoId: "TEXT_LINE",
            precio: Number(d.precioUnitario),
            cantidad: d.cantidad,
            descuento: Number(d.descuento),
            total: Number(d.precioUnitario) * d.cantidad - Number(d.descuento),
            notaVenta: d.descripcion,
          })),
        },
      },
      select: { id: true },
    })

    return { ventaId: venta.id }
  }
}
