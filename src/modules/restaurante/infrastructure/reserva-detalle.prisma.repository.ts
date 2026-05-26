import { prismaBase } from "../../../core/prisma-scoped.js"
import type { IReservaDetalleRepository } from "../domain/ports/IReservaDetalleRepository.js"
import { ReservaDetalleEntity, type ReservaDetalleRaw } from "../domain/reserva-detalle.entity.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prismaBase as any

export class ReservaDetallePrismaRepository implements IReservaDetalleRepository {
  async findByReserva(reservaId: string): Promise<ReservaDetalleEntity[]> {
    const rows = await db.reservaDetalle.findMany({
      where: { reservaId },
      orderBy: { createdAt: "asc" },
    })
    return rows.map((r: ReservaDetalleRaw) => ReservaDetalleEntity.fromPrisma(r))
  }

  async findById(id: string): Promise<ReservaDetalleEntity | null> {
    const row = await db.reservaDetalle.findUnique({ where: { id } })
    return row ? ReservaDetalleEntity.fromPrisma(row) : null
  }

  async create(data: {
    reservaId: string
    menuItemId?: string | null
    productoId: string
    productoNombre: string
    productoImagen?: string | null
    cantidad: number
    precio: number
    subtotal: number
    observacion?: string | null
  }): Promise<ReservaDetalleEntity> {
    const row = await db.reservaDetalle.create({
      data: {
        reservaId: data.reservaId,
        menuItemId: data.menuItemId ?? null,
        productoId: data.productoId,
        productoNombre: data.productoNombre,
        productoImagen: data.productoImagen ?? null,
        cantidad: data.cantidad,
        precio: data.precio,
        subtotal: data.subtotal,
        observacion: data.observacion ?? null,
        estadoCocina: "PENDIENTE",
      },
    })
    return ReservaDetalleEntity.fromPrisma(row)
  }

  async updateEstadoCocina(id: string, estadoCocina: string): Promise<ReservaDetalleEntity> {
    const row = await db.reservaDetalle.update({ where: { id }, data: { estadoCocina } })
    return ReservaDetalleEntity.fromPrisma(row)
  }

  async countByEstadoCocina(reservaId: string, estadoCocina: string): Promise<number> {
    return db.reservaDetalle.count({ where: { reservaId, estadoCocina } })
  }
}
