import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import { requireAuth, type HonoEnv } from "../../../core/hono-context.js"
import { ConsultorioSocialPrismaRepository } from "../infrastructure/consultorio-social.prisma.repository.js"
import { getConsultorioSocialNotificador } from "../infrastructure/consultorio-social.notificador.provider.js"
import { ReaccionarConsultorioUseCase } from "../application/consultorio/reaccionar-consultorio.usecase.js"
import { ComentarConsultorioUseCase } from "../application/consultorio/comentar-consultorio.usecase.js"
import { ResponderComentarioConsultorioUseCase } from "../application/consultorio/responder-comentario-consultorio.usecase.js"
import { ValorarConsultorioUseCase } from "../application/consultorio/valorar-consultorio.usecase.js"
import { PreguntarConsultorioUseCase } from "../application/consultorio/preguntar-consultorio.usecase.js"
import { ToggleFavoritoConsultorioUseCase } from "../application/consultorio/toggle-favorito-consultorio.usecase.js"
import { ToggleSeguirConsultorioUseCase } from "../application/consultorio/toggle-seguir-consultorio.usecase.js"
import { ConsultorioSocialNoActivoError, ComentarioNoEncontradoError } from "../domain/consultorio-social.errors.js"
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"

const ReaccionSchema = z.object({ tipo: z.enum(["ME_GUSTA", "ME_ENCANTA", "ME_IMPORTA", "ME_DIVIERTE", "ME_ASOMBRA", "ME_ENTRISTECE", "ME_ENOJA"]) })
const ComentarioSchema = z.object({ contenido: z.string().min(1).max(2000), padreId: z.string().optional() })
const ValoracionSchema = z.object({ puntuacion: z.number().int().min(1).max(5), resena: z.string().max(2000).optional() })
const PreguntaSchema = z.object({ pregunta: z.string().min(1).max(1000) })

function makeRepo() { return new ConsultorioSocialPrismaRepository() }

function handleError(err: unknown, c: { json: (v: unknown, s: number) => Response }) {
  if (err instanceof ConsultorioSocialNoActivoError) return c.json({ error: err.code, message: err.message }, 404)
  if (err instanceof ComentarioNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
  if ((err as { message?: string })?.message?.includes("entre 1 y 5")) return c.json({ error: "VALIDACION", message: (err as Error).message }, 400)
  throw err
}

export const consultorioSocialConsumerRouter = new OpenAPIHono<HonoEnv>()
consultorioSocialConsumerRouter.use("*", requireAuth)

consultorioSocialConsumerRouter.openapi(
  createRoute({
    method: "post",
    path: "/{slug}/reaccionar",
    operationId: "social_consultorio_reaccionar",
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
    const parsed = ReaccionSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new ReaccionarConsultorioUseCase(makeRepo()).ejecutar(c.req.param("slug"), session.user.id, parsed.data.tipo)
      return c.json(result)
    } catch (err) { return handleError(err, c) as Response }
  },
)

consultorioSocialConsumerRouter.openapi(
  createRoute({
    method: "post",
    path: "/{slug}/comentarios",
    operationId: "social_consultorio_comentar",
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
      const comentario = await new ComentarConsultorioUseCase(makeRepo(), getConsultorioSocialNotificador()).ejecutar(
        c.req.param("slug"),
        session.user.id,
        parsed.data.contenido,
        parsed.data.padreId,
      )
      return c.json(comentario, 201)
    } catch (err) { return handleError(err, c) as Response }
  },
)

consultorioSocialConsumerRouter.openapi(
  createRoute({
    method: "post",
    path: "/{slug}/comentarios/{comentarioId}/responder",
    operationId: "social_consultorio_responder_comentario",
    tags: ["Social"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ slug: z.string(), comentarioId: z.string() }) },
    responses: {
      201: createdResponse("Respuesta creada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = ComentarioSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const respuesta = await new ResponderComentarioConsultorioUseCase(makeRepo()).ejecutar(
        c.req.param("slug"),
        session.user.id,
        parsed.data.contenido,
        c.req.param("comentarioId"),
      )
      return c.json(respuesta, 201)
    } catch (err) { return handleError(err, c) as Response }
  },
)

consultorioSocialConsumerRouter.openapi(
  createRoute({
    method: "post",
    path: "/{slug}/valorar",
    operationId: "social_consultorio_valorar",
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
      const result = await new ValorarConsultorioUseCase(makeRepo(), getConsultorioSocialNotificador()).ejecutar(
        c.req.param("slug"),
        session.user.id,
        parsed.data.puntuacion,
        parsed.data.resena,
      )
      return c.json(result)
    } catch (err) { return handleError(err, c) as Response }
  },
)

consultorioSocialConsumerRouter.openapi(
  createRoute({
    method: "post",
    path: "/{slug}/preguntas",
    operationId: "social_consultorio_preguntar",
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
      const pregunta = await new PreguntarConsultorioUseCase(makeRepo(), getConsultorioSocialNotificador()).ejecutar(
        c.req.param("slug"),
        session.user.id,
        parsed.data.pregunta,
      )
      return c.json(pregunta, 201)
    } catch (err) { return handleError(err, c) as Response }
  },
)

consultorioSocialConsumerRouter.openapi(
  createRoute({
    method: "post",
    path: "/{slug}/seguir",
    operationId: "social_consultorio_toggle_seguir",
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
      const result = await new ToggleSeguirConsultorioUseCase(makeRepo(), getConsultorioSocialNotificador()).ejecutar(c.req.param("slug"), session.user.id)
      return c.json(result)
    } catch (err) { return handleError(err, c) as Response }
  },
)

consultorioSocialConsumerRouter.openapi(
  createRoute({
    method: "post",
    path: "/{slug}/favorito",
    operationId: "social_consultorio_toggle_favorito",
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
      const result = await new ToggleFavoritoConsultorioUseCase(makeRepo()).ejecutar(c.req.param("slug"), session.user.id)
      return c.json(result)
    } catch (err) { return handleError(err, c) as Response }
  },
)
