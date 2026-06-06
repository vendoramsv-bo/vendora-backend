import { Hono } from "hono"
import { z } from "zod"
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

export const consultorioSocialConsumerRouter = new Hono<HonoEnv>()
consultorioSocialConsumerRouter.use("*", requireAuth)

consultorioSocialConsumerRouter.post("/:slug/reaccionar", async (c) => {
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = ReaccionSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const result = await new ReaccionarConsultorioUseCase(makeRepo()).ejecutar(c.req.param("slug"), session.user.id, parsed.data.tipo)
    return c.json(result)
  } catch (err) { return handleError(err, c) as Response }
})

consultorioSocialConsumerRouter.post("/:slug/comentarios", async (c) => {
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
})

consultorioSocialConsumerRouter.post("/:slug/comentarios/:comentarioId/responder", async (c) => {
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
})

consultorioSocialConsumerRouter.post("/:slug/valorar", async (c) => {
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
})

consultorioSocialConsumerRouter.post("/:slug/preguntas", async (c) => {
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
})

consultorioSocialConsumerRouter.post("/:slug/seguir", async (c) => {
  const session = c.get("session")
  try {
    const result = await new ToggleSeguirConsultorioUseCase(makeRepo(), getConsultorioSocialNotificador()).ejecutar(c.req.param("slug"), session.user.id)
    return c.json(result)
  } catch (err) { return handleError(err, c) as Response }
})

consultorioSocialConsumerRouter.post("/:slug/favorito", async (c) => {
  const session = c.get("session")
  try {
    const result = await new ToggleFavoritoConsultorioUseCase(makeRepo()).ejecutar(c.req.param("slug"), session.user.id)
    return c.json(result)
  } catch (err) { return handleError(err, c) as Response }
})
