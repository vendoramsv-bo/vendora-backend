import { Hono } from "hono"
import { requireAuth, type HonoEnv } from "../../../core/hono-context.js"
import { TiendaSocialPrismaRepository } from "../infrastructure/tienda-social.prisma.repository.js"
import { getSocialNotificador } from "../infrastructure/social.notificador.provider.js"
import { ReaccionarTiendaUseCase } from "../application/tienda/reaccionar-tienda.usecase.js"
import { ComentarTiendaUseCase } from "../application/tienda/comentar-tienda.usecase.js"
import { EditarComentarioTiendaUseCase } from "../application/tienda/editar-comentario-tienda.usecase.js"
import { EliminarComentarioTiendaUseCase } from "../application/tienda/eliminar-comentario-tienda.usecase.js"
import { ValorarTiendaUseCase } from "../application/tienda/valorar-tienda.usecase.js"
import { PreguntarTiendaUseCase } from "../application/tienda/preguntar-tienda.usecase.js"
import { ResponderPreguntaTiendaUseCase } from "../application/tienda/responder-pregunta-tienda.usecase.js"
import { ToggleFavoritoTiendaUseCase } from "../application/tienda/toggle-favorito-tienda.usecase.js"
import { ToggleSeguirTiendaUseCase } from "../application/tienda/toggle-seguir-tienda.usecase.js"
import { ListarComentariosTiendaUseCase } from "../application/tienda/listar-comentarios-tienda.usecase.js"
import { ListarValoracionesTiendaUseCase } from "../application/tienda/listar-valoraciones-tienda.usecase.js"
import { ListarPreguntasTiendaUseCase } from "../application/tienda/listar-preguntas-tienda.usecase.js"
import { ReaccionTipoSchema, ComentarioSchema, ValoracionSchema, PreguntaSchema, RespuestaSchema } from "./social.schema.js"
import {
  TiendaNoEncontrada,
  ComentarioNoEncontrado,
  PreguntaNoEncontrada,
  NoAutorizado,
  ComentarioEsRespuesta,
  PuntuacionInvalida,
  TiendaPreguntaNoEncontradaError,
} from "../domain/social.errors.js"
import { requireRol } from "../../../core/hono-context.js"
import { OcultarPreguntaTiendaUseCase } from "../application/tienda/ocultar-pregunta-tienda.usecase.js"
import { MostrarPreguntaTiendaUseCase } from "../application/tienda/mostrar-pregunta-tienda.usecase.js"

function makeRepo() { return new TiendaSocialPrismaRepository() }

function getRol(c: Parameters<typeof requireAuth>[0]): string | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (c.get("session") as any)?.session?.activeOrganizationRole ?? undefined
}

function handleSocialError(err: unknown, c: { json: (v: unknown, s: number) => Response }) {
  if (err instanceof TiendaNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
  if (err instanceof ComentarioNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
  if (err instanceof PreguntaNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
  if (err instanceof NoAutorizado) return c.json({ error: err.code, message: err.message }, 403)
  if (err instanceof ComentarioEsRespuesta) return c.json({ error: err.code, message: err.message }, 422)
  if (err instanceof PuntuacionInvalida) return c.json({ error: err.code, message: err.message }, 400)
  throw err
}

// ─── Rutas autenticadas ────────────────────────────────────────────────────────

export const tiendaSocialRouter = new Hono<HonoEnv>()
tiendaSocialRouter.use("*", requireAuth)

tiendaSocialRouter.post("/tiendas/:slug/reaccionar", async (c) => {
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = ReaccionTipoSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

  try {
    const result = await new ReaccionarTiendaUseCase(makeRepo(), getSocialNotificador()).ejecutar(
      c.req.param("slug"),
      session.user.id,
      parsed.data.tipo,
    )
    return c.json(result)
  } catch (err) { return handleSocialError(err, c) as Response }
})

tiendaSocialRouter.post("/tiendas/:slug/comentarios", async (c) => {
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = ComentarioSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

  try {
    const comentario = await new ComentarTiendaUseCase(makeRepo(), getSocialNotificador()).ejecutar(
      c.req.param("slug"),
      session.user.id,
      parsed.data.contenido,
      parsed.data.padreId,
    )
    return c.json(comentario, 201)
  } catch (err) { return handleSocialError(err, c) as Response }
})

tiendaSocialRouter.put("/comentarios/tienda/:comentarioId", async (c) => {
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = ComentarioSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

  try {
    const comentario = await new EditarComentarioTiendaUseCase(makeRepo()).ejecutar(
      c.req.param("comentarioId"),
      session.user.id,
      parsed.data.contenido,
      getRol(c),
    )
    return c.json(comentario)
  } catch (err) { return handleSocialError(err, c) as Response }
})

tiendaSocialRouter.delete("/comentarios/tienda/:comentarioId", async (c) => {
  const session = c.get("session")
  try {
    const result = await new EliminarComentarioTiendaUseCase(makeRepo()).ejecutar(
      c.req.param("comentarioId"),
      session.user.id,
      getRol(c),
    )
    return c.json(result)
  } catch (err) { return handleSocialError(err, c) as Response }
})

tiendaSocialRouter.post("/tiendas/:slug/valorar", async (c) => {
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = ValoracionSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

  try {
    const valoracion = await new ValorarTiendaUseCase(makeRepo(), getSocialNotificador()).ejecutar(
      c.req.param("slug"),
      session.user.id,
      parsed.data.puntuacion,
      parsed.data.resena,
    )
    return c.json(valoracion)
  } catch (err) { return handleSocialError(err, c) as Response }
})

tiendaSocialRouter.post("/tiendas/:slug/preguntas", async (c) => {
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = PreguntaSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

  try {
    const pregunta = await new PreguntarTiendaUseCase(makeRepo(), getSocialNotificador()).ejecutar(
      c.req.param("slug"),
      session.user.id,
      parsed.data.pregunta,
    )
    return c.json(pregunta, 201)
  } catch (err) { return handleSocialError(err, c) as Response }
})

tiendaSocialRouter.post("/preguntas/tienda/:preguntaId/respuestas", async (c) => {
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = RespuestaSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

  try {
    const respuesta = await new ResponderPreguntaTiendaUseCase(makeRepo()).ejecutar(
      c.req.param("preguntaId"),
      session.user.id,
      parsed.data.respuesta,
    )
    return c.json(respuesta, 201)
  } catch (err) { return handleSocialError(err, c) as Response }
})

tiendaSocialRouter.post("/tiendas/:slug/favorito", async (c) => {
  const session = c.get("session")
  try {
    const result = await new ToggleFavoritoTiendaUseCase(makeRepo()).ejecutar(c.req.param("slug"), session.user.id)
    return c.json(result)
  } catch (err) { return handleSocialError(err, c) as Response }
})

tiendaSocialRouter.post("/tiendas/:slug/seguir", async (c) => {
  const session = c.get("session")
  try {
    const result = await new ToggleSeguirTiendaUseCase(makeRepo(), getSocialNotificador()).ejecutar(c.req.param("slug"), session.user.id)
    return c.json(result)
  } catch (err) { return handleSocialError(err, c) as Response }
})

// Ocultar pregunta (PROPIETARIO|ADMIN)
tiendaSocialRouter.patch("/tiendas/:slug/preguntas/:preguntaId/ocultar", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  try {
    const result = await new OcultarPreguntaTiendaUseCase(makeRepo()).execute(c.req.param("slug"), c.req.param("preguntaId"))
    return c.json({ id: result.id, estado: result.estado })
  } catch (err) {
    if (err instanceof TiendaPreguntaNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
    return handleSocialError(err, c) as Response
  }
})

// Mostrar pregunta (PROPIETARIO|ADMIN)
tiendaSocialRouter.patch("/tiendas/:slug/preguntas/:preguntaId/mostrar", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  try {
    const result = await new MostrarPreguntaTiendaUseCase(makeRepo()).execute(c.req.param("slug"), c.req.param("preguntaId"))
    return c.json({ id: result.id, estado: result.estado })
  } catch (err) {
    if (err instanceof TiendaPreguntaNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
    return handleSocialError(err, c) as Response
  }
})

// Verificar si el usuario autenticado tiene la tienda como favorito
tiendaSocialRouter.get("/tiendas/:slug/favorito", async (c) => {
  const session = c.get("session")
  try {
    const repo = makeRepo()
    const tiendaId = await repo.resolveTiendaId(c.req.param("slug"))
    const esFavorito = await repo.esFavoritoTienda(tiendaId, session.user.id)
    return c.json({ esFavorito })
  } catch (err) { return handleSocialError(err, c) as Response }
})

// ─── Rutas públicas ────────────────────────────────────────────────────────────

export const publicTiendaSocialRouter = new Hono<HonoEnv>()

publicTiendaSocialRouter.get("/:slug/reacciones", async (c) => {
  try {
    const repo = makeRepo()
    const tiendaId = await repo.resolveTiendaId(c.req.param("slug"))
    const reacciones = await repo.listarReaccionesTienda(tiendaId)
    return c.json({ data: reacciones, meta: { total: reacciones.reduce((s, r) => s + r.count, 0) } })
  } catch (err) { return handleSocialError(err, c) as Response }
})

publicTiendaSocialRouter.get("/:slug/comentarios", async (c) => {
  const q = c.req.query()
  const take = Math.min(Number(q.take ?? 20), 100)
  const skip = Number(q.skip ?? 0)
  const order = (q.order === "asc" ? "asc" : "desc") as "asc" | "desc"

  try {
    const result = await new ListarComentariosTiendaUseCase(makeRepo()).ejecutar(c.req.param("slug"), { take, skip, order })
    return c.json({ data: result.data, meta: { total: result.total, hasMore: skip + result.data.length < result.total } })
  } catch (err) { return handleSocialError(err, c) as Response }
})

publicTiendaSocialRouter.get("/:slug/valoraciones", async (c) => {
  const q = c.req.query()
  const take = Math.min(Number(q.take ?? 20), 100)
  const skip = Number(q.skip ?? 0)
  const order = (q.order === "asc" ? "asc" : "desc") as "asc" | "desc"

  try {
    const result = await new ListarValoracionesTiendaUseCase(makeRepo()).ejecutar(c.req.param("slug"), { take, skip, order, orderBy: q.orderBy })
    return c.json(result)
  } catch (err) { return handleSocialError(err, c) as Response }
})

publicTiendaSocialRouter.get("/:slug/preguntas", async (c) => {
  const q = c.req.query()
  const take = Math.min(Number(q.take ?? 20), 100)
  const skip = Number(q.skip ?? 0)
  const order = (q.order === "asc" ? "asc" : "desc") as "asc" | "desc"

  try {
    const result = await new ListarPreguntasTiendaUseCase(makeRepo()).ejecutar(c.req.param("slug"), { take, skip, order })
    return c.json({ data: result.data, meta: { total: result.total, hasMore: skip + result.data.length < result.total } })
  } catch (err) { return handleSocialError(err, c) as Response }
})

publicTiendaSocialRouter.get("/:slug/seguidores/count", async (c) => {
  try {
    const repo = makeRepo()
    const tiendaId = await repo.resolveTiendaId(c.req.param("slug"))
    const count = await repo.contarSeguidoresTienda(tiendaId)
    return c.json({ count })
  } catch (err) { return handleSocialError(err, c) as Response }
})
