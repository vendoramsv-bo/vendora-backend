import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import { requireAuth, requireRol, type HonoEnv } from "../../../core/hono-context.js"
import { RestauranteSocialPrismaRepository } from "../infrastructure/restaurante-social.prisma.repository.js"
import { ResponderPreguntaRestauranteUseCase } from "../application/restaurante/responder-pregunta-restaurante.usecase.js"
import { OcultarPreguntaRestauranteUseCase } from "../application/restaurante/ocultar-pregunta-restaurante.usecase.js"
import { MostrarPreguntaRestauranteUseCase } from "../application/restaurante/mostrar-pregunta-restaurante.usecase.js"
import { ListarPreguntasRestauranteUseCase } from "../application/restaurante/listar-preguntas-restaurante.usecase.js"
import { PublicarNovedadUseCase } from "../application/publicacion-restaurante/publicar-novedad.usecase.js"
import { RespuestaPreguntaRestauranteSchema, NovedadRestauranteSchema } from "./restaurante-social.schema.js"
import { RestauranteSocialNoEncontradoError, PreguntaRestauranteNoEncontradaError, PreguntaNoModificableError } from "../domain/restaurante-social.errors.js"
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"

function makeRepo() { return new RestauranteSocialPrismaRepository() }

function getRol(c: Parameters<typeof requireAuth>[0]): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (c.get("session") as any)?.session?.activeOrganizationRole ?? "member"
}

function handleError(err: unknown, c: { json: (v: unknown, s: number) => Response }) {
  if (err instanceof RestauranteSocialNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
  if (err instanceof PreguntaRestauranteNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
  if (err instanceof PreguntaNoModificableError) return c.json({ error: err.code, message: err.message }, 403)
  throw err
}

export const restauranteSocialStaffRouter = new OpenAPIHono<HonoEnv>()
restauranteSocialStaffRouter.use("*", requireAuth)

restauranteSocialStaffRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/preguntas",
    operationId: "social_restaurante_staff_listar_preguntas",
    tags: ["Social"],
    security: [{ bearerAuth: [] }],
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
    const incluirInactivas = q.incluirInactivas === "true"
    try {
      const result = await new ListarPreguntasRestauranteUseCase(makeRepo()).ejecutar(c.req.param("slug"), { take, page, order, incluirInactivas })
      return c.json(result)
    } catch (err) { return handleError(err, c) as Response }
  },
)

restauranteSocialStaffRouter.openapi(
  createRoute({
    method: "post",
    path: "/{slug}/preguntas/{preguntaId}/responder",
    operationId: "social_restaurante_staff_responder_pregunta",
    tags: ["Social"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: { params: z.object({ slug: z.string(), preguntaId: z.string() }) },
    responses: {
      201: createdResponse("Respuesta publicada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = RespuestaPreguntaRestauranteSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const repo = makeRepo()
      const { restauranteId } = await repo.resolveRestauranteInfo(c.req.param("slug"))
      const result = await new ResponderPreguntaRestauranteUseCase(repo).ejecutar(
        c.req.param("preguntaId"),
        restauranteId,
        session.user.id,
        parsed.data.respuesta,
      )
      return c.json(result, 201)
    } catch (err) { return handleError(err, c) as Response }
  },
)

restauranteSocialStaffRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{slug}/preguntas/{preguntaId}/ocultar",
    operationId: "social_restaurante_staff_ocultar_pregunta",
    tags: ["Social"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ slug: z.string(), preguntaId: z.string() }) },
    responses: {
      200: okResponse("Pregunta ocultada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const rol = getRol(c)
    try {
      const result = await new OcultarPreguntaRestauranteUseCase(makeRepo()).ejecutar(c.req.param("slug"), c.req.param("preguntaId"), rol)
      return c.json(result)
    } catch (err) { return handleError(err, c) as Response }
  },
)

restauranteSocialStaffRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{slug}/preguntas/{preguntaId}/mostrar",
    operationId: "social_restaurante_staff_mostrar_pregunta",
    tags: ["Social"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ slug: z.string(), preguntaId: z.string() }) },
    responses: {
      200: okResponse("Pregunta mostrada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const rol = getRol(c)
    try {
      const result = await new MostrarPreguntaRestauranteUseCase(makeRepo()).ejecutar(c.req.param("slug"), c.req.param("preguntaId"), rol)
      return c.json(result)
    } catch (err) { return handleError(err, c) as Response }
  },
)

restauranteSocialStaffRouter.openapi(
  createRoute({
    method: "post",
    path: "/{slug}/novedades",
    operationId: "social_restaurante_staff_publicar_novedad",
    tags: ["Social"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      201: createdResponse("Novedad publicada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const session = c.get("session")
    const rol = getRol(c)
    const body = await c.req.json()
    const parsed = NovedadRestauranteSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new PublicarNovedadUseCase(makeRepo()).ejecutar(
        c.req.param("slug"),
        session.user.id,
        rol,
        parsed.data,
      )
      return c.json(result, 201)
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((err as any)?.code === "SOLO_PROPIETARIO_ADMIN") return c.json({ error: "SOLO_PROPIETARIO_ADMIN", message: (err as Error).message }, 403)
      return handleError(err, c) as Response
    }
  },
)
