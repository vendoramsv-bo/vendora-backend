import { prismaBase, withAudit } from "../../../core/prisma-scoped.js"
import type { IMenuRepository, MenuCreateData, MenuUpdateData, MenuQueryParams } from "../domain/ports/IMenuRepository.js"
import { MenuEntity, type MenuRaw } from "../domain/menu.entity.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prismaBase as any

export class MenuPrismaRepository implements IMenuRepository {
  async findAllByRestaurante(restauranteId: string, params: MenuQueryParams = {}): Promise<MenuEntity[]> {
    const where: Record<string, unknown> = { restauranteId }
    if (params.estado) where.estado = params.estado
    if (params.tipo) where.tipo = params.tipo
    if (params.fechaInicio) where.fechaInicio = { gte: params.fechaInicio }
    if (params.fechaFin) where.fechaFin = { lte: params.fechaFin }

    const rows = await db.menu.findMany({
      where,
      orderBy: [{ fechaInicio: "desc" }, { createdAt: "desc" }],
      skip: params.page && params.limit ? (params.page - 1) * params.limit : undefined,
      take: params.limit,
    })
    return rows.map((r: MenuRaw) => MenuEntity.fromPrisma(r))
  }

  async findById(id: string, restauranteId?: string): Promise<MenuEntity | null> {
    const where: Record<string, unknown> = { id }
    if (restauranteId) where.restauranteId = restauranteId
    const row = await db.menu.findFirst({ where })
    return row ? MenuEntity.fromPrisma(row) : null
  }

  async create(data: MenuCreateData, userId: string): Promise<MenuEntity> {
    const row = await db.menu.create({
      data: withAudit(
        {
          restauranteId: data.restauranteId,
          nombre: data.nombre,
          tipo: data.tipo,
          fechaInicio: data.fechaInicio,
          fechaFin: data.fechaFin,
          descripcion: data.descripcion ?? null,
          imagenPortada: data.imagenPortada ?? null,
          tema: data.tema ?? null,
          creadoPorId: data.creadoPorId ?? null,
          estado: "BORRADOR",
        },
        userId,
      ),
    })
    return MenuEntity.fromPrisma(row)
  }

  async update(id: string, data: MenuUpdateData, userId: string): Promise<MenuEntity> {
    const row = await db.menu.update({
      where: { id },
      data: {
        ...(data.nombre !== undefined && { nombre: data.nombre }),
        ...(data.tipo !== undefined && { tipo: data.tipo }),
        ...(data.fechaInicio !== undefined && { fechaInicio: data.fechaInicio }),
        ...(data.fechaFin !== undefined && { fechaFin: data.fechaFin }),
        ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
        ...(data.imagenPortada !== undefined && { imagenPortada: data.imagenPortada }),
        ...(data.tema !== undefined && { tema: data.tema }),
        updatedById: userId,
      },
    })
    return MenuEntity.fromPrisma(row)
  }

  async changeEstado(id: string, estado: string, userId: string, fechaPublicacion?: Date): Promise<MenuEntity> {
    const updateData: Record<string, unknown> = { estado, updatedById: userId }
    if (estado === "PUBLICADO" && fechaPublicacion) {
      updateData.fechaPublicacion = fechaPublicacion
    }
    const row = await db.menu.update({ where: { id }, data: updateData })
    return MenuEntity.fromPrisma(row)
  }

  async countItemsDisponibles(menuId: string): Promise<number> {
    return db.menuItem.count({
      where: { menuId, disponible: true, estado: "ACTIVO" },
    })
  }

  async findPublicadosBySlug(slug: string, fecha: Date): Promise<MenuEntity[]> {
    const tenant = await db.tenant.findUnique({ where: { slug }, select: { id: true } })
    if (!tenant) return []
    const restaurante = await db.restaurante.findUnique({
      where: { tenantId: tenant.id },
      select: { id: true },
    })
    if (!restaurante) return []

    const fechaStr = fecha.toISOString().split("T")[0]
    const fechaStart = new Date(`${fechaStr}T00:00:00.000Z`)
    const fechaEnd = new Date(`${fechaStr}T23:59:59.999Z`)

    const rows = await db.menu.findMany({
      where: {
        restauranteId: restaurante.id,
        estado: "PUBLICADO",
        fechaInicio: { lte: fechaEnd },
        fechaFin: { gte: fechaStart },
      },
      orderBy: [{ tipo: "asc" }, { fechaInicio: "asc" }],
    })
    return rows.map((r: MenuRaw) => MenuEntity.fromPrisma(r))
  }
}
