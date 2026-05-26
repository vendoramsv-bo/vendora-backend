import type { ITiempoComidaRepository, TiempoComidaCreateDTO } from "../domain/ports/ITiempoComidaRepository.js"
import { TiempoComidaEntity, type TiempoComidaRaw } from "../domain/tiempo-comida.entity.js"
import { TiempoComidaNoEncontrado } from "../domain/restaurante.errors.js"
import { prismaBase, withAudit } from "../../../core/prisma-scoped.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prismaBase as any

export class TiempoComidaPrismaRepository implements ITiempoComidaRepository {
  async findAllByRestaurante(restauranteId: string, soloActivos = true): Promise<TiempoComidaEntity[]> {
    const where = soloActivos ? { restauranteId, estado: "ACTIVO" } : { restauranteId }
    const rows = await db.tiempoComida.findMany({ where, orderBy: { orden: "asc" } })
    return rows.map((r: TiempoComidaRaw) => TiempoComidaEntity.fromPrisma(r))
  }

  async findById(id: string, restauranteId: string): Promise<TiempoComidaEntity | null> {
    const raw = await db.tiempoComida.findFirst({ where: { id, restauranteId } })
    if (!raw) return null
    return TiempoComidaEntity.fromPrisma(raw as TiempoComidaRaw)
  }

  async findByNombre(restauranteId: string, nombre: string): Promise<TiempoComidaEntity | null> {
    const raw = await db.tiempoComida.findUnique({ where: { restauranteId_nombre: { restauranteId, nombre } } })
    if (!raw) return null
    return TiempoComidaEntity.fromPrisma(raw as TiempoComidaRaw)
  }

  async create(data: TiempoComidaCreateDTO, userId: string): Promise<TiempoComidaEntity> {
    const raw = await db.tiempoComida.create({
      data: withAudit({ orden: 0, ...data }, userId),
    })
    return TiempoComidaEntity.fromPrisma(raw as TiempoComidaRaw)
  }

  async update(id: string, data: Partial<TiempoComidaCreateDTO>, userId: string): Promise<TiempoComidaEntity> {
    const raw = await db.tiempoComida.update({
      where: { id },
      data: { ...data, updatedById: userId },
    })
    return TiempoComidaEntity.fromPrisma(raw as TiempoComidaRaw)
  }

  async softDelete(id: string, userId: string): Promise<void> {
    const existing = await db.tiempoComida.findUnique({ where: { id }, select: { id: true } })
    if (!existing) throw new TiempoComidaNoEncontrado(id)
    await db.tiempoComida.update({
      where: { id },
      data: { estado: "INACTIVO", updatedById: userId },
    })
  }

  async countMenuItemsActivos(tiempoComidaId: string): Promise<number> {
    return db.menuItem.count({ where: { tiempoComidaId, estado: "ACTIVO" } })
  }
}
