import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
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
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"

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

export const tiendaSocialRouter = new OpenAPIHono<HonoEnv>()
tiendaSocialRouter.use("*", requireAuth)

tiendaSocialRouter.openapi(
  createRoute({
    method: "post",
    path: "/tiendas/{slug}/reaccionar",
    operationId: "social_tienda_reaccionar",
    tags: ["Social"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      200: okResponse("Reacción registrada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
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
  },
)

tiendaSocialRouter.openapi(
  createRoute({
    method: "post",
    path: "/tiendas/{slug}/comentarios",
    operationId: "social_tienda_comentar",
    tags: ["Social"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      201: createdResponse("Comentario creado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
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
  },
)

tiendaSocialRouter.openapi(
  createRoute({
    method: "put",
    path: "/comentarios/tienda/{comentarioId}",
    operationId: "social_tienda_editar_comentario",
    tags: ["Social"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ comentarioId: z.string() }) },
    responses: {
      200: okResponse("Comentario editado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
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
  },
)

tiendaSocialRouter.openapi(
  createRoute({
    method: "delete",
    path: "/comentarios/tienda/{comentarioId}",
    operationId: "social_tienda_eliminar_comentario",
    tags: ["Social"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ comentarioId: z.string() }) },
    responses: {
      200: okResponse("Comentario eliminado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const session = c.get("session")
    try {
      const result = await new EliminarComentarioTiendaUseCase(makeRepo()).ejecutar(
        c.req.param("comentarioId"),
        session.user.id,
        getRol(c),
      )
      return c.json(result)
    } catch (err) { return handleSocialError(err, c) as Response }
  },
)

tiendaSocialRouter.openapi(
  createRoute({
    method: "post",
    path: "/tiendas/{slug}/valorar",
    operationId: "social_tienda_valorar",
    tags: ["Social"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      200: okResponse("Valoración registrada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
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
  },
)

tiendaSocialRouter.openapi(
  createRoute({
    method: "post",
    path: "/tiendas/{slug}/preguntas",
    operationId: "social_tienda_preguntar",
    tags: ["Social"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      201: createdResponse("Pregunta creada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
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
  },
)

tiendaSocialRouter.openapi(
  createRoute({
    method: "post",
    path: "/preguntas/tienda/{preguntaId}/respuestas",
    operationId: "social_tienda_responder_pregunta",
    tags: ["Social"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ preguntaId: z.string() }) },
    responses: {
      201: createdResponse("Respuesta creada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
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
  },
)

tiendaSocialRouter.openapi(
  createRoute({
    method: "post",
    path: "/tiendas/{slug}/favorito",
    operationId: "social_tienda_toggle_favorito",
    tags: ["Social"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      200: okResponse("Favorito actualizado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const session = c.get("session")
    try {
      const result = await new ToggleFavoritoTiendaUseCase(makeRepo()).ejecutar(c.req.param("slug"), session.user.id)
      return c.json(result)
    } catch (err) { return handleSocialError(err, c) as Response }
  },
)

tiendaSocialRouter.openapi(
  createRoute({
    method: "post",
    path: "/tiendas/{slug}/seguir",
    operationId: "social_tienda_toggle_seguir",
    tags: ["Social"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      200: okResponse("Seguimiento actualizado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const session = c.get("session")
    try {
      const result = await new ToggleSeguirTiendaUseCase(makeRepo(), getSocialNotificador()).ejecutar(c.req.param("slug"), session.user.id)
      return c.json(result)
    } catch (err) { return handleSocialError(err, c) as Response }
  },
)

tiendaSocialRouter.openapi(
  createRoute({
    method: "patch",
    path: "/tiendas/{slug}/preguntas/{preguntaId}/ocultar",
    operationId: "social_tienda_ocultar_pregunta",
    tags: ["Social"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: { params: z.object({ slug: z.string(), preguntaId: z.string() }) },
    responses: {
      200: okResponse("Pregunta ocultada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    try {
      const result = await new OcultarPreguntaTiendaUseCase(makeRepo()).execute(c.req.param("slug"), c.req.param("preguntaId"))
      return c.json({ id: result.id, estado: result.estado })
    } catch (err) {
      if (err instanceof TiendaPreguntaNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
      return handleSocialError(err, c) as Response
    }
  },
)

tiendaSocialRouter.openapi(
  createRoute({
    method: "patch",
    path: "/tiendas/{slug}/preguntas/{preguntaId}/mostrar",
    operationId: "social_tienda_mostrar_pregunta",
    tags: ["Social"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: { params: z.object({ slug: z.string(), preguntaId: z.string() }) },
    responses: {
      200: okResponse("Pregunta mostrada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    try {
      const result = await new MostrarPreguntaTiendaUseCase(makeRepo()).execute(c.req.param("slug"), c.req.param("preguntaId"))
      return c.json({ id: result.id, estado: result.estado })
    } catch (err) {
      if (err instanceof TiendaPreguntaNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
      return handleSocialError(err, c) as Response
    }
  },
)

tiendaSocialRouter.openapi(
  createRoute({
    method: "get",
    path: "/tiendas/{slug}/favorito",
    operationId: "social_tienda_es_favorito",
    tags: ["Social"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      200: okResponse("Estado de favorito", z.object({ esFavorito: z.boolean() })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const session = c.get("session")
    try {
      const repo = makeRepo()
      const tiendaId = await repo.resolveTiendaId(c.req.param("slug"))
      const esFavorito = await repo.esFavoritoTienda(tiendaId, session.user.id)
      return c.json({ esFavorito })
    } catch (err) { return handleSocialError(err, c) as Response }
  },
)

// ─── Rutas públicas ────────────────────────────────────────────────────────────

export const publicTiendaSocialRouter = new OpenAPIHono<HonoEnv>()

publicTiendaSocialRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/reacciones",
    operationId: "social_tienda_publica_reacciones",
    tags: ["Social"],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      200: okResponse("Reacciones de la tienda", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    try {
      const repo = makeRepo()
      const tiendaId = await repo.resolveTiendaId(c.req.param("slug"))
      const reacciones = await repo.listarReaccionesTienda(tiendaId)
      return c.json({ data: reacciones, meta: { total: reacciones.reduce((s, r) => s + r.count, 0) } })
    } catch (err) { return handleSocialError(err, c) as Response }
  },
)

publicTiendaSocialRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/comentarios",
    operationId: "social_tienda_publica_comentarios",
    tags: ["Social"],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      200: okResponse("Comentarios de la tienda", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const q = c.req.query()
    const take = Math.min(Number(q.take ?? 20), 100)
    const page = Number(q.page ?? 1)
    const order = (q.order === "asc" ? "asc" : "desc") as "asc" | "desc"

    try {
      const result = await new ListarComentariosTiendaUseCase(makeRepo()).ejecutar(c.req.param("slug"), { take, page, order })
      return c.json(result)
    } catch (err) { return handleSocialError(err, c) as Response }
  },
)

publicTiendaSocialRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/valoraciones",
    operationId: "social_tienda_publica_valoraciones",
    tags: ["Social"],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      200: okResponse("Valoraciones de la tienda", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const q = c.req.query()
    const take = Math.min(Number(q.take ?? 20), 100)
    const page = Number(q.page ?? 1)
    const order = (q.order === "asc" ? "asc" : "desc") as "asc" | "desc"

    try {
      const result = await new ListarValoracionesTiendaUseCase(makeRepo()).ejecutar(c.req.param("slug"), { take, page, order, orderBy: q.orderBy })
      return c.json(result)
    } catch (err) { return handleSocialError(err, c) as Response }
  },
)

publicTiendaSocialRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/preguntas",
    operationId: "social_tienda_publica_preguntas",
    tags: ["Social"],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      200: okResponse("Preguntas de la tienda", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const q = c.req.query()
    const take = Math.min(Number(q.take ?? 20), 100)
    const page = Number(q.page ?? 1)
    const order = (q.order === "asc" ? "asc" : "desc") as "asc" | "desc"

    try {
      const result = await new ListarPreguntasTiendaUseCase(makeRepo()).ejecutar(c.req.param("slug"), { take, page, order })
      return c.json(result)
    } catch (err) { return handleSocialError(err, c) as Response }
  },
)

publicTiendaSocialRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/seguidores/count",
    operationId: "social_tienda_publica_seguidores_count",
    tags: ["Social"],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      200: okResponse("Conteo de seguidores", z.object({ count: z.number() })),
      ...errorResponses,
    },
  }),
  async (c) => {
    try {
      const repo = makeRepo()
      const tiendaId = await repo.resolveTiendaId(c.req.param("slug"))
      const count = await repo.contarSeguidoresTienda(tiendaId)
      return c.json({ count })
    } catch (err) { return handleSocialError(err, c) as Response }
  },
)
