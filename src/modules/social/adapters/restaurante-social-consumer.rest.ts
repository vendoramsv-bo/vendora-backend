import { Hono } from "hono"
import { requireAuth, type HonoEnv } from "../../../core/hono-context.js"
import { RestauranteSocialPrismaRepository } from "../infrastructure/restaurante-social.prisma.repository.js"
import { getRestauranteSocialNotificador } from "../infrastructure/restaurante-social.notificador.provider.js"
import { ReaccionarRestauranteUseCase } from "../application/restaurante/reaccionar-restaurante.usecase.js"
import { ComentarRestauranteUseCase } from "../application/restaurante/comentar-restaurante.usecase.js"
import { ResponderComentarioRestauranteUseCase } from "../application/restaurante/responder-comentario-restaurante.usecase.js"
import { ValorarRestauranteUseCase } from "../application/restaurante/valorar-restaurante.usecase.js"
import { PreguntarRestauranteUseCase } from "../application/restaurante/preguntar-restaurante.usecase.js"
import { ToggleFavoritoRestauranteUseCase } from "../application/restaurante/toggle-favorito-restaurante.usecase.js"
import { ToggleSeguirRestauranteUseCase } from "../application/restaurante/toggle-seguir-restaurante.usecase.js"
import {
  ReaccionRestauranteSchema,
  ComentarioRestauranteSchema,
  ValoracionRestauranteSchema,
  PreguntaRestauranteSchema,
} from "./restaurante-social.schema.js"
import { RestauranteSocialNoEncontradoError, ValoracionFueraDeRangoError, ComentarioRestauranteNoEncontradoError } from "../domain/restaurante-social.errors.js"

function makeRepo() { return new RestauranteSocialPrismaRepository() }

function handleError(err: unknown, c: { json: (v: unknown, s: number) => Response }) {
  if (err instanceof RestauranteSocialNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
  if (err instanceof ValoracionFueraDeRangoError) return c.json({ error: err.code, message: err.message }, 400)
  if (err instanceof ComentarioRestauranteNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
  throw err
}

export const restauranteSocialConsumerRouter = new Hono<HonoEnv>()
restauranteSocialConsumerRouter.use("*", requireAuth)

restauranteSocialConsumerRouter.post("/:slug/reaccionar", async (c) => {
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = ReaccionRestauranteSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const result = await new ReaccionarRestauranteUseCase(makeRepo(), getRestauranteSocialNotificador()).ejecutar(
      c.req.param("slug"),
      session.user.id,
      parsed.data.tipo,
    )
    return c.json(result)
  } catch (err) { return handleError(err, c) as Response }
})

restauranteSocialConsumerRouter.post("/:slug/comentarios", async (c) => {
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = ComentarioRestauranteSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const comentario = await new ComentarRestauranteUseCase(makeRepo(), getRestauranteSocialNotificador()).ejecutar(
      c.req.param("slug"),
      session.user.id,
      parsed.data.contenido,
      parsed.data.padreId,
    )
    return c.json(comentario, 201)
  } catch (err) { return handleError(err, c) as Response }
})

restauranteSocialConsumerRouter.post("/:slug/comentarios/:comentarioId/responder", async (c) => {
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = ComentarioRestauranteSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const respuesta = await new ResponderComentarioRestauranteUseCase(makeRepo()).ejecutar(
      c.req.param("slug"),
      session.user.id,
      parsed.data.contenido,
      c.req.param("comentarioId"),
    )
    return c.json(respuesta, 201)
  } catch (err) { return handleError(err, c) as Response }
})

restauranteSocialConsumerRouter.post("/:slug/valorar", async (c) => {
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = ValoracionRestauranteSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const result = await new ValorarRestauranteUseCase(makeRepo(), getRestauranteSocialNotificador()).ejecutar(
      c.req.param("slug"),
      session.user.id,
      parsed.data.puntuacion,
      parsed.data.resena,
    )
    return c.json(result)
  } catch (err) { return handleError(err, c) as Response }
})

restauranteSocialConsumerRouter.post("/:slug/preguntas", async (c) => {
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = PreguntaRestauranteSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const pregunta = await new PreguntarRestauranteUseCase(makeRepo(), getRestauranteSocialNotificador()).ejecutar(
      c.req.param("slug"),
      session.user.id,
      parsed.data.pregunta,
    )
    return c.json(pregunta, 201)
  } catch (err) { return handleError(err, c) as Response }
})

restauranteSocialConsumerRouter.post("/:slug/seguir", async (c) => {
  const session = c.get("session")
  try {
    const result = await new ToggleSeguirRestauranteUseCase(makeRepo(), getRestauranteSocialNotificador()).ejecutar(c.req.param("slug"), session.user.id)
    return c.json(result)
  } catch (err) { return handleError(err, c) as Response }
})

restauranteSocialConsumerRouter.post("/:slug/favorito", async (c) => {
  const session = c.get("session")
  try {
    const result = await new ToggleFavoritoRestauranteUseCase(makeRepo()).ejecutar(c.req.param("slug"), session.user.id)
    return c.json(result)
  } catch (err) { return handleError(err, c) as Response }
})
