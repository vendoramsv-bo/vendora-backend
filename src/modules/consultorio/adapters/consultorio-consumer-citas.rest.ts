import { Hono } from "hono"
import { requireAuth, type HonoEnv } from "../../../core/hono-context.js"
import { ConsultorioPublicoPrismaRepository } from "../infrastructure/consultorio-publico.prisma.repository.js"
import { getConsultorioPublicoNotificador } from "../infrastructure/consultorio-publico.notificador.provider.js"
import { CrearCitaOnlineUseCase } from "../application/cita-online/crear-cita-online.usecase.js"
import { ListarMisCitasUseCase } from "../application/cita-online/listar-mis-citas.usecase.js"
import { CancelarCitaOnlineUseCase } from "../application/cita-online/cancelar-cita-online.usecase.js"
import { CrearCitaOnlineBodySchema, MisCitasQuerySchema } from "./consultorio.schema.js"
import { ConsultorioNoEncontradoError, SlotNoDisponibleError, CitaNoCancelableError, MedicoNoDisponibleError, ServicioNoDisponibleError } from "../domain/consultorio-publico.errors.js"

export const consultorioConsumerCitasRouter = new Hono<HonoEnv>()
consultorioConsumerCitasRouter.use("*", requireAuth)

function makeRepo() { return new ConsultorioPublicoPrismaRepository() }

// POST /api/consumer/consultorios/:slug/citas
consultorioConsumerCitasRouter.post("/:slug/citas", async (c) => {
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = CrearCitaOnlineBodySchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

  try {
    const cita = await new CrearCitaOnlineUseCase(makeRepo(), getConsultorioPublicoNotificador()).ejecutar(
      c.req.param("slug"),
      { medicoId: parsed.data.medicoId, servicioId: parsed.data.servicioId, fechaHora: new Date(parsed.data.fechaHora), motivo: parsed.data.motivo },
      session.user.id,
    )
    return c.json(cita, 201)
  } catch (err) {
    if (err instanceof ConsultorioNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof SlotNoDisponibleError) return c.json({ error: err.code, message: err.message }, 409)
    if (err instanceof MedicoNoDisponibleError) return c.json({ error: err.code, message: err.message }, 400)
    if (err instanceof ServicioNoDisponibleError) return c.json({ error: err.code, message: err.message }, 400)
    throw err
  }
})

// GET /api/consumer/consultorios/mis-citas
consultorioConsumerCitasRouter.get("/mis-citas", async (c) => {
  const session = c.get("session")
  const q = c.req.query()
  const parsed = MisCitasQuerySchema.safeParse(q)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

  const resultado = await new ListarMisCitasUseCase(makeRepo()).ejecutar(session.user.id, parsed.data)
  return c.json(resultado)
})

// PATCH /api/consumer/consultorios/mis-citas/:citaId/cancelar
consultorioConsumerCitasRouter.patch("/mis-citas/:citaId/cancelar", async (c) => {
  const session = c.get("session")
  try {
    const resultado = await new CancelarCitaOnlineUseCase(makeRepo()).ejecutar(c.req.param("citaId"), session.user.id)
    return c.json(resultado)
  } catch (err) {
    if (err instanceof CitaNoCancelableError) return c.json({ error: err.code, message: err.message }, 409)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((err as any)?.statusCode === 403) return c.json({ error: "FORBIDDEN", message: (err as Error).message }, 403)
    throw err
  }
})
