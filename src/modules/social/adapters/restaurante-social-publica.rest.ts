import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { RestauranteSocialPrismaRepository } from "../infrastructure/restaurante-social.prisma.repository.js"
import { ListarComentariosRestauranteUseCase } from "../application/restaurante/listar-comentarios-restaurante.usecase.js"
import { ListarValoracionesRestauranteUseCase } from "../application/restaurante/listar-valoraciones-restaurante.usecase.js"
import { ListarPreguntasRestauranteUseCase } from "../application/restaurante/listar-preguntas-restaurante.usecase.js"
import { ListarPublicacionesRestauranteUseCase } from "../application/publicacion-restaurante/listar-publicaciones.usecase.js"
import { RestauranteSocialNoEncontradoError } from "../domain/restaurante-social.errors.js"

function makeRepo() { return new RestauranteSocialPrismaRepository() }

function handleError(err: unknown, c: { json: (v: unknown, s: number) => Response }) {
  if (err instanceof RestauranteSocialNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
  throw err
}

export const publicRestauranteSocialRouter = new Hono<HonoEnv>()

publicRestauranteSocialRouter.get("/:slug/reacciones", async (c) => {
  try {
    const repo = makeRepo()
    const { restauranteId } = await repo.resolveRestauranteInfo(c.req.param("slug"))
    const reacciones = await repo.listarReacciones(restauranteId)
    return c.json({ data: reacciones, meta: { total: reacciones.reduce((s, r) => s + r.total, 0) } })
  } catch (err) { return handleError(err, c) as Response }
})

publicRestauranteSocialRouter.get("/:slug/comentarios", async (c) => {
  const q = c.req.query()
  const take = Math.min(Number(q.take ?? 20), 100)
  const cursor = q.cursor
  const order = (q.order === "asc" ? "asc" : "desc") as "asc" | "desc"
  try {
    const result = await new ListarComentariosRestauranteUseCase(makeRepo()).ejecutar(c.req.param("slug"), { take, cursor, order })
    return c.json(result)
  } catch (err) { return handleError(err, c) as Response }
})

publicRestauranteSocialRouter.get("/:slug/valoraciones", async (c) => {
  const q = c.req.query()
  const take = Math.min(Number(q.take ?? 20), 100)
  const cursor = q.cursor
  const order = (q.order === "asc" ? "asc" : "desc") as "asc" | "desc"
  try {
    const result = await new ListarValoracionesRestauranteUseCase(makeRepo()).ejecutar(c.req.param("slug"), { take, cursor, order, orderBy: q.orderBy })
    return c.json(result)
  } catch (err) { return handleError(err, c) as Response }
})

publicRestauranteSocialRouter.get("/:slug/preguntas", async (c) => {
  const q = c.req.query()
  const take = Math.min(Number(q.take ?? 20), 100)
  const cursor = q.cursor
  const order = (q.order === "asc" ? "asc" : "desc") as "asc" | "desc"
  try {
    const result = await new ListarPreguntasRestauranteUseCase(makeRepo()).ejecutar(c.req.param("slug"), { take, cursor, order })
    return c.json(result)
  } catch (err) { return handleError(err, c) as Response }
})

publicRestauranteSocialRouter.get("/:slug/seguidores/count", async (c) => {
  try {
    const repo = makeRepo()
    const { restauranteId } = await repo.resolveRestauranteInfo(c.req.param("slug"))
    const result = await repo.listarSeguidores(restauranteId, { take: 0 })
    return c.json({ count: result.meta.total })
  } catch (err) { return handleError(err, c) as Response }
})

publicRestauranteSocialRouter.get("/:slug/publicaciones", async (c) => {
  const q = c.req.query()
  const take = Math.min(Number(q.take ?? 20), 100)
  const cursor = q.cursor
  try {
    const result = await new ListarPublicacionesRestauranteUseCase(makeRepo()).ejecutar(c.req.param("slug"), { take, cursor })
    return c.json(result)
  } catch (err) { return handleError(err, c) as Response }
})
