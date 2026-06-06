import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { ConsultorioSocialPrismaRepository } from "../infrastructure/consultorio-social.prisma.repository.js"
import { ListarComentariosConsultorioUseCase } from "../application/consultorio/listar-comentarios-consultorio.usecase.js"
import { ListarValoracionesConsultorioUseCase } from "../application/consultorio/listar-valoraciones-consultorio.usecase.js"
import { ListarPreguntasConsultorioUseCase } from "../application/consultorio/listar-preguntas-consultorio.usecase.js"
import { ListarPublicacionesConsultorioUseCase } from "../application/publicacion-consultorio/listar-publicaciones-consultorio.usecase.js"
import { ConsultorioSocialNoActivoError } from "../domain/consultorio-social.errors.js"

function makeRepo() { return new ConsultorioSocialPrismaRepository() }

function handleError(err: unknown, c: { json: (v: unknown, s: number) => Response }) {
  if (err instanceof ConsultorioSocialNoActivoError) return c.json({ error: err.code, message: err.message }, 404)
  throw err
}

export const consultorioSocialPublicaRouter = new Hono<HonoEnv>()

consultorioSocialPublicaRouter.get("/:slug/reacciones", async (c) => {
  try {
    const repo = makeRepo()
    const { consultorioId } = await repo.resolveConsultorioInfo(c.req.param("slug"))
    const reacciones = await repo.listarReacciones(consultorioId)
    return c.json({ data: reacciones, meta: { total: reacciones.reduce((s, r) => s + r.total, 0) } })
  } catch (err) { return handleError(err, c) as Response }
})

consultorioSocialPublicaRouter.get("/:slug/comentarios", async (c) => {
  const q = c.req.query()
  const take = Math.min(Number(q.take ?? 20), 100)
  const page = Number(q.page ?? 1)
  const order = (q.order === "asc" ? "asc" : "desc") as "asc" | "desc"
  try {
    const result = await new ListarComentariosConsultorioUseCase(makeRepo()).ejecutar(c.req.param("slug"), { take, page, order })
    return c.json(result)
  } catch (err) { return handleError(err, c) as Response }
})

consultorioSocialPublicaRouter.get("/:slug/valoraciones", async (c) => {
  const q = c.req.query()
  const take = Math.min(Number(q.take ?? 20), 100)
  const page = Number(q.page ?? 1)
  const order = (q.order === "asc" ? "asc" : "desc") as "asc" | "desc"
  try {
    const result = await new ListarValoracionesConsultorioUseCase(makeRepo()).ejecutar(c.req.param("slug"), { take, page, order, orderBy: q.orderBy })
    return c.json(result)
  } catch (err) { return handleError(err, c) as Response }
})

consultorioSocialPublicaRouter.get("/:slug/preguntas", async (c) => {
  const q = c.req.query()
  const take = Math.min(Number(q.take ?? 20), 100)
  const page = Number(q.page ?? 1)
  const order = (q.order === "asc" ? "asc" : "desc") as "asc" | "desc"
  try {
    const result = await new ListarPreguntasConsultorioUseCase(makeRepo()).ejecutar(c.req.param("slug"), { take, page, order })
    return c.json(result)
  } catch (err) { return handleError(err, c) as Response }
})

consultorioSocialPublicaRouter.get("/:slug/seguidores/count", async (c) => {
  try {
    const repo = makeRepo()
    const { consultorioId } = await repo.resolveConsultorioInfo(c.req.param("slug"))
    const total = await repo.getTotalSeguidores(consultorioId)
    return c.json({ count: total })
  } catch (err) { return handleError(err, c) as Response }
})

consultorioSocialPublicaRouter.get("/:slug/publicaciones", async (c) => {
  const q = c.req.query()
  const take = Math.min(Number(q.take ?? 20), 100)
  const page = Number(q.page ?? 1)
  try {
    const result = await new ListarPublicacionesConsultorioUseCase(makeRepo()).ejecutar(c.req.param("slug"), { take, page })
    return c.json(result)
  } catch (err) { return handleError(err, c) as Response }
})
