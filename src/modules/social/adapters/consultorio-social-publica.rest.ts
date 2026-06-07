import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { ConsultorioSocialPrismaRepository } from "../infrastructure/consultorio-social.prisma.repository.js"
import { ListarComentariosConsultorioUseCase } from "../application/consultorio/listar-comentarios-consultorio.usecase.js"
import { ListarValoracionesConsultorioUseCase } from "../application/consultorio/listar-valoraciones-consultorio.usecase.js"
import { ListarPreguntasConsultorioUseCase } from "../application/consultorio/listar-preguntas-consultorio.usecase.js"
import { ListarPublicacionesConsultorioUseCase } from "../application/publicacion-consultorio/listar-publicaciones-consultorio.usecase.js"
import { ConsultorioSocialNoActivoError } from "../domain/consultorio-social.errors.js"
import { errorResponses, okResponse } from "../../../core/openapi-responses.js"

function makeRepo() { return new ConsultorioSocialPrismaRepository() }

function handleError(err: unknown, c: { json: (v: unknown, s: number) => Response }) {
  if (err instanceof ConsultorioSocialNoActivoError) return c.json({ error: err.code, message: err.message }, 404)
  throw err
}

export const consultorioSocialPublicaRouter = new OpenAPIHono<HonoEnv>()

consultorioSocialPublicaRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/reacciones",
    operationId: "social_consultorio_publica_reacciones",
    tags: ["Social"],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      200: okResponse("Reacciones del consultorio", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    try {
      const repo = makeRepo()
      const { consultorioId } = await repo.resolveConsultorioInfo(c.req.param("slug"))
      const reacciones = await repo.listarReacciones(consultorioId)
      return c.json({ data: reacciones, meta: { total: reacciones.reduce((s, r) => s + r.total, 0) } })
    } catch (err) { return handleError(err, c) as Response }
  },
)

consultorioSocialPublicaRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/comentarios",
    operationId: "social_consultorio_publica_comentarios",
    tags: ["Social"],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      200: okResponse("Comentarios del consultorio", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const q = c.req.query()
    const take = Math.min(Number(q.take ?? 20), 100)
    const page = Number(q.page ?? 1)
    const order = (q.order === "asc" ? "asc" : "desc") as "asc" | "desc"
    try {
      const result = await new ListarComentariosConsultorioUseCase(makeRepo()).ejecutar(c.req.param("slug"), { take, page, order })
      return c.json(result)
    } catch (err) { return handleError(err, c) as Response }
  },
)

consultorioSocialPublicaRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/valoraciones",
    operationId: "social_consultorio_publica_valoraciones",
    tags: ["Social"],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      200: okResponse("Valoraciones del consultorio", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const q = c.req.query()
    const take = Math.min(Number(q.take ?? 20), 100)
    const page = Number(q.page ?? 1)
    const order = (q.order === "asc" ? "asc" : "desc") as "asc" | "desc"
    try {
      const result = await new ListarValoracionesConsultorioUseCase(makeRepo()).ejecutar(c.req.param("slug"), { take, page, order, orderBy: q.orderBy })
      return c.json(result)
    } catch (err) { return handleError(err, c) as Response }
  },
)

consultorioSocialPublicaRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/preguntas",
    operationId: "social_consultorio_publica_preguntas",
    tags: ["Social"],
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
    try {
      const result = await new ListarPreguntasConsultorioUseCase(makeRepo()).ejecutar(c.req.param("slug"), { take, page, order })
      return c.json(result)
    } catch (err) { return handleError(err, c) as Response }
  },
)

consultorioSocialPublicaRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/seguidores/count",
    operationId: "social_consultorio_publica_seguidores_count",
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
      const { consultorioId } = await repo.resolveConsultorioInfo(c.req.param("slug"))
      const total = await repo.getTotalSeguidores(consultorioId)
      return c.json({ count: total })
    } catch (err) { return handleError(err, c) as Response }
  },
)

consultorioSocialPublicaRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/publicaciones",
    operationId: "social_consultorio_publica_publicaciones",
    tags: ["Social"],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      200: okResponse("Publicaciones del consultorio", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const q = c.req.query()
    const take = Math.min(Number(q.take ?? 20), 100)
    const page = Number(q.page ?? 1)
    try {
      const result = await new ListarPublicacionesConsultorioUseCase(makeRepo()).ejecutar(c.req.param("slug"), { take, page })
      return c.json(result)
    } catch (err) { return handleError(err, c) as Response }
  },
)
