import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
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
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prismaBase as any

function makeRepo() { return new ProductoSocialPrismaRepository() }

async function resolveSlugTenantId(slug: string): Promise<string | null> {
  // Un comercio con la creacion incompleta no resuelve: su social de producto no
  // es publico hasta que el wizard llega a FINALIZADO. Sin esta condicion, las
  // valoraciones, comentarios y preguntas de producto de una tienda a medio crear
  // quedan expuestas (fuga del SC-012 de la spec 018).
  const t = await db.tenant.findFirst({ where: { slug, estado: "FINALIZADO" }, select: { id: true } })
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

export const productoSocialRouter = new OpenAPIHono<HonoEnv>()
productoSocialRouter.use("*", requireAuth)

productoSocialRouter.openapi(
  createRoute({
    method: "post",
    path: "/productos/{productoId}/reaccionar",
    operationId: "social_crear_reaccion_producto",
    tags: ["Social"],
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ productoId: z.string() }),
      body: { content: { "application/json": { schema: ReaccionProductoSchema } }, required: true },
    },
    responses: {
      200: okResponse("Reacción registrada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
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
  },
)

productoSocialRouter.openapi(
  createRoute({
    method: "post",
    path: "/productos/{productoId}/comentarios",
    operationId: "social_crear_comentario_producto",
    tags: ["Social"],
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ productoId: z.string() }),
      body: { content: { "application/json": { schema: ComentarioSchema } }, required: true },
    },
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
      const comentario = await new ComentarProductoUseCase(makeRepo(), getSocialNotificador()).ejecutar(
        c.req.param("productoId"),
        session.user.id,
        parsed.data.contenido,
        parsed.data.padreId,
      )
      return c.json(comentario, 201)
    } catch (err) { return handleSocialError(err, c) as Response }
  },
)

productoSocialRouter.openapi(
  createRoute({
    method: "put",
    path: "/comentarios/producto/{comentarioId}",
    operationId: "social_editar_comentario_producto",
    tags: ["Social"],
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ comentarioId: z.string() }),
      body: { content: { "application/json": { schema: ComentarioSchema } }, required: true },
    },
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
      const comentario = await new EditarComentarioProductoUseCase(makeRepo()).ejecutar(
        c.req.param("comentarioId"),
        session.user.id,
        parsed.data.contenido,
        getRol(c),
      )
      return c.json(comentario)
    } catch (err) { return handleSocialError(err, c) as Response }
  },
)

productoSocialRouter.openapi(
  createRoute({
    method: "delete",
    path: "/comentarios/producto/{comentarioId}",
    operationId: "social_eliminar_comentario_producto",
    tags: ["Social"],
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ comentarioId: z.string() }),
    },
    responses: {
      200: okResponse("Comentario eliminado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const session = c.get("session")
    try {
      const result = await new EliminarComentarioProductoUseCase(makeRepo()).ejecutar(
        c.req.param("comentarioId"),
        session.user.id,
        getRol(c),
      )
      return c.json(result)
    } catch (err) { return handleSocialError(err, c) as Response }
  },
)

productoSocialRouter.openapi(
  createRoute({
    method: "post",
    path: "/productos/{productoId}/valorar",
    operationId: "social_valorar_producto",
    tags: ["Social"],
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ productoId: z.string() }),
      body: { content: { "application/json": { schema: ValoracionSchema } }, required: true },
    },
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
      const valoracion = await new ValorarProductoUseCase(makeRepo(), getSocialNotificador()).ejecutar(
        c.req.param("productoId"),
        session.user.id,
        parsed.data.puntuacion,
        parsed.data.resena,
      )
      return c.json(valoracion)
    } catch (err) { return handleSocialError(err, c) as Response }
  },
)

productoSocialRouter.openapi(
  createRoute({
    method: "post",
    path: "/productos/{productoId}/preguntas",
    operationId: "social_crear_pregunta_producto",
    tags: ["Social"],
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ productoId: z.string() }),
      body: { content: { "application/json": { schema: PreguntaSchema } }, required: true },
    },
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
      const pregunta = await new PreguntarProductoUseCase(makeRepo()).ejecutar(
        c.req.param("productoId"),
        session.user.id,
        parsed.data.pregunta,
      )
      return c.json(pregunta, 201)
    } catch (err) { return handleSocialError(err, c) as Response }
  },
)

productoSocialRouter.openapi(
  createRoute({
    method: "post",
    path: "/preguntas/producto/{preguntaId}/respuestas",
    operationId: "social_responder_pregunta_producto",
    tags: ["Social"],
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ preguntaId: z.string() }),
      body: { content: { "application/json": { schema: RespuestaSchema } }, required: true },
    },
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
      const respuesta = await new ResponderPreguntaProductoUseCase(makeRepo()).ejecutar(
        c.req.param("preguntaId"),
        session.user.id,
        parsed.data.respuesta,
      )
      return c.json(respuesta, 201)
    } catch (err) { return handleSocialError(err, c) as Response }
  },
)

productoSocialRouter.openapi(
  createRoute({
    method: "post",
    path: "/productos/{productoId}/favorito",
    operationId: "social_toggle_favorito_producto",
    tags: ["Social"],
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ productoId: z.string() }),
    },
    responses: {
      200: okResponse("Favorito toggled", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const session = c.get("session")
    try {
      const result = await new ToggleFavoritoProductoUseCase(makeRepo()).ejecutar(
        c.req.param("productoId"),
        session.user.id,
      )
      return c.json(result)
    } catch (err) { return handleSocialError(err, c) as Response }
  },
)

productoSocialRouter.openapi(
  createRoute({
    method: "get",
    path: "/tiendas/{slug}/productos/mis-favoritos",
    operationId: "social_listar_mis_favoritos_producto",
    tags: ["Social"],
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ slug: z.string() }),
    },
    responses: {
      200: okResponse("Ids de productos que el usuario marcó como favoritos", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = await resolveSlugTenantId(c.req.param("slug"))
    if (!tenantId) return c.json({ error: "TIENDA_NO_ENCONTRADA" }, 404)

    // Sin esta ruta la vitrina no puede pintar el corazón lleno al cargar: el
    // toggle existía, pero no había forma de preguntar el estado, así que al
    // recargar la página todos los corazones volvían a verse vacíos aunque el
    // favorito siguiera guardado (spec 019 FR-038).
    const data = await makeRepo().listarIdsFavoritosEnTienda(tenantId, c.get("session").user.id)
    return c.json({ data })
  },
)

// ─── Rutas públicas (sin auth) ─────────────────────────────────────────────────

export const publicProductoSocialRouter = new OpenAPIHono<HonoEnv>()

publicProductoSocialRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/productos/{productoId}/reacciones",
    operationId: "social_listar_reacciones_producto",
    tags: ["Social"],
    request: {
      params: z.object({ slug: z.string(), productoId: z.string() }),
    },
    responses: {
      200: okResponse("Reacciones del producto", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = await resolveSlugTenantId(c.req.param("slug"))
    if (!tenantId) return c.json({ error: "TIENDA_NO_ENCONTRADA" }, 404)

    const reacciones = await makeRepo().listarReaccionesProducto(c.req.param("productoId"))
    return c.json({ data: reacciones, meta: { total: reacciones.reduce((s, r) => s + r.count, 0) } })
  },
)

publicProductoSocialRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/productos/{productoId}/comentarios",
    operationId: "social_listar_comentarios_producto",
    tags: ["Social"],
    request: {
      params: z.object({ slug: z.string(), productoId: z.string() }),
    },
    responses: {
      200: okResponse("Comentarios del producto", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = await resolveSlugTenantId(c.req.param("slug"))
    if (!tenantId) return c.json({ error: "TIENDA_NO_ENCONTRADA" }, 404)

    const q = c.req.query()
    const take = Math.min(Number(q.take ?? 20), 100)
    const page = Number(q.page ?? 1)
    const order = (q.order === "asc" ? "asc" : "desc") as "asc" | "desc"
    const soloRaiz = q.soloRaiz === "true"

    const result = await new ListarComentariosProductoUseCase(makeRepo()).ejecutar(
      c.req.param("productoId"),
      tenantId,
      { take, page, order, soloRaiz },
    )
    return c.json(result)
  },
)

publicProductoSocialRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/productos/{productoId}/valoraciones",
    operationId: "social_listar_valoraciones_producto",
    tags: ["Social"],
    request: {
      params: z.object({ slug: z.string(), productoId: z.string() }),
    },
    responses: {
      200: okResponse("Valoraciones del producto", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = await resolveSlugTenantId(c.req.param("slug"))
    if (!tenantId) return c.json({ error: "TIENDA_NO_ENCONTRADA" }, 404)

    const q = c.req.query()
    const take = Math.min(Number(q.take ?? 20), 100)
    const page = Number(q.page ?? 1)
    const order = (q.order === "asc" ? "asc" : "desc") as "asc" | "desc"

    const result = await new ListarValoracionesProductoUseCase(makeRepo()).ejecutar(
      c.req.param("productoId"),
      tenantId,
      { take, page, order, orderBy: q.orderBy },
    )
    return c.json(result)
  },
)

publicProductoSocialRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/productos/{productoId}/preguntas",
    operationId: "social_listar_preguntas_producto",
    tags: ["Social"],
    request: {
      params: z.object({ slug: z.string(), productoId: z.string() }),
    },
    responses: {
      200: okResponse("Preguntas del producto", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = await resolveSlugTenantId(c.req.param("slug"))
    if (!tenantId) return c.json({ error: "TIENDA_NO_ENCONTRADA" }, 404)

    const q = c.req.query()
    const take = Math.min(Number(q.take ?? 20), 100)
    const page = Number(q.page ?? 1)
    const order = (q.order === "asc" ? "asc" : "desc") as "asc" | "desc"

    const result = await new ListarPreguntasProductoUseCase(makeRepo()).ejecutar(
      c.req.param("productoId"),
      tenantId,
      { take, page, order },
    )
    return c.json(result)
  },
)
