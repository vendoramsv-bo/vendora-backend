import type { IRestauranteVentaService, CrearVentaDesdeReservaInput } from "../domain/ports/IRestauranteVentaService.js"
import { CajaNoAbierta } from "../domain/restaurante.errors.js"
import { prismaBase } from "../../../core/prisma-scoped.js"
import pino from "pino"

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prismaBase as any

export class VentaRestauranteService implements IRestauranteVentaService {
  async crearDesdeReserva(data: CrearVentaDesdeReservaInput): Promise<{ ventaId: string; numeroVenta: string }> {
    const { tenantId, reservaCodigo, items, total, cajaId, cajeroId } = data

    const caja = await db.aperturaCierreDeCaja.findFirst({
      where: { tenantId, id: cajaId, estado: "ABIERTO" },
      select: { id: true },
    })

    if (!caja) throw new CajaNoAbierta()

    const correlativo = await db.venta.count({ where: { tenantId } })
    const numeroVenta = `V-${new Date().getFullYear()}-${String(correlativo + 1).padStart(4, "0")}`

    const venta = await db.venta.create({
      data: {
        tenantId,
        numero: numeroVenta,
        referenciaTipo: "RESERVA_RESTAURANTE",
        referenciaId: reservaCodigo,
        aperturaCierreCajaId: cajaId,
        creadoPorId: cajeroId,
        total,
        estado: "COMPLETADA",
        detalle: {
          create: items.map((item) => ({
            descripcion: item.nombre,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            subtotal: item.subtotal,
          })),
        },
        createdById: cajeroId,
        updatedById: cajeroId,
      },
      select: { id: true, numero: true },
    })

    logger.info({ ventaId: venta.id, reservaCodigo }, "[venta-restaurante] venta creada desde reserva")

    return { ventaId: venta.id, numeroVenta: venta.numero }
  }
}
