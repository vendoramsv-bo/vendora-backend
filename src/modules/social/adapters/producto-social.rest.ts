import { Hono } from "hono"
import { requireAuth, type HonoEnv } from "../../../core/hono-context.js"
import { ProductoSocialPrismaRepository } from "../infrastructure/producto-social.prisma.repository.js"
import { getSocialNotificador } from "../infrastructure/social.notificador.provider.js"
import { ReaccionarProductoUseCase } from "../application/producto/reaccionar-producto.usecase.js"
import { ComentarProductoUseCase } from "../application/producto/comentar-producto.usecase.js"
import { EditarComentarioProductoUseCase } from "../application/producto/editar-comentario-producto.usecase.js"
import { EliminarComentarioProductoUseCase } from "../application/producto/eliminar-comentario-producto.usecase.js"
import { ValorarProductoUseCase } from "../application/producto/valorar-producto.usecase.js"
import { PreguntarProductoUseCase } from "../application/producto/preguntar-producto.usecase.js"
import { ResponderPreguntaProductoUseCase } from "../application/producto/responder-pregunta-producto.usecase.js"
import { ToggleFavoritoProductoUseCase } from "../application/producto/toggle-favorito-producto.usecase.js"
import { ListarComentariosProductoUseCase } from "../application/producto/listar-comentarios-producto.usecase.js"
import { ListarValoracionesProductoUseCase } from "../application/producto/listar-valoraciones-producto.usecase.js"
import { ListarPreguntasProductoUseCase } from "../application/producto/listar-preguntas-producto.usecase.js"
import { ReaccionProductoSchema, ComentarioSchema, ValoracionSchema, PreguntaSchema, RespuestaSchema } from "./social.schema.js"
import {
  ProductoNoEncontrado,
  ComentarioNoEncontrado,
  PreguntaNoEncontrada,
  NoAutorizado,
  ComentarioEsRespuesta,
  PuntuacionInvalida,
} from "../domain/social.errors.js"
import { prismaBase } from "../../../core/prisma-scoped.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prismaBase as any

function makeRepo() { return new ProductoSocialPrismaRepository() }

async function resolveSlugTenantId(slug: string): Promise<string | null> {
  const t = await db.tenant.findUnique({ where: { slug }, select: { id: true } })
  return t?.id ?? null
}

function getRol(c: Parameters<typeof requireAuth>[0]): string | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (c.get("session") as any)?.session?.activeOrganizationRole ?? undefined
}

function handleSocialError(err: unknown, c: { json: (v: unknown, s: number) => Response }) {
  if (err instanceof ProductoNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
  if (err instanceof ComentarioNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
  if (err instanceof PreguntaNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
  if (err instanceof NoAutorizado) return c.json({ error: err.code, message: err.message }, 403)
  if (err instanceof ComentarioEsRespuesta) return c.json({ error: err.code, message: err.message }, 422)
  if (err instanceof PuntuacionInvalida) return c.json({ error: err.code, message: err.message }, 400)
  throw err
}

// ─── Rutas autenticadas (cualquier usuario) ────────────────────────────────────

export const productoSocialRouter = new Hono<HonoEnv>()
productoSocialRouter.use("*", requireAuth)

productoSocialRouter.post("/productos/:productoId/reaccionar", async (c) => {
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = ReaccionProductoSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

  try {
    const result = await new ReaccionarProductoUseCase(makeRepo(), getSocialNotificador()).ejecutar(
      c.req.param("productoId"),
      session.user.id,
      parsed.data.emoji,
    )
    return c.json(result)
  } catch (err) { return handleSocialError(err, c) as Response }
})

productoSocialRouter.post("/productos/:productoId/comentarios", async (c) => {
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = ComentarioSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

  try {
    const comentario = await new ComentarProductoUseCase(makeRepo(), getSocialNotificador()).ejecutar(
      c.req.param("productoId"),
      session.user.id,
      parsed.data.contenido,
      parsed.data.padreId,
    )
    return c.json(comentario, 201)
  } catch (err) { return handleSocialError(err, c) as Response }
})

productoSocialRouter.put("/comentarios/producto/:comentarioId", async (c) => {
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = ComentarioSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

  try {
    const comentario = await new EditarComentarioProductoUseCase(makeRepo()).ejecutar(
      c.req.param("comentarioId"),
      session.user.id,
      parsed.data.contenido,
      getRol(c),
    )
    return c.json(comentario)
  } catch (err) { return handleSocialError(err, c) as Response }
})

productoSocialRouter.delete("/comentarios/producto/:comentarioId", async (c) => {
  const session = c.get("session")
  try {
    const result = await new EliminarComentarioProductoUseCase(makeRepo()).ejecutar(
      c.req.param("comentarioId"),
      session.user.id,
      getRol(c),
    )
    return c.json(result)
  } catch (err) { return handleSocialError(err, c) as Response }
})

productoSocialRouter.post("/productos/:productoId/valorar", async (c) => {
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = ValoracionSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

  try {
    const valoracion = await new ValorarProductoUseCase(makeRepo(), getSocialNotificador()).ejecutar(
      c.req.param("productoId"),
      session.user.id,
      parsed.data.puntuacion,
      parsed.data.resena,
    )
    return c.json(valoracion)
  } catch (err) { return handleSocialError(err, c) as Response }
})

productoSocialRouter.post("/productos/:productoId/preguntas", async (c) => {
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = PreguntaSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

  try {
    const pregunta = await new PreguntarProductoUseCase(makeRepo()).ejecutar(
      c.req.param("productoId"),
      session.user.id,
      parsed.data.pregunta,
    )
    return c.json(pregunta, 201)
  } catch (err) { return handleSocialError(err, c) as Response }
})

productoSocialRouter.post("/preguntas/producto/:preguntaId/respuestas", async (c) => {
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = RespuestaSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

  try {
    const respuesta = await new ResponderPreguntaProductoUseCase(makeRepo()).ejecutar(
      c.req.param("preguntaId"),
      session.user.id,
      parsed.data.respuesta,
    )
    return c.json(respuesta, 201)
  } catch (err) { return handleSocialError(err, c) as Response }
})

productoSocialRouter.post("/productos/:productoId/favorito", async (c) => {
  const session = c.get("session")
  try {
    const result = await new ToggleFavoritoProductoUseCase(makeRepo()).ejecutar(
      c.req.param("productoId"),
      session.user.id,
    )
    return c.json(result)
  } catch (err) { return handleSocialError(err, c) as Response }
})

// ─── Rutas públicas (sin auth) ─────────────────────────────────────────────────

export const publicProductoSocialRouter = new Hono<HonoEnv>()

publicProductoSocialRouter.get("/:slug/productos/:productoId/reacciones", async (c) => {
  const tenantId = await resolveSlugTenantId(c.req.param("slug"))
  if (!tenantId) return c.json({ error: "TIENDA_NO_ENCONTRADA" }, 404)

  const reacciones = await makeRepo().listarReaccionesProducto(c.req.param("productoId"))
  return c.json({ data: reacciones, meta: { total: reacciones.reduce((s, r) => s + r.count, 0) } })
})

publicProductoSocialRouter.get("/:slug/productos/:productoId/comentarios", async (c) => {
  const tenantId = await resolveSlugTenantId(c.req.param("slug"))
  if (!tenantId) return c.json({ error: "TIENDA_NO_ENCONTRADA" }, 404)

  const q = c.req.query()
  const take = Math.min(Number(q.take ?? 20), 100)
  const skip = Number(q.skip ?? 0)
  const order = (q.order === "asc" ? "asc" : "desc") as "asc" | "desc"
  const soloRaiz = q.soloRaiz === "true"

  const result = await new ListarComentariosProductoUseCase(makeRepo()).ejecutar(
    c.req.param("productoId"),
    tenantId,
    { take, skip, order, soloRaiz },
  )
  return c.json({ data: result.data, meta: { total: result.total, hasMore: skip + result.data.length < result.total } })
})

publicProductoSocialRouter.get("/:slug/productos/:productoId/valoraciones", async (c) => {
  const tenantId = await resolveSlugTenantId(c.req.param("slug"))
  if (!tenantId) return c.json({ error: "TIENDA_NO_ENCONTRADA" }, 404)

  const q = c.req.query()
  const take = Math.min(Number(q.take ?? 20), 100)
  const skip = Number(q.skip ?? 0)
  const order = (q.order === "asc" ? "asc" : "desc") as "asc" | "desc"

  const result = await new ListarValoracionesProductoUseCase(makeRepo()).ejecutar(
    c.req.param("productoId"),
    tenantId,
    { take, skip, order, orderBy: q.orderBy },
  )
  return c.json(result)
})

publicProductoSocialRouter.get("/:slug/productos/:productoId/preguntas", async (c) => {
  const tenantId = await resolveSlugTenantId(c.req.param("slug"))
  if (!tenantId) return c.json({ error: "TIENDA_NO_ENCONTRADA" }, 404)

  const q = c.req.query()
  const take = Math.min(Number(q.take ?? 20), 100)
  const skip = Number(q.skip ?? 0)
  const order = (q.order === "asc" ? "asc" : "desc") as "asc" | "desc"

  const result = await new ListarPreguntasProductoUseCase(makeRepo()).ejecutar(
    c.req.param("productoId"),
    tenantId,
    { take, skip, order },
  )
  return c.json({ data: result.data, meta: { total: result.total, hasMore: skip + result.data.length < result.total } })
})
