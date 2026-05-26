import { prismaBase, withAudit } from "../../../core/prisma-scoped.js"
import type { IReservaRepository, ReservaQueryParams, ReservaCreateData, ReservaUpdateData } from "../domain/ports/IReservaRepository.js"
import { ReservaEntity, type ReservaRaw } from "../domain/reserva.entity.js"
import { ReservaDetalleEntity, type ReservaDetalleRaw } from "../domain/reserva-detalle.entity.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prismaBase as any

export class ReservaPrismaRepository implements IReservaRepository {
  async findAllByRestaurante(restauranteId: string, params: ReservaQueryParams = {}): Promise<ReservaEntity[]> {
    const where: Record<string, unknown> = { restauranteId }
    if (params.estado) where.estado = params.estado
    if (params.fecha) {
      const d = params.fecha
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
      where.fechaLlegada = { gte: start, lt: end }
    }
    if (params.search) {
      where.OR = [
        { codigo: { contains: params.search, mode: "insensitive" } },
        { clienteNombre: { contains: params.search, mode: "insensitive" } },
      ]
    }

    const rows = await db.reserva.findMany({
      where,
      orderBy: [{ fechaLlegada: "asc" }],
      skip: params.page && params.limit ? (params.page - 1) * params.limit : undefined,
      take: params.limit,
    })
    return rows.map((r: ReservaRaw) => ReservaEntity.fromPrisma(r))
  }

  async findById(id: string, restauranteId?: string): Promise<(ReservaEntity & { detalles: ReservaDetalleEntity[] }) | null> {
    const where: Record<string, unknown> = { id }
    if (restauranteId) where.restauranteId = restauranteId

    const row = await db.reserva.findFirst({
      where,
      include: { detalles: true },
    })
    if (!row) return null

    const entity = ReservaEntity.fromPrisma(row)
    const detalles = (row.detalles ?? []).map((d: ReservaDetalleRaw) => ReservaDetalleEntity.fromPrisma(d))
    return Object.assign(entity, { detalles })
  }

  async findByCodigo(restauranteId: string, codigo: string): Promise<ReservaEntity | null> {
    const row = await db.reserva.findUnique({ where: { restauranteId_codigo: { restauranteId, codigo } } })
    return row ? ReservaEntity.fromPrisma(row) : null
  }

  async countByRestauranteAndFecha(restauranteId: string, fecha: Date): Promise<number> {
    const start = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
    const end = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 1)
    return db.reserva.count({
      where: { restauranteId, createdAt: { gte: start, lt: end } },
    })
  }

  async create(data: ReservaCreateData, userId: string): Promise<ReservaEntity> {
    const row = await db.reserva.create({
      data: withAudit(
        {
          restauranteId: data.restauranteId,
          codigo: data.codigo,
          clienteId: data.clienteId ?? null,
          clienteNombre: data.clienteNombre,
          clienteTelefono: data.clienteTelefono ?? null,
          clienteEmail: data.clienteEmail ?? null,
          menuId: data.menuId ?? null,
          fechaLlegada: data.fechaLlegada,
          numeroComensales: data.numeroComensales,
          observaciones: data.observaciones ?? null,
          canalOrigen: data.canalOrigen ?? null,
          totalCantidad: data.totalCantidad,
          totalEstimado: data.totalEstimado,
          estado: "RESERVADA",
          detalles: {
            create: data.detalles.map((d) => ({
              menuItemId: d.menuItemId ?? null,
              productoId: d.productoId,
              productoNombre: d.productoNombre,
              productoImagen: d.productoImagen ?? null,
              cantidad: d.cantidad,
              precio: d.precio,
              subtotal: d.subtotal,
              observacion: d.observacion ?? null,
            })),
          },
        },
        userId,
      ),
    })
    return ReservaEntity.fromPrisma(row)
  }

  async update(id: string, data: ReservaUpdateData, userId: string): Promise<ReservaEntity> {
    const updateData: Record<string, unknown> = { updatedById: userId }
    if (data.estado !== undefined) updateData.estado = data.estado
    if (data.numeroMesa !== undefined) updateData.numeroMesa = data.numeroMesa
    if (data.atendidaPorId !== undefined) updateData.atendidaPorId = data.atendidaPorId
    if (data.fechaConfirmacion !== undefined) updateData.fechaConfirmacion = data.fechaConfirmacion
    if (data.fechaCancelacion !== undefined) updateData.fechaCancelacion = data.fechaCancelacion
    if (data.motivoCancelacion !== undefined) updateData.motivoCancelacion = data.motivoCancelacion
    if (data.ventaId !== undefined) updateData.ventaId = data.ventaId

    const row = await db.reserva.update({ where: { id }, data: updateData })
    return ReservaEntity.fromPrisma(row)
  }

  async findByClienteEmail(restauranteId: string, email: string): Promise<ReservaEntity[]> {
    const rows = await db.reserva.findMany({
      where: { restauranteId, clienteEmail: email },
      orderBy: { fechaLlegada: "desc" },
    })
    return rows.map((r: ReservaRaw) => ReservaEntity.fromPrisma(r))
  }

  async logEstadoCambio(
    reservaId: string,
    estadoAnterior: string | null,
    estadoNuevo: string,
    userId: string | null,
    nota?: string,
  ): Promise<void> {
    await db.pedidoEstadoLog.create({
      data: {
        reservaId,
        estadoAnterior,
        estadoNuevo,
        cambiadoPorId: userId,
        nota: nota ?? null,
      },
    })
  }
}
