import type { IPublicacionRepository, PublicacionRaw, PublicacionComentarioRaw, PublicacionReaccionRaw, PublicacionCompartidoRaw, PaginatedResult, MediaInput } from "../domain/ports/IPublicacionRepository.js"
import { paginate } from "../../../core/query-params.js"
import { prismaBase } from "../../../core/prisma-scoped.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prismaBase as any

const INCLUDE_MEDIOS = { medios: { orderBy: { orden: "asc" } } }

export class PublicacionPrismaRepository implements IPublicacionRepository {
  async create(data: { tenantId: string; autorId: string; titulo?: string; contenido?: string; tipo: string; etiquetas: string[]; medios: MediaInput[] }): Promise<PublicacionRaw> {
    return db.publicacion.create({
      data: {
        tenantId: data.tenantId,
        autorId: data.autorId,
        titulo: data.titulo ?? null,
        contenido: data.contenido ?? null,
        tipo: data.tipo,
        estado: "BORRADOR",
        etiquetas: data.etiquetas,
        medios: {
          create: data.medios.map((m) => ({
            tipo: m.tipo,
            url: m.url ?? null,
            embedUrl: m.embedUrl ?? null,
            thumbnailUrl: m.thumbnailUrl ?? null,
            plataforma: m.plataforma ?? null,
            titulo: m.titulo ?? null,
            orden: m.orden ?? 0,
          })),
        },
      },
      include: INCLUDE_MEDIOS,
    })
  }

  async update(id: string, tenantId: string, data: { titulo?: string; contenido?: string; tipo?: string; etiquetas?: string[]; medios?: MediaInput[] }): Promise<PublicacionRaw> {
    if (data.medios !== undefined) {
      await db.publicacionMedia.deleteMany({ where: { publicacionId: id } })
    }

    return db.publicacion.update({
      where: { id },
      data: {
        ...(data.titulo !== undefined ? { titulo: data.titulo } : {}),
        ...(data.contenido !== undefined ? { contenido: data.contenido } : {}),
        ...(data.tipo !== undefined ? { tipo: data.tipo } : {}),
        ...(data.etiquetas !== undefined ? { etiquetas: data.etiquetas } : {}),
        ...(data.medios !== undefined ? {
          medios: {
            create: data.medios.map((m) => ({
              tipo: m.tipo,
              url: m.url ?? null,
              embedUrl: m.embedUrl ?? null,
              thumbnailUrl: m.thumbnailUrl ?? null,
              plataforma: m.plataforma ?? null,
              titulo: m.titulo ?? null,
              orden: m.orden ?? 0,
            })),
          },
        } : {}),
      },
      include: INCLUDE_MEDIOS,
    })
  }

  async findById(id: string, tenantId?: string): Promise<PublicacionRaw | null> {
    const where: Record<string, unknown> = { id }
    if (tenantId) where["tenantId"] = tenantId
    return db.publicacion.findFirst({ where, include: INCLUDE_MEDIOS })
  }

  async findPublicas(tenantId: string, params: { take: number; page: number; order: "asc" | "desc"; etiqueta?: string }): Promise<PaginatedResult<PublicacionRaw>> {
    const take = Math.min(100, Math.max(1, params.take))
    const page = Math.max(1, params.page)
    const skip = (page - 1) * take
    const where: Record<string, unknown> = { tenantId, estado: "PUBLICADO" }
    if (params.etiqueta) where["etiquetas"] = { has: params.etiqueta }

    const [data, total] = await Promise.all([
      db.publicacion.findMany({ where, take, skip, orderBy: { publicadoEn: params.order }, include: INCLUDE_MEDIOS }),
      db.publicacion.count({ where }),
    ])
    return paginate(data, total, { take, skip })
  }

  async findByTenant(tenantId: string, params: { take: number; page: number; order: "asc" | "desc"; estado?: string; etiqueta?: string }): Promise<PaginatedResult<PublicacionRaw>> {
    const take = Math.min(100, Math.max(1, params.take))
    const page = Math.max(1, params.page)
    const skip = (page - 1) * take
    const where: Record<string, unknown> = { tenantId }
    if (params.estado) where["estado"] = params.estado
    if (params.etiqueta) where["etiquetas"] = { has: params.etiqueta }

    const [data, total] = await Promise.all([
      db.publicacion.findMany({ where, take, skip, orderBy: { createdAt: params.order }, include: INCLUDE_MEDIOS }),
      db.publicacion.count({ where }),
    ])
    return paginate(data, total, { take, skip })
  }

  async cambiarEstado(id: string, nuevoEstado: string, publicadoEn?: Date): Promise<PublicacionRaw> {
    return db.publicacion.update({
      where: { id },
      data: { estado: nuevoEstado, ...(publicadoEn ? { publicadoEn } : {}) },
      include: INCLUDE_MEDIOS,
    })
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await db.publicacion.delete({ where: { id, tenantId } })
  }

  // ─── Reacciones ───────────────────────────────────────────────────────────

  async upsertReaccionPublicacion(publicacionId: string, userId: string, tipo: string): Promise<{ reaccion: PublicacionReaccionRaw | null; removed: boolean }> {
    const existing = await db.publicacionReaccion.findUnique({ where: { publicacionId_userId: { publicacionId, userId } } })

    if (existing) {
      if (existing.tipo === tipo) {
        await db.publicacionReaccion.delete({ where: { id: existing.id } })
        return { reaccion: null, removed: true }
      }
      const updated = await db.publicacionReaccion.update({ where: { id: existing.id }, data: { tipo } })
      return { reaccion: updated, removed: false }
    }

    const reaccion = await db.publicacionReaccion.create({ data: { publicacionId, userId, tipo } })
    return { reaccion, removed: false }
  }

  async getReaccionesCount(publicacionId: string): Promise<{ tipo: string; count: number }[]> {
    const groups = await db.publicacionReaccion.groupBy({
      by: ["tipo"],
      where: { publicacionId },
      _count: { tipo: true },
    })
    return groups.map((g: { tipo: string; _count: { tipo: number } }) => ({ tipo: g.tipo, count: g._count.tipo }))
  }

  // ─── Comentarios ─────────────────────────────────────────────────────────

  async crearComentarioPublicacion(data: { publicacionId: string; userId: string; contenido: string; padreId?: string }): Promise<PublicacionComentarioRaw> {
    return db.publicacionComentario.create({
      data: { publicacionId: data.publicacionId, userId: data.userId, contenido: data.contenido, padreId: data.padreId ?? null, estado: "ACTIVO", editado: false },
    })
  }

  async findComentarioPublicacion(comentarioId: string): Promise<PublicacionComentarioRaw | null> {
    return db.publicacionComentario.findUnique({ where: { id: comentarioId } })
  }

  async editarComentarioPublicacion(comentarioId: string, contenido: string): Promise<PublicacionComentarioRaw> {
    return db.publicacionComentario.update({ where: { id: comentarioId }, data: { contenido, editado: true } })
  }

  async deleteRespuestasPublicacion(padreId: string): Promise<void> {
    await db.publicacionComentario.deleteMany({ where: { padreId } })
  }

  async deleteComentarioPublicacion(comentarioId: string): Promise<void> {
    await db.publicacionComentario.delete({ where: { id: comentarioId } })
  }

  async listarComentariosPublicacion(publicacionId: string, params: { take: number; page: number; order: "asc" | "desc" }): Promise<PaginatedResult<PublicacionComentarioRaw>> {
    const take = Math.min(100, Math.max(1, params.take))
    const page = Math.max(1, params.page)
    const skip = (page - 1) * take
    const where = { publicacionId, padreId: null }
    const [data, total] = await Promise.all([
      db.publicacionComentario.findMany({ where, take, skip, orderBy: { createdAt: params.order }, include: { respuestas: { orderBy: { createdAt: "asc" } } } }),
      db.publicacionComentario.count({ where }),
    ])
    return paginate(data, total, { take, skip })
  }

  // ─── Compartir ─────────────────────────────────────────────────────────────

  async registrarCompartido(data: { publicacionId: string; userId: string; plataforma: string }): Promise<PublicacionCompartidoRaw> {
    return db.publicacionCompartido.create({ data })
  }
}
