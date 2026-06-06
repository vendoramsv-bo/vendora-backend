import type {
  IRestauranteSocialRepository,
  RestauranteReaccionRaw,
  RestauranteComentarioRaw,
  RestauranteValoracionRaw,
  RestaurantePreguntaRaw,
  RestauranteRespuestaRaw,
  PaginatedResult,
} from "../domain/ports/IRestauranteSocialRepository.js"
import { paginate } from "../../../core/query-params.js"
import { prismaBase } from "../../../core/prisma-scoped.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prismaBase as any

export class RestauranteSocialPrismaRepository implements IRestauranteSocialRepository {
  async resolveRestauranteInfo(slug: string): Promise<{ restauranteId: string; tenantId: string }> {
    const tenant = await db.tenant.findUnique({
      where: { slug },
      select: { id: true, esRestaurante: true, restaurante: { select: { id: true } } },
    })
    if (!tenant || !tenant.esRestaurante || !tenant.restaurante) throw new Error("Restaurante no encontrado")
    return { restauranteId: tenant.restaurante.id, tenantId: tenant.id }
  }

  // ─── Reacciones ────────────────────────────────────────────────────────────

  async upsertReaccion(restauranteId: string, userId: string, tipo: string): Promise<{ tipo: string | null; removed: boolean; reacciones: { tipo: string; total: number }[] }> {
    const existing = await db.restauranteReaccion.findUnique({ where: { restauranteId_userId: { restauranteId, userId } } })

    if (existing) {
      if (existing.tipo === tipo) {
        await db.restauranteReaccion.delete({ where: { id: existing.id } })
      } else {
        await db.restauranteReaccion.update({ where: { id: existing.id }, data: { tipo } })
      }
    } else {
      await db.restauranteReaccion.create({ data: { restauranteId, userId, tipo } })
    }

    const groups = await db.restauranteReaccion.groupBy({
      by: ["tipo"],
      where: { restauranteId },
      _count: { tipo: true },
    })
    const reacciones: { tipo: string; total: number }[] = groups.map((g: { tipo: string; _count: { tipo: number } }) => ({ tipo: g.tipo, total: g._count.tipo }))
    const removed = !!(existing && existing.tipo === tipo)
    return { tipo: removed ? null : tipo, removed, reacciones }
  }

  async listarReacciones(restauranteId: string): Promise<{ tipo: string; total: number }[]> {
    const groups = await db.restauranteReaccion.groupBy({
      by: ["tipo"],
      where: { restauranteId },
      _count: { tipo: true },
    })
    return groups.map((g: { tipo: string; _count: { tipo: number } }) => ({ tipo: g.tipo, total: g._count.tipo }))
  }

  // ─── Comentarios ──────────────────────────────────────────────────────────

  async crearComentario(data: { restauranteId: string; userId: string; contenido: string; padreId?: string }): Promise<RestauranteComentarioRaw> {
    return db.restauranteComentario.create({
      data: { restauranteId: data.restauranteId, userId: data.userId, contenido: data.contenido, padreId: data.padreId ?? null, estado: "ACTIVO", editado: false },
    })
  }

  async findComentario(comentarioId: string): Promise<RestauranteComentarioRaw | null> {
    return db.restauranteComentario.findUnique({ where: { id: comentarioId } })
  }

  async listarComentarios(restauranteId: string, params: { take: number; page?: number; padreId?: string; order: "asc" | "desc" }): Promise<PaginatedResult<RestauranteComentarioRaw>> {
    const take = Math.min(100, Math.max(1, params.take))
    const page = Math.max(1, params.page ?? 1)
    const skip = (page - 1) * take
    const where: Record<string, unknown> = { restauranteId, estado: "ACTIVO", padreId: params.padreId ?? null }
    const [data, total] = await Promise.all([
      db.restauranteComentario.findMany({
        where, skip, take,
        orderBy: { createdAt: params.order },
        include: {
          respuestas: { where: { estado: "ACTIVO" }, orderBy: { createdAt: "asc" }, take: 5 },
          _count: { select: { respuestas: true } },
        },
      }),
      db.restauranteComentario.count({ where }),
    ])
    return paginate(data, total, { take, skip })
  }

  async responderComentario(data: { restauranteId: string; userId: string; contenido: string; padreId: string }): Promise<RestauranteComentarioRaw> {
    return db.restauranteComentario.create({
      data: { restauranteId: data.restauranteId, userId: data.userId, contenido: data.contenido, padreId: data.padreId, estado: "ACTIVO", editado: false },
    })
  }

  // ─── Valoraciones ─────────────────────────────────────────────────────────

  async upsertValoracion(data: { restauranteId: string; userId: string; puntuacion: number; resena?: string }): Promise<RestauranteValoracionRaw> {
    return db.restauranteValoracion.upsert({
      where: { restauranteId_userId: { restauranteId: data.restauranteId, userId: data.userId } },
      create: { restauranteId: data.restauranteId, userId: data.userId, puntuacion: data.puntuacion, resena: data.resena ?? null, estado: "ACTIVO" },
      update: { puntuacion: data.puntuacion, resena: data.resena ?? null },
    })
  }

  async getPromedioValoraciones(restauranteId: string): Promise<number> {
    const agg = await db.restauranteValoracion.aggregate({ where: { restauranteId }, _avg: { puntuacion: true } })
    return agg._avg.puntuacion ?? 0
  }

  async listarValoraciones(restauranteId: string, params: { take: number; page?: number; order: "asc" | "desc"; orderBy?: string }): Promise<PaginatedResult<RestauranteValoracionRaw>> {
    const take = Math.min(100, Math.max(1, params.take))
    const page = Math.max(1, params.page ?? 1)
    const skip = (page - 1) * take
    const orderField = params.orderBy === "puntuacion" ? "puntuacion" : "createdAt"
    const where = { restauranteId }
    const [data, total] = await Promise.all([
      db.restauranteValoracion.findMany({ where, skip, take, orderBy: { [orderField]: params.order } }),
      db.restauranteValoracion.count({ where }),
    ])
    return paginate(data, total, { take, skip })
  }

  // ─── Preguntas ────────────────────────────────────────────────────────────

  async crearPregunta(data: { restauranteId: string; userId: string; pregunta: string }): Promise<RestaurantePreguntaRaw> {
    return db.restaurantePregunta.create({ data: { restauranteId: data.restauranteId, userId: data.userId, pregunta: data.pregunta } })
  }

  async findPregunta(preguntaId: string): Promise<RestaurantePreguntaRaw | null> {
    return db.restaurantePregunta.findUnique({ where: { id: preguntaId }, include: { respuestas: { orderBy: { createdAt: "asc" } } } })
  }

  async responderPregunta(data: { preguntaId: string; userId: string; respuesta: string }): Promise<RestauranteRespuestaRaw> {
    return db.restauranteRespuesta.create({ data: { preguntaId: data.preguntaId, userId: data.userId, respuesta: data.respuesta, estado: "ACTIVO" } })
  }

  async ocultarPregunta(preguntaId: string, restauranteId: string): Promise<RestaurantePreguntaRaw> {
    return db.restaurantePregunta.update({ where: { id: preguntaId, restauranteId }, data: { estado: "INACTIVO" } })
  }

  async mostrarPregunta(preguntaId: string, restauranteId: string): Promise<RestaurantePreguntaRaw> {
    return db.restaurantePregunta.update({ where: { id: preguntaId, restauranteId }, data: { estado: "ACTIVO" } })
  }

  async listarPreguntas(restauranteId: string, params: { take: number; page?: number; order: "asc" | "desc"; incluirInactivas?: boolean }): Promise<PaginatedResult<RestaurantePreguntaRaw>> {
    const take = Math.min(100, Math.max(1, params.take))
    const page = Math.max(1, params.page ?? 1)
    const skip = (page - 1) * take
    const where: Record<string, unknown> = { restauranteId }
    if (!params.incluirInactivas) where["estado"] = "ACTIVO"
    const [data, total] = await Promise.all([
      db.restaurantePregunta.findMany({
        where, skip, take,
        orderBy: { createdAt: params.order },
        include: { respuestas: { where: { estado: "ACTIVO" }, orderBy: { createdAt: "asc" } } },
      }),
      db.restaurantePregunta.count({ where }),
    ])
    return paginate(data, total, { take, skip })
  }

  // ─── Favoritos y Seguimiento ───────────────────────────────────────────────

  async toggleFavorito(restauranteId: string, userId: string): Promise<{ favorito: boolean }> {
    const existing = await db.restauranteFavorito.findUnique({ where: { restauranteId_userId: { restauranteId, userId } } })
    if (existing) {
      await db.restauranteFavorito.delete({ where: { id: existing.id } })
      return { favorito: false }
    }
    await db.restauranteFavorito.create({ data: { restauranteId, userId } })
    return { favorito: true }
  }

  async toggleSeguir(restauranteId: string, userId: string): Promise<{ siguiendo: boolean; totalSeguidores: number }> {
    const existing = await db.restauranteSeguidor.findUnique({ where: { restauranteId_userId: { restauranteId, userId } } })
    if (existing) {
      await db.restauranteSeguidor.delete({ where: { id: existing.id } })
    } else {
      await db.restauranteSeguidor.create({ data: { restauranteId, userId } })
    }
    const totalSeguidores = await db.restauranteSeguidor.count({ where: { restauranteId } })
    return { siguiendo: !existing, totalSeguidores }
  }

  async listarSeguidores(restauranteId: string, params: { take: number; page?: number }): Promise<PaginatedResult<{ userId: string; createdAt: Date }>> {
    const take = Math.max(1, params.take)
    const page = Math.max(1, params.page ?? 1)
    const skip = (page - 1) * take
    const [data, total] = await Promise.all([
      db.restauranteSeguidor.findMany({ where: { restauranteId }, skip, take, orderBy: { createdAt: "desc" }, select: { id: true, userId: true, createdAt: true } }),
      db.restauranteSeguidor.count({ where: { restauranteId } }),
    ])
    return paginate(data, total, { take, skip })
  }

  // ─── Publicaciones de novedad ──────────────────────────────────────────────

  async crearPublicacion(data: {
    tenantId: string
    autorId: string
    titulo?: string
    contenido: string
    tipo: string
    etiquetas?: string[]
    medios?: { tipo: string; url?: string; embedUrl?: string }[]
  }): Promise<{ id: string; estado: string; createdAt: Date }> {
    return db.publicacion.create({
      data: {
        tenantId: data.tenantId,
        autorId: data.autorId,
        titulo: data.titulo ?? null,
        contenido: data.contenido,
        tipo: data.tipo,
        estado: "PUBLICADO",
        etiquetas: data.etiquetas ?? [],
        medios: {
          create: (data.medios ?? []).map((m, i) => ({
            tipo: m.tipo,
            url: m.url ?? null,
            embedUrl: m.embedUrl ?? null,
            thumbnailUrl: null,
            plataforma: null,
            titulo: null,
            orden: i,
          })),
        },
      },
      select: { id: true, estado: true, createdAt: true },
    })
  }

  async listarPublicaciones(tenantId: string, params: { take: number; page?: number }): Promise<PaginatedResult<unknown>> {
    const take = Math.min(100, Math.max(1, params.take))
    const page = Math.max(1, params.page ?? 1)
    const skip = (page - 1) * take
    const where = { tenantId, estado: "PUBLICADO" }
    const [data, total] = await Promise.all([
      db.publicacion.findMany({ where, skip, take, orderBy: { publicadoEn: "desc" }, include: { medios: { orderBy: { orden: "asc" } } } }),
      db.publicacion.count({ where }),
    ])
    return paginate(data, total, { take, skip })
  }
}
