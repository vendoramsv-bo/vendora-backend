import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import { requireAuth, requireRol, type HonoEnv } from "../../../core/hono-context.js"
import { ConsultorioSocialPrismaRepository } from "../infrastructure/consultorio-social.prisma.repository.js"
import { getConsultorioSocialNotificador } from "../infrastructure/consultorio-social.notificador.provider.js"
import { ListarPreguntasConsultorioUseCase } from "../application/consultorio/listar-preguntas-consultorio.usecase.js"
import { ResponderPreguntaConsultorioUseCase } from "../application/consultorio/responder-pregunta-consultorio.usecase.js"
import { OcultarPreguntaConsultorioUseCase } from "../application/consultorio/ocultar-pregunta-consultorio.usecase.js"
import { MostrarPreguntaConsultorioUseCase } from "../application/consultorio/mostrar-pregunta-consultorio.usecase.js"
import { PublicarNovedadConsultorioUseCase } from "../application/publicacion-consultorio/publicar-novedad-consultorio.usecase.js"
import { ConsultorioSocialNoActivoError, PreguntaNoEncontradaError } from "../domain/consultorio-social.errors.js"
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"

const RespuestaPreguntaSchema = z.object({ respuesta: z.string().min(1).max(2000) })
const NovedadSchema = z.object({
  titulo: z.string().max(200).optional(),
  contenido: z.string().min(1).max(10000),
  tipo: z.enum(["TEXTO", "IMAGEN", "VIDEO", "VIDEO_EXTERNO", "MIXTO"]),
  etiquetas: z.array(z.string().max(50)).max(20).optional().default([]),
  medios: z.array(z.object({
    tipo: z.enum(["IMAGEN", "VIDEO", "VIDEO_YOUTUBE", "VIDEO_TIKTOK", "VIDEO_FACEBOOK", "VIDEO_INSTAGRAM", "VIDEO_OTRO"]),
    url: z.string().url().optional(),
    embedUrl: z.string().url().optional(),
  })).optional().default([]),
})

function makeRepo() { return new ConsultorioSocialPrismaRepository() }

function getRol(c: Parameters<typeof requireAuth>[0]): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (c.get("session") as any)?.session?.activeOrganizationRole ?? "member"
}

function handleError(err: unknown, c: { json: (v: unknown, s: number) => Response }) {
  if (err instanceof ConsultorioSocialNoActivoError) return c.json({ error: err.code, message: err.message }, 404)
  if (err instanceof PreguntaNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
  throw err
}

export const consultorioSocialStaffRouter = new OpenAPIHono<HonoEnv>()
consultorioSocialStaffRouter.use("*", requireAuth)

consultorioSocialStaffRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/preguntas",
    operationId: "social_consultorio_staff_listar_preguntas",
    tags: ["Social"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      200: okResponse("Preguntas del consultorio", z.record(z.string(), z.unknown())),
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
      const result = await new ListarPreguntasConsultorioUseCase(makeRepo()).ejecutar(c.req.param("slug"), { take, page, order, incluirInactivas })
      return c.json(result)
    } catch (err) { return handleError(err, c) as Response }
  },
)

consultorioSocialStaffRouter.openapi(
  createRoute({
    method: "post",
    path: "/{slug}/preguntas/{preguntaId}/responder",
    operationId: "social_consultorio_staff_responder_pregunta",
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
    const parsed = RespuestaPreguntaSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const repo = makeRepo()
      const { consultorioId } = await repo.resolveConsultorioInfo(c.req.param("slug"))
      const result = await new ResponderPreguntaConsultorioUseCase(repo).ejecutar(
        c.req.param("preguntaId"),
        consultorioId,
        session.user.id,
        parsed.data.respuesta,
      )
      return c.json(result, 201)
    } catch (err) { return handleError(err, c) as Response }
  },
)

consultorioSocialStaffRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{slug}/preguntas/{preguntaId}/ocultar",
    operationId: "social_consultorio_staff_ocultar_pregunta",
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
      const result = await new OcultarPreguntaConsultorioUseCase(makeRepo()).ejecutar(c.req.param("slug"), c.req.param("preguntaId"), rol)
      return c.json(result)
    } catch (err) { return handleError(err, c) as Response }
  },
)

consultorioSocialStaffRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{slug}/preguntas/{preguntaId}/mostrar",
    operationId: "social_consultorio_staff_mostrar_pregunta",
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
      const result = await new MostrarPreguntaConsultorioUseCase(makeRepo()).ejecutar(c.req.param("slug"), c.req.param("preguntaId"), rol)
      return c.json(result)
    } catch (err) { return handleError(err, c) as Response }
  },
)

consultorioSocialStaffRouter.openapi(
  createRoute({
    method: "post",
    path: "/{slug}/novedades",
    operationId: "social_consultorio_staff_publicar_novedad",
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
    const parsed = NovedadSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new PublicarNovedadConsultorioUseCase(makeRepo(), getConsultorioSocialNotificador()).ejecutar(
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
