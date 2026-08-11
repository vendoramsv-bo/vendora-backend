import type {
  IVentaRepository,
  VentaData,
  VentaDetalleData,
  CrearVentaDTO,
  ConfirmarVentaResultado,
} from "../domain/ports/IVentaRepository.js"
import type { QueryParams } from "../../../core/query-params.js"
import { toPrismaArgs } from "../../../core/query-params.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDetalleData(raw: any): VentaDetalleData {
  return {
    id: raw.id,
    ventaId: raw.ventaId,
    productoId: raw.productoId,
    varianteId: raw.varianteId ?? null,
    etiquetaVariante: raw.etiquetaVariante ?? null,
    precioVolumenId: raw.precioVolumenId ?? null,
    etiquetaVolumen: raw.etiquetaVolumen ?? null,
    precio: Number(raw.precio),
    cantidad: raw.cantidad,
    descuento: Number(raw.descuento),
    total: Number(raw.total),
    notaVenta: raw.notaVenta ?? null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toVentaData(raw: any): VentaData {
  return {
    id: raw.id,
    tenantId: raw.tenantId,
    puntoVentaId: raw.puntoVentaId,
    turnoId: raw.turnoId,
    tenantMemberId: raw.tenantMemberId,
    aperturaCierreCajaId: raw.aperturaCierreCajaId,
    fecha: raw.fecha,
    clienteId: raw.clienteId ?? null,
    clienteNombre: raw.clienteNombre ?? null,
    clienteTipoDocumento: raw.clienteTipoDocumento ?? null,
    clienteNroDocumento: raw.clienteNroDocumento ?? null,
    clienteEmail: raw.clienteEmail ?? null,
    totalCantidad: raw.totalCantidad,
    totalVenta: Number(raw.totalVenta),
    totalDescuento: Number(raw.totalDescuento),
    efectivo: Number(raw.efectivo),
    diferencia: Number(raw.diferencia),
    tipoPago: raw.tipoPago,
    estadoPago: raw.estadoPago,
    referenciaId: raw.referenciaId ?? null,
    referenciaTipo: raw.referenciaTipo,
    createdById: raw.createdById ?? null,
    updatedById: raw.updatedById ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt ?? null,
    detalles: raw.ventaDetalle ? raw.ventaDetalle.map(toDetalleData) : undefined,
  }
}

const includeDetalle = { ventaDetalle: true }

export class VentaPrismaRepository implements IVentaRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: any) {}

  async crear(dto: CrearVentaDTO): Promise<VentaData> {
    const raw = await this.db.venta.create({
      data: {
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
        ventaDetalle: {
          create: dto.detalles.map((d) => ({
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
        },
      },
      include: includeDetalle,
    })
    return toVentaData(raw)
  }

  async confirmar(id: string, tenantId: string, updatedById?: string | null): Promise<ConfirmarVentaResultado> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resultado = await this.db.$transaction(async (tx: any) => {
      const ventaRaw = await tx.venta.findFirst({
        where: { id, tenantId },
        include: { ventaDetalle: true },
      })

      const advertencias: string[] = []

      for (const detalle of ventaRaw.ventaDetalle) {
        if (detalle.varianteId) {
          const variante = await tx.productoVariante.findUnique({ where: { id: detalle.varianteId } })
          if (variante?.inventarioActivado) {
            const stockAntes = variante.cantidadStock
            const stockDespues = stockAntes - detalle.cantidad

            await tx.productoVariante.update({
              where: { id: detalle.varianteId },
              data: { cantidadStock: stockDespues },
            })

            await tx.movimientoInventario.create({
              data: {
                tenantId,
                productoId: detalle.productoId,
                varianteId: detalle.varianteId,
                etiquetaVariante: detalle.etiquetaVariante ?? null,
                tipo: "SALIDA",
                cantidad: detalle.cantidad,
                motivo: "Venta confirmada",
                referenciaId: id,
                stockAntes,
                stockDespues,
                createdById: updatedById ?? null,
              },
            })
          } else {
            advertencias.push(`Variante ${detalle.varianteId} sin inventario activado — stock no decrementado`)
          }
        }

        const insumos = await tx.productoInsumo.findMany({ where: { productoId: detalle.productoId } })
        for (const insumo of insumos) {
          const cantidadConsumo = detalle.cantidad * insumo.cantidad
          const insumoRaw = await tx.insumo.findUnique({ where: { id: insumo.insumoId } })
          if (!insumoRaw) continue

          await tx.insumo.update({
            where: { id: insumo.insumoId },
            data: { cantidadStock: { decrement: cantidadConsumo } },
          })

          await tx.movimientoAlmacen.create({
            data: {
              tenantId,
              insumoId: insumo.insumoId,
              tipo: "SALIDA",
              cantidad: cantidadConsumo,
              motivo: "Venta confirmada",
              referenciaId: id,
              stockAntes: insumoRaw.cantidadStock,
              stockDespues: insumoRaw.cantidadStock - cantidadConsumo,
            },
          })
        }
      }

      if (ventaRaw.tipoPago === "EFECTIVO") {
        await tx.aperturaCierreDeCaja.update({
          where: { id: ventaRaw.aperturaCierreCajaId, tenantId },
          data: { montoVentas: { increment: Number(ventaRaw.totalVenta) } },
        })
      }

      const updatedRaw = await tx.venta.update({
        where: { id },
        data: { estadoPago: "PAGADO", updatedById: updatedById ?? null },
        include: includeDetalle,
      })

      return { venta: toVentaData(updatedRaw), advertencias }
    })

    return resultado
  }

  async obtener(id: string, tenantId: string): Promise<VentaData | null> {
    const raw = await this.db.venta.findFirst({
      where: { id, tenantId },
      include: includeDetalle,
    })
    return raw ? toVentaData(raw) : null
  }

  async listar(
    tenantId: string,
    params: QueryParams,
    filters?: { fecha?: Date; estadoPago?: string; tipoPago?: string; puntoVentaId?: string; turnoId?: string; clienteId?: string; tenantMemberId?: string },
  ): Promise<{ data: VentaData[]; total: number }> {
    const args = toPrismaArgs(params)
    const where = {
      ...args.where,
      tenantId,
      ...(filters?.estadoPago && { estadoPago: filters.estadoPago }),
      ...(filters?.tipoPago && { tipoPago: filters.tipoPago }),
      ...(filters?.puntoVentaId && { puntoVentaId: filters.puntoVentaId }),
      ...(filters?.turnoId && { turnoId: filters.turnoId }),
      ...(filters?.clienteId && { clienteId: filters.clienteId }),
      ...(filters?.fecha && { fecha: { gte: filters.fecha } }),
      // Alcance (023 FR-013): igualdad, nunca un OR con null. La igualdad SQL
      // ya excluye las filas sin autor, que es lo que FR-019 pide.
      ...(filters?.tenantMemberId && { tenantMemberId: filters.tenantMemberId }),
    }
    const [data, total] = await Promise.all([
      this.db.venta.findMany({ where, take: args.take, skip: args.skip, orderBy: args.orderBy }),
      this.db.venta.count({ where }),
    ])
    return { data: data.map(toVentaData), total }
  }
}
