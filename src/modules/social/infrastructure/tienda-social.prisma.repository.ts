import type { ITiendaSocialRepository, TiendaReaccionRaw, TiendaComentarioRaw, TiendaValoracionRaw, TiendaPreguntaRaw, TiendaRespuestaRaw, TiendaFavoritoRaw, PaginatedResult } from "../domain/ports/ITiendaSocialRepository.js"
import { TiendaNoEncontrada } from "../domain/social.errors.js"
import { paginate } from "../../../core/query-params.js"
import { prismaBase } from "../../../core/prisma-scoped.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prismaBase as any

export class TiendaSocialPrismaRepository implements ITiendaSocialRepository {
  async resolveTiendaId(slug: string): Promise<string> {
    const tenant = await db.tenant.findUnique({ where: { slug }, select: { id: true, esTienda: true, tienda: { select: { id: true } } } })
    if (!tenant || !tenant.esTienda || !tenant.tienda) throw new TiendaNoEncontrada()
    return tenant.tienda.id
  }

  async resolveTiendaInfo(slug: string): Promise<{ tiendaId: string; tenantId: string }> {
    const tenant = await db.tenant.findUnique({ where: { slug }, select: { id: true, esTienda: true, tienda: { select: { id: true } } } })
    if (!tenant || !tenant.esTienda || !tenant.tienda) throw new TiendaNoEncontrada()
    return { tiendaId: tenant.tienda.id, tenantId: tenant.id }
  }

  // ─── Reacciones ───────────────────────────────────────────────────────────

  async upsertReaccionTienda(tiendaId: string, userId: string, tipo: string): Promise<{ reaccion: TiendaReaccionRaw | null; removed: boolean }> {
    const existing = await db.tiendaReaccion.findUnique({
      where: { tiendaId_userId: { tiendaId, userId } },
    })

    if (existing) {
      if (existing.tipo === tipo) {
        await db.tiendaReaccion.delete({ where: { id: existing.id } })
        return { reaccion: null, removed: true }
      }
      const updated = await db.tiendaReaccion.update({ where: { id: existing.id }, data: { tipo } })
      return { reaccion: updated, removed: false }
    }

    const reaccion = await db.tiendaReaccion.create({ data: { tiendaId, userId, tipo } })
    return { reaccion, removed: false }
  }

  async listarReaccionesTienda(tiendaId: string): Promise<{ tipo: string; count: number }[]> {
    const groups = await db.tiendaReaccion.groupBy({
      by: ["tipo"],
      where: { tiendaId },
      _count: { tipo: true },
    })
    return groups.map((g: { tipo: string; _count: { tipo: number } }) => ({ tipo: g.tipo, count: g._count.tipo }))
  }

  // ─── Comentarios ─────────────────────────────────────────────────────────

  async crearComentarioTienda(data: { tiendaId: string; userId: string; contenido: string; padreId?: string }): Promise<TiendaComentarioRaw> {
    return db.tiendaComentario.create({
      data: {
        tiendaId: data.tiendaId,
        userId: data.userId,
        contenido: data.contenido,
        padreId: data.padreId ?? null,
        estado: "ACTIVO",
        editado: false,
      },
    })
  }

  async findComentarioTienda(comentarioId: string): Promise<TiendaComentarioRaw | null> {
    return db.tiendaComentario.findUnique({ where: { id: comentarioId } })
  }

  async editarComentarioTienda(comentarioId: string, contenido: string): Promise<TiendaComentarioRaw> {
    return db.tiendaComentario.update({ where: { id: comentarioId }, data: { contenido, editado: true } })
  }

  async deleteRespuestasTienda(padreId: string): Promise<void> {
    await db.tiendaComentario.deleteMany({ where: { padreId } })
  }

  async deleteComentarioTienda(comentarioId: string): Promise<void> {
    await db.tiendaComentario.delete({ where: { id: comentarioId } })
  }

  async listarComentariosTienda(tiendaId: string, params: { take: number; page: number; order: "asc" | "desc" }): Promise<PaginatedResult<TiendaComentarioRaw>> {
    const take = Math.min(100, Math.max(1, params.take))
    const page = Math.max(1, params.page)
    const skip = (page - 1) * take
    const where = { tiendaId, padreId: null }
    const [data, total] = await Promise.all([
      db.tiendaComentario.findMany({
        where, take, skip,
        orderBy: { createdAt: params.order },
        include: { respuestas: { orderBy: { createdAt: "asc" } } },
      }),
      db.tiendaComentario.count({ where }),
    ])
    return paginate(data, total, { take, skip })
  }

  // ─── Valoraciones ─────────────────────────────────────────────────────────

  async upsertValoracionTienda(data: { tiendaId: string; userId: string; puntuacion: number; resena?: string }): Promise<TiendaValoracionRaw> {
    return db.tiendaValoracion.upsert({
      where: { tiendaId_userId: { tiendaId: data.tiendaId, userId: data.userId } },
      create: { tiendaId: data.tiendaId, userId: data.userId, puntuacion: data.puntuacion, resena: data.resena ?? null, estado: "ACTIVO" },
      update: { puntuacion: data.puntuacion, resena: data.resena ?? null },
    })
  }

  async getPromedioValoracionesTienda(tiendaId: string): Promise<number> {
    const agg = await db.tiendaValoracion.aggregate({ where: { tiendaId }, _avg: { puntuacion: true } })
    return agg._avg.puntuacion ?? 0
  }

  async listarValoracionesTienda(tiendaId: string, params: { take: number; page: number; order: "asc" | "desc"; orderBy?: string }): Promise<PaginatedResult<TiendaValoracionRaw>> {
    const take = Math.min(100, Math.max(1, params.take))
    const page = Math.max(1, params.page)
    const skip = (page - 1) * take
    const orderField = params.orderBy === "puntuacion" ? "puntuacion" : "createdAt"
    const where = { tiendaId }
    const [data, total] = await Promise.all([
      db.tiendaValoracion.findMany({ where, take, skip, orderBy: { [orderField]: params.order } }),
      db.tiendaValoracion.count({ where }),
    ])
    return paginate(data, total, { take, skip })
  }

  // ─── Preguntas ─────────────────────────────────────────────────────────────

  async crearPreguntaTienda(data: { tiendaId: string; userId: string; pregunta: string }): Promise<TiendaPreguntaRaw> {
    return db.tiendaPregunta.create({ data: { tiendaId: data.tiendaId, userId: data.userId, pregunta: data.pregunta } })
  }

  async findPreguntaTienda(preguntaId: string): Promise<TiendaPreguntaRaw | null> {
    return db.tiendaPregunta.findUnique({ where: { id: preguntaId } })
  }

  async crearRespuestaTienda(data: { preguntaId: string; userId: string; respuesta: string }): Promise<TiendaRespuestaRaw> {
    const [respuesta] = await Promise.all([
      db.tiendaRespuesta.create({ data: { preguntaId: data.preguntaId, userId: data.userId, respuesta: data.respuesta, estado: "ACTIVO" } }),
      db.tiendaPregunta.update({ where: { id: data.preguntaId }, data: { estado: "ACTIVO" } }),
    ])
    return respuesta
  }

  async listarPreguntasTienda(tiendaId: string, params: { take: number; page: number; order: "asc" | "desc" }): Promise<PaginatedResult<TiendaPreguntaRaw>> {
    const take = Math.min(100, Math.max(1, params.take))
    const page = Math.max(1, params.page)
    const skip = (page - 1) * take
    const where = { tiendaId, estado: "ACTIVO" }
    const [data, total] = await Promise.all([
      db.tiendaPregunta.findMany({ where, take, skip, orderBy: { createdAt: params.order }, include: { respuestas: { where: { estado: "ACTIVO" }, orderBy: { createdAt: "asc" } } } }),
      db.tiendaPregunta.count({ where }),
    ])
    return paginate(data, total, { take, skip })
  }

  // ─── Favoritos y Seguimiento ───────────────────────────────────────────────

  async toggleFavoritoTienda(tiendaId: string, userId: string): Promise<{ favorito: boolean }> {
    const existing = await db.tiendaFavorito.findUnique({ where: { tiendaId_userId: { tiendaId, userId } } })
    if (existing) {
      await db.tiendaFavorito.delete({ where: { id: existing.id } })
      return { favorito: false }
    }
    await db.tiendaFavorito.create({ data: { tiendaId, userId } })
    return { favorito: true }
  }

  async toggleSeguirTienda(tiendaId: string, userId: string): Promise<{ siguiendo: boolean }> {
    const existing = await db.tiendaSeguidor.findUnique({ where: { tiendaId_userId: { tiendaId, userId } } })
    if (existing) {
      await db.tiendaSeguidor.delete({ where: { id: existing.id } })
      return { siguiendo: false }
    }
    await db.tiendaSeguidor.create({ data: { tiendaId, userId } })
    return { siguiendo: true }
  }

  async contarSeguidoresTienda(tiendaId: string): Promise<number> {
    return db.tiendaSeguidor.count({ where: { tiendaId } })
  }

  async listarFavoritosTiendasUsuario(userId: string, params: { take: number; page: number }): Promise<PaginatedResult<TiendaFavoritoRaw>> {
    const take = Math.min(100, Math.max(1, params.take))
    const page = Math.max(1, params.page)
    const skip = (page - 1) * take
    const where = { userId }
    const [data, total] = await Promise.all([
      db.tiendaFavorito.findMany({ where, take, skip, orderBy: { createdAt: "desc" }, include: { tienda: true } }),
      db.tiendaFavorito.count({ where }),
    ])
    return paginate(data, total, { take, skip })
  }

  async ocultarPreguntaTienda(preguntaId: string, tiendaId: string): Promise<TiendaPreguntaRaw> {
    return db.tiendaPregunta.update({
      where: { id: preguntaId, tiendaId },
      data: { estado: "INACTIVO" },
    })
  }

  async mostrarPreguntaTienda(preguntaId: string, tiendaId: string): Promise<TiendaPreguntaRaw> {
    return db.tiendaPregunta.update({
      where: { id: preguntaId, tiendaId },
      data: { estado: "ACTIVO" },
    })
  }

  async esFavoritoTienda(tiendaId: string, userId: string): Promise<boolean> {
    const fav = await db.tiendaFavorito.findUnique({ where: { tiendaId_userId: { tiendaId, userId } }, select: { id: true } })
    return !!fav
  }
}
