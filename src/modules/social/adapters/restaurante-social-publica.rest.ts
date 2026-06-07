import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { RestauranteSocialPrismaRepository } from "../infrastructure/restaurante-social.prisma.repository.js"
import { ListarComentariosRestauranteUseCase } from "../application/restaurante/listar-comentarios-restaurante.usecase.js"
import { ListarValoracionesRestauranteUseCase } from "../application/restaurante/listar-valoraciones-restaurante.usecase.js"
import { ListarPreguntasRestauranteUseCase } from "../application/restaurante/listar-preguntas-restaurante.usecase.js"
import { ListarPublicacionesRestauranteUseCase } from "../application/publicacion-restaurante/listar-publicaciones.usecase.js"
import { RestauranteSocialNoEncontradoError } from "../domain/restaurante-social.errors.js"
import { errorResponses, okResponse } from "../../../core/openapi-responses.js"

function makeRepo() { return new RestauranteSocialPrismaRepository() }

function handleError(err: unknown, c: { json: (v: unknown, s: number) => Response }) {
  if (err instanceof RestauranteSocialNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
  throw err
}

export const publicRestauranteSocialRouter = new OpenAPIHono<HonoEnv>()

publicRestauranteSocialRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/reacciones",
    operationId: "social_restaurante_publica_reacciones",
    tags: ["Social"],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      200: okResponse("Reacciones del restaurante", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    try {
      const repo = makeRepo()
      const { restauranteId } = await repo.resolveRestauranteInfo(c.req.param("slug"))
      const reacciones = await repo.listarReacciones(restauranteId)
      return c.json({ data: reacciones, meta: { total: reacciones.reduce((s, r) => s + r.total, 0) } })
    } catch (err) { return handleError(err, c) as Response }
  },
)

publicRestauranteSocialRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/comentarios",
    operationId: "social_restaurante_publica_comentarios",
    tags: ["Social"],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      200: okResponse("Comentarios del restaurante", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const q = c.req.query()
    const take = Math.min(Number(q.take ?? 20), 100)
    const page = Number(q.page ?? 1)
    const order = (q.order === "asc" ? "asc" : "desc") as "asc" | "desc"
    try {
      const result = await new ListarComentariosRestauranteUseCase(makeRepo()).ejecutar(c.req.param("slug"), { take, page, order })
      return c.json(result)
    } catch (err) { return handleError(err, c) as Response }
  },
)

publicRestauranteSocialRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/valoraciones",
    operationId: "social_restaurante_publica_valoraciones",
    tags: ["Social"],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      200: okResponse("Valoraciones del restaurante", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const q = c.req.query()
    const take = Math.min(Number(q.take ?? 20), 100)
    const page = Number(q.page ?? 1)
    const order = (q.order === "asc" ? "asc" : "desc") as "asc" | "desc"
    try {
      const result = await new ListarValoracionesRestauranteUseCase(makeRepo()).ejecutar(c.req.param("slug"), { take, page, order, orderBy: q.orderBy })
      return c.json(result)
    } catch (err) { return handleError(err, c) as Response }
  },
)

publicRestauranteSocialRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/preguntas",
    operationId: "social_restaurante_publica_preguntas",
    tags: ["Social"],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      200: okResponse("Preguntas del restaurante", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const q = c.req.query()
    const take = Math.min(Number(q.take ?? 20), 100)
    const page = Number(q.page ?? 1)
    const order = (q.order === "asc" ? "asc" : "desc") as "asc" | "desc"
    try {
      const result = await new ListarPreguntasRestauranteUseCase(makeRepo()).ejecutar(c.req.param("slug"), { take, page, order })
      return c.json(result)
    } catch (err) { return handleError(err, c) as Response }
  },
)

publicRestauranteSocialRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/seguidores/count",
    operationId: "social_restaurante_publica_seguidores_count",
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
      const { restauranteId } = await repo.resolveRestauranteInfo(c.req.param("slug"))
      const result = await repo.listarSeguidores(restauranteId, { take: 1, page: 1 })
      return c.json({ count: result.total })
    } catch (err) { return handleError(err, c) as Response }
  },
)

publicRestauranteSocialRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/publicaciones",
    operationId: "social_restaurante_publica_publicaciones",
    tags: ["Social"],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      200: okResponse("Publicaciones del restaurante", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const q = c.req.query()
    const take = Math.min(Number(q.take ?? 20), 100)
    const page = Number(q.page ?? 1)
    try {
      const result = await new ListarPublicacionesRestauranteUseCase(makeRepo()).ejecutar(c.req.param("slug"), { take, page })
      return c.json(result)
    } catch (err) { return handleError(err, c) as Response }
  },
)
