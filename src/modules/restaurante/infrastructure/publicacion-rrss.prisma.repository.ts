import { prismaBase, withAudit } from "../../../core/prisma-scoped.js"
import type { IPublicacionRRSSRepository, PublicacionCreateData, PublicacionUpdateData, PublicacionQueryParams } from "../domain/ports/IPublicacionRRSSRepository.js"
import { PublicacionRRSSEntity, type PublicacionRRSSRaw } from "../domain/publicacion-rrss.entity.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prismaBase as any

export class PublicacionRRSSPrismaRepository implements IPublicacionRRSSRepository {
  async findAllByRestaurante(restauranteId: string, params: PublicacionQueryParams = {}): Promise<PublicacionRRSSEntity[]> {
    const where: Record<string, unknown> = { restauranteId }
    if (params.redSocial) where.redSocial = params.redSocial
    if (params.estado) where.estado = params.estado

    const rows = await db.publicacionMenuRRSS.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: params.page && params.limit ? (params.page - 1) * params.limit : undefined,
      take: params.limit,
    })
    return rows.map((r: PublicacionRRSSRaw) => PublicacionRRSSEntity.fromPrisma(r))
  }

  async findById(id: string, restauranteId?: string): Promise<PublicacionRRSSEntity | null> {
    const where: Record<string, unknown> = { id }
    if (restauranteId) where.restauranteId = restauranteId
    const row = await db.publicacionMenuRRSS.findFirst({ where })
    return row ? PublicacionRRSSEntity.fromPrisma(row) : null
  }

  async create(data: PublicacionCreateData, userId: string): Promise<PublicacionRRSSEntity> {
    const row = await db.publicacionMenuRRSS.create({
      data: withAudit(
        {
          restauranteId: data.restauranteId,
          menuId: data.menuId,
          redSocial: data.redSocial,
          fechaProgramada: data.fechaProgramada,
          creadoPorId: data.creadoPorId ?? null,
          estado: "PROGRAMADA",
        },
        userId,
      ),
    })
    return PublicacionRRSSEntity.fromPrisma(row)
  }

  async update(id: string, data: PublicacionUpdateData, userId: string): Promise<PublicacionRRSSEntity> {
    const updateData: Record<string, unknown> = { updatedById: userId }
    if (data.estado !== undefined) updateData.estado = data.estado
    if (data.urlPublicacion !== undefined) updateData.urlPublicacion = data.urlPublicacion
    if (data.urlImagenGenerada !== undefined) updateData.urlImagenGenerada = data.urlImagenGenerada
    if (data.fechaPublicada !== undefined) updateData.fechaPublicada = data.fechaPublicada
    if (data.alcance !== undefined) updateData.alcance = data.alcance
    if (data.reacciones !== undefined) updateData.reacciones = data.reacciones
    if (data.comentarios !== undefined) updateData.comentarios = data.comentarios
    if (data.errorMensaje !== undefined) updateData.errorMensaje = data.errorMensaje

    const row = await db.publicacionMenuRRSS.update({ where: { id }, data: updateData })
    return PublicacionRRSSEntity.fromPrisma(row)
  }

  async findProgramadasPendientes(): Promise<PublicacionRRSSEntity[]> {
    const rows = await db.publicacionMenuRRSS.findMany({
      where: {
        estado: "PROGRAMADA",
        fechaProgramada: { lte: new Date() },
      },
      orderBy: { fechaProgramada: "asc" },
    })
    return rows.map((r: PublicacionRRSSRaw) => PublicacionRRSSEntity.fromPrisma(r))
  }
}
