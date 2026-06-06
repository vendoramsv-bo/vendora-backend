import type {
  IConsultorioSocialRepository,
  ConsultorioReaccionRaw,
  ConsultorioComentarioRaw,
  ConsultorioValoracionRaw,
  ConsultorioPreguntaRaw,
  ConsultorioRespuestaRaw,
} from "../domain/ports/IConsultorioSocialRepository.js"
import type { PaginatedResult } from "../domain/ports/IRestauranteSocialRepository.js"
import { ConsultorioSocialNoActivoError } from "../domain/consultorio-social.errors.js"
import { paginate } from "../../../core/query-params.js"
import { prismaBase } from "../../../core/prisma-scoped.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prismaBase as any

export class ConsultorioSocialPrismaRepository implements IConsultorioSocialRepository {

  async resolveConsultorioInfo(slug: string): Promise<{ consultorioId: string; tenantId: string }> {
    const tenant = await db.tenant.findUnique({
      where: { slug },
      select: { id: true, esConsultorio: true, consultorio: { select: { id: true } } },
    })
    if (!tenant || !tenant.esConsultorio || !tenant.consultorio) throw new ConsultorioSocialNoActivoError(slug)
    return { consultorioId: tenant.consultorio.id, tenantId: tenant.id }
  }

  async upsertReaccion(consultorioId: string, userId: string, tipo: string): Promise<{ tipo: string | null; removed: boolean; reacciones: { tipo: string; total: number }[] }> {
    const existing = await db.consultorioReaccion.findUnique({ where: { consultorioId_userId: { consultorioId, userId } } })

    if (existing) {
      if (existing.tipo === tipo) {
        await db.consultorioReaccion.delete({ where: { id: existing.id } })
      } else {
        await db.consultorioReaccion.update({ where: { id: existing.id }, data: { tipo } })
      }
    } else {
      await db.consultorioReaccion.create({ data: { consultorioId, userId, tipo } })
    }

    const groups = await db.consultorioReaccion.groupBy({
      by: ["tipo"],
      where: { consultorioId },
      _count: { tipo: true },
    })
    const reacciones: { tipo: string; total: number }[] = groups.map((g: { tipo: string; _count: { tipo: number } }) => ({ tipo: g.tipo, total: g._count.tipo }))
    const removed = !!(existing && existing.tipo === tipo)
    return { tipo: removed ? null : tipo, removed, reacciones }
  }

  async listarReacciones(consultorioId: string): Promise<{ tipo: string; total: number }[]> {
    const groups = await db.consultorioReaccion.groupBy({ by: ["tipo"], where: { consultorioId }, _count: { tipo: true } })
    return groups.map((g: { tipo: string; _count: { tipo: number } }) => ({ tipo: g.tipo, total: g._count.tipo }))
  }

  async crearComentario(data: { consultorioId: string; userId: string; contenido: string; padreId?: string }): Promise<ConsultorioComentarioRaw> {
    return db.consultorioComentario.create({
      data: { consultorioId: data.consultorioId, userId: data.userId, contenido: data.contenido, padreId: data.padreId ?? null, estado: "ACTIVO", editado: false },
    })
  }

  async findComentario(comentarioId: string): Promise<ConsultorioComentarioRaw | null> {
    return db.consultorioComentario.findUnique({ where: { id: comentarioId } })
  }

  async listarComentarios(consultorioId: string, params: { take: number; page?: number; padreId?: string; order: "asc" | "desc" }): Promise<PaginatedResult<ConsultorioComentarioRaw>> {
    const take = Math.min(100, Math.max(1, params.take))
    const page = Math.max(1, params.page ?? 1)
    const skip = (page - 1) * take
    const where: Record<string, unknown> = { consultorioId, estado: "ACTIVO", padreId: params.padreId ?? null }
    const [data, total] = await Promise.all([
      db.consultorioComentario.findMany({
        where, skip, take, orderBy: { createdAt: params.order },
        include: { respuestas: { where: { estado: "ACTIVO" }, orderBy: { createdAt: "asc" }, take: 5 }, _count: { select: { respuestas: true } } },
      }),
      db.consultorioComentario.count({ where }),
    ])
    return paginate(data, total, { take, skip })
  }

  async responderComentario(data: { consultorioId: string; userId: string; contenido: string; padreId: string }): Promise<ConsultorioComentarioRaw> {
    return db.consultorioComentario.create({
      data: { consultorioId: data.consultorioId, userId: data.userId, contenido: data.contenido, padreId: data.padreId, estado: "ACTIVO", editado: false },
    })
  }

  async upsertValoracion(data: { consultorioId: string; userId: string; puntuacion: number; resena?: string }): Promise<ConsultorioValoracionRaw> {
    return db.consultorioValoracion.upsert({
      where: { consultorioId_userId: { consultorioId: data.consultorioId, userId: data.userId } },
      create: { consultorioId: data.consultorioId, userId: data.userId, puntuacion: data.puntuacion, resena: data.resena ?? null, estado: "ACTIVO" },
      update: { puntuacion: data.puntuacion, resena: data.resena ?? null },
    })
  }

  async getPromedioValoraciones(consultorioId: string): Promise<number> {
    const agg = await db.consultorioValoracion.aggregate({ where: { consultorioId }, _avg: { puntuacion: true } })
    return agg._avg.puntuacion ?? 0
  }

  async listarValoraciones(consultorioId: string, params: { take: number; page?: number; order: "asc" | "desc"; orderBy?: string }): Promise<PaginatedResult<ConsultorioValoracionRaw>> {
    const take = Math.min(100, Math.max(1, params.take))
    const page = Math.max(1, params.page ?? 1)
    const skip = (page - 1) * take
    const orderField = params.orderBy === "puntuacion" ? "puntuacion" : "createdAt"
    const where = { consultorioId }
    const [data, total] = await Promise.all([
      db.consultorioValoracion.findMany({ where, skip, take, orderBy: { [orderField]: params.order } }),
      db.consultorioValoracion.count({ where }),
    ])
    return paginate(data, total, { take, skip })
  }

  async crearPregunta(data: { consultorioId: string; userId: string; pregunta: string }): Promise<ConsultorioPreguntaRaw> {
    return db.consultorioPregunta.create({ data: { consultorioId: data.consultorioId, userId: data.userId, pregunta: data.pregunta } })
  }

  async findPregunta(preguntaId: string): Promise<ConsultorioPreguntaRaw | null> {
    return db.consultorioPregunta.findUnique({ where: { id: preguntaId }, include: { respuestas: { orderBy: { createdAt: "asc" } } } })
  }

  async responderPregunta(data: { preguntaId: string; userId: string; respuesta: string }): Promise<ConsultorioRespuestaRaw> {
    return db.consultorioRespuesta.create({ data: { preguntaId: data.preguntaId, userId: data.userId, respuesta: data.respuesta, estado: "ACTIVO" } })
  }

  async ocultarPregunta(preguntaId: string, consultorioId: string): Promise<ConsultorioPreguntaRaw> {
    return db.consultorioPregunta.update({ where: { id: preguntaId, consultorioId }, data: { estado: "INACTIVO" } })
  }

  async mostrarPregunta(preguntaId: string, consultorioId: string): Promise<ConsultorioPreguntaRaw> {
    return db.consultorioPregunta.update({ where: { id: preguntaId, consultorioId }, data: { estado: "ACTIVO" } })
  }

  async listarPreguntas(consultorioId: string, params: { take: number; page?: number; order: "asc" | "desc"; incluirInactivas?: boolean }): Promise<PaginatedResult<ConsultorioPreguntaRaw>> {
    const take = Math.min(100, Math.max(1, params.take))
    const page = Math.max(1, params.page ?? 1)
    const skip = (page - 1) * take
    const where: Record<string, unknown> = { consultorioId }
    if (!params.incluirInactivas) where["estado"] = "ACTIVO"
    const [data, total] = await Promise.all([
      db.consultorioPregunta.findMany({
        where, skip, take, orderBy: { createdAt: params.order },
        include: { respuestas: { where: { estado: "ACTIVO" }, orderBy: { createdAt: "asc" } } },
      }),
      db.consultorioPregunta.count({ where }),
    ])
    return paginate(data, total, { take, skip })
  }

  async toggleFavorito(consultorioId: string, userId: string): Promise<{ favorito: boolean }> {
    const existing = await db.consultorioFavorito.findUnique({ where: { consultorioId_userId: { consultorioId, userId } } })
    if (existing) {
      await db.consultorioFavorito.delete({ where: { id: existing.id } })
      return { favorito: false }
    }
    await db.consultorioFavorito.create({ data: { consultorioId, userId } })
    return { favorito: true }
  }

  async toggleSeguir(consultorioId: string, userId: string): Promise<{ siguiendo: boolean; totalSeguidores: number }> {
    const existing = await db.consultorioSeguidor.findUnique({ where: { consultorioId_userId: { consultorioId, userId } } })
    if (existing) {
      await db.consultorioSeguidor.delete({ where: { id: existing.id } })
    } else {
      await db.consultorioSeguidor.create({ data: { consultorioId, userId } })
    }
    const totalSeguidores = await db.consultorioSeguidor.count({ where: { consultorioId } })
    return { siguiendo: !existing, totalSeguidores }
  }

  async getTotalSeguidores(consultorioId: string): Promise<number> {
    return db.consultorioSeguidor.count({ where: { consultorioId } })
  }

  async crearPublicacion(data: {
    tenantId: string; autorId: string; titulo?: string; contenido: string; tipo: string; etiquetas?: string[]; medios?: { tipo: string; url?: string; embedUrl?: string }[]
  }): Promise<{ id: string; estado: string; createdAt: Date }> {
    return db.publicacion.create({
      data: {
        tenantId: data.tenantId, autorId: data.autorId, titulo: data.titulo ?? null,
        contenido: data.contenido, tipo: data.tipo, estado: "PUBLICADO",
        etiquetas: data.etiquetas ?? [],
        medios: { create: (data.medios ?? []).map((m, i) => ({ tipo: m.tipo, url: m.url ?? null, embedUrl: m.embedUrl ?? null, thumbnailUrl: null, plataforma: null, titulo: null, orden: i })) },
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
