import type { IProductoSocialRepository, ProductoReaccionResult, ProductoComentarioRaw, ProductoValoracionRaw, ProductoPreguntaRaw, ProductoRespuestaRaw, ProductoFavoritoRaw, PaginatedResult } from "../domain/ports/IProductoSocialRepository.js"
import { paginate } from "../../../core/query-params.js"
import { prismaBase } from "../../../core/prisma-scoped.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prismaBase as any

export class ProductoSocialPrismaRepository implements IProductoSocialRepository {
  async findProductoTenantId(productoId: string): Promise<string | null> {
    const p = await db.producto.findUnique({ where: { id: productoId }, select: { tenantId: true } })
    return p?.tenantId ?? null
  }

  async productoExiste(productoId: string, tenantId: string): Promise<boolean> {
    const p = await db.producto.findFirst({ where: { id: productoId, tenantId }, select: { id: true } })
    return p !== null
  }

  // ─── Reacciones ───────────────────────────────────────────────────────────

  async toggleReaccionProducto(productoId: string, tenantId: string, userId: string, emoji: string): Promise<{ reaccion: ProductoReaccionResult | null; removed: boolean }> {
    const existing = await db.productoReaccion.findUnique({
      where: { productoId_userId_emoji: { productoId, userId, emoji } },
    })

    if (existing) {
      await db.productoReaccion.delete({ where: { id: existing.id } })
      return { reaccion: null, removed: true }
    }

    const reaccion = await db.productoReaccion.create({
      data: { productoId, tenantId, userId, emoji },
    })
    return { reaccion, removed: false }
  }

  async listarReaccionesProducto(productoId: string): Promise<{ emoji: string; count: number }[]> {
    const groups = await db.productoReaccion.groupBy({
      by: ["emoji"],
      where: { productoId },
      _count: { emoji: true },
    })
    return groups.map((g: { emoji: string; _count: { emoji: number } }) => ({ emoji: g.emoji, count: g._count.emoji }))
  }

  // ─── Comentarios ─────────────────────────────────────────────────────────

  async crearComentarioProducto(data: { productoId: string; tenantId: string; userId: string; contenido: string; padreId?: string }): Promise<ProductoComentarioRaw> {
    return db.productoComentario.create({
      data: {
        productoId: data.productoId,
        tenantId: data.tenantId,
        userId: data.userId,
        contenido: data.contenido,
        padreId: data.padreId ?? null,
        estado: "ACTIVO",
        editado: false,
      },
    })
  }

  async findComentarioProducto(comentarioId: string): Promise<ProductoComentarioRaw | null> {
    return db.productoComentario.findUnique({ where: { id: comentarioId } })
  }

  async editarComentarioProducto(comentarioId: string, contenido: string): Promise<ProductoComentarioRaw> {
    return db.productoComentario.update({
      where: { id: comentarioId },
      data: { contenido, editado: true },
    })
  }

  async deleteRespuestasProducto(padreId: string): Promise<void> {
    await db.productoComentario.deleteMany({ where: { padreId } })
  }

  async deleteComentarioProducto(comentarioId: string): Promise<void> {
    await db.productoComentario.delete({ where: { id: comentarioId } })
  }

  async listarComentariosProducto(productoId: string, tenantId: string, params: { take: number; page: number; order: "asc" | "desc"; soloRaiz?: boolean }): Promise<PaginatedResult<ProductoComentarioRaw>> {
    const take = Math.min(100, Math.max(1, params.take))
    const page = Math.max(1, params.page)
    const skip = (page - 1) * take
    const where: Record<string, unknown> = { productoId, tenantId }
    if (params.soloRaiz) where["padreId"] = null

    const [data, total] = await Promise.all([
      db.productoComentario.findMany({
        where, take, skip,
        orderBy: { createdAt: params.order },
        include: params.soloRaiz ? { respuestas: { orderBy: { createdAt: "asc" } } } : undefined,
      }),
      db.productoComentario.count({ where }),
    ])
    return paginate(data, total, { take, skip })
  }

  // ─── Valoraciones ─────────────────────────────────────────────────────────

  async upsertValoracionProducto(data: { productoId: string; tenantId: string; userId: string; puntuacion: number; resena?: string }): Promise<ProductoValoracionRaw> {
    return db.productoValoracion.upsert({
      where: { productoId_userId: { productoId: data.productoId, userId: data.userId } },
      create: { productoId: data.productoId, tenantId: data.tenantId, userId: data.userId, puntuacion: data.puntuacion, resena: data.resena ?? null, estado: "ACTIVO" },
      update: { puntuacion: data.puntuacion, resena: data.resena ?? null },
    })
  }

  async getPromedioValoracionesProducto(productoId: string): Promise<number> {
    const agg = await db.productoValoracion.aggregate({
      // Una valoracion oculta por el comercio no pesa en el promedio publico.
      // Es el mismo hueco que la spec 018 cerro con su cambio C2 para el
      // comercio y que en producto habia quedado abierto (019 FR-022).
      where: { productoId, estado: "ACTIVO" },
      _avg: { puntuacion: true },
    })
    return agg._avg.puntuacion ?? 0
  }

  async listarValoracionesProducto(productoId: string, tenantId: string, params: { take: number; page: number; order: "asc" | "desc"; orderBy?: string }): Promise<PaginatedResult<ProductoValoracionRaw>> {
    const take = Math.min(100, Math.max(1, params.take))
    const page = Math.max(1, params.page)
    const skip = (page - 1) * take
    const orderField = params.orderBy === "puntuacion" ? "puntuacion" : "createdAt"
    // La vitrina no lista valoraciones ocultas por el comercio (019 FR-022).
    const where = { productoId, tenantId, estado: "ACTIVO" }
    const [data, total] = await Promise.all([
      db.productoValoracion.findMany({ where, take, skip, orderBy: { [orderField]: params.order } }),
      db.productoValoracion.count({ where }),
    ])
    return paginate(data, total, { take, skip })
  }

  // ─── Preguntas ─────────────────────────────────────────────────────────────

  async crearPreguntaProducto(data: { productoId: string; tenantId: string; userId: string; pregunta: string }): Promise<ProductoPreguntaRaw> {
    return db.productoPregunta.create({
      data: { productoId: data.productoId, tenantId: data.tenantId, userId: data.userId, pregunta: data.pregunta, estado: "PENDIENTE" },
    })
  }

  async findPreguntaProducto(preguntaId: string): Promise<ProductoPreguntaRaw | null> {
    return db.productoPregunta.findUnique({ where: { id: preguntaId } })
  }

  async crearRespuestaProducto(data: { preguntaId: string; userId: string; respuesta: string }): Promise<ProductoRespuestaRaw> {
    const [respuesta] = await Promise.all([
      db.productoRespuesta.create({
        data: { preguntaId: data.preguntaId, userId: data.userId, respuesta: data.respuesta, estado: "ACTIVO" },
      }),
      db.productoPregunta.update({ where: { id: data.preguntaId }, data: { estado: "ACTIVO" } }),
    ])
    return respuesta
  }

  async listarPreguntasProducto(productoId: string, tenantId: string, params: { take: number; page: number; order: "asc" | "desc" }): Promise<PaginatedResult<ProductoPreguntaRaw>> {
    const take = Math.min(100, Math.max(1, params.take))
    const page = Math.max(1, params.page)
    const skip = (page - 1) * take
    const where = { productoId, tenantId }
    const [data, total] = await Promise.all([
      db.productoPregunta.findMany({ where, take, skip, orderBy: { createdAt: params.order }, include: { respuestas: { orderBy: { createdAt: "asc" } } } }),
      db.productoPregunta.count({ where }),
    ])
    return paginate(data, total, { take, skip })
  }

  // ─── Favoritos ─────────────────────────────────────────────────────────────

  async toggleFavoritoProducto(productoId: string, tenantId: string, userId: string): Promise<{ favorito: boolean }> {
    const existing = await db.productoFavorito.findUnique({
      where: { productoId_userId: { productoId, userId } },
    })

    if (existing) {
      await db.productoFavorito.delete({ where: { id: existing.id } })
      return { favorito: false }
    }

    await db.productoFavorito.create({ data: { productoId, tenantId, userId } })
    return { favorito: true }
  }

  async listarFavoritosUsuario(userId: string, params: { take: number; page: number }): Promise<PaginatedResult<ProductoFavoritoRaw>> {
    const take = Math.min(100, Math.max(1, params.take))
    const page = Math.max(1, params.page)
    const skip = (page - 1) * take
    const where = { userId }
    const [data, total] = await Promise.all([
      db.productoFavorito.findMany({ where, take, skip, orderBy: { createdAt: "desc" }, include: { producto: true } }),
      db.productoFavorito.count({ where }),
    ])
    return paginate(data, total, { take, skip })
  }

  /**
   * Ids de los productos de UN comercio que esta persona marco como favoritos.
   *
   * Sin esto la vitrina no puede pintar el corazon lleno al cargar: el toggle
   * existia, pero no habia forma de preguntar el estado, asi que al recargar la
   * pagina todos los corazones volvian a verse vacios aunque el favorito siguiera
   * guardado (spec 019 FR-038).
   *
   * Devuelve solo ids y acotado al comercio visitado: es lo unico que la tarjeta
   * necesita, y evita traer los favoritos de la persona en todas las tiendas.
   */
  async listarIdsFavoritosEnTienda(tenantId: string, userId: string): Promise<string[]> {
    const favoritos = await db.productoFavorito.findMany({
      where: { tenantId, userId },
      select: { productoId: true },
    })
    return favoritos.map((f: { productoId: string }) => f.productoId)
  }
}
