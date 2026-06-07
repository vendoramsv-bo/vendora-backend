import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import { requireAuth, type HonoEnv } from "../../../core/hono-context.js"
import { ConsultorioPublicoPrismaRepository } from "../infrastructure/consultorio-publico.prisma.repository.js"
import { getConsultorioPublicoNotificador } from "../infrastructure/consultorio-publico.notificador.provider.js"
import { CrearCitaOnlineUseCase } from "../application/cita-online/crear-cita-online.usecase.js"
import { ListarMisCitasUseCase } from "../application/cita-online/listar-mis-citas.usecase.js"
import { CancelarCitaOnlineUseCase } from "../application/cita-online/cancelar-cita-online.usecase.js"
import { CrearCitaOnlineBodySchema, MisCitasQuerySchema } from "./consultorio.schema.js"
import { ConsultorioNoEncontradoError, SlotNoDisponibleError, CitaNoCancelableError, MedicoNoDisponibleError, ServicioNoDisponibleError } from "../domain/consultorio-publico.errors.js"
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"

export const consultorioConsumerCitasRouter = new OpenAPIHono<HonoEnv>()
consultorioConsumerCitasRouter.use("*", requireAuth)

function makeRepo() { return new ConsultorioPublicoPrismaRepository() }

consultorioConsumerCitasRouter.openapi(
  createRoute({
    method: "post",
    path: "/{slug}/citas",
    operationId: "consultorio_consumer_crear_cita",
    tags: ["Consultorio Público"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      201: createdResponse("Cita creada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
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
  },
)

consultorioConsumerCitasRouter.openapi(
  createRoute({
    method: "get",
    path: "/mis-citas",
    operationId: "consultorio_consumer_mis_citas",
    tags: ["Consultorio Público"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Mis citas", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const session = c.get("session")
    const q = c.req.query()
    const parsed = MisCitasQuerySchema.safeParse(q)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

    const resultado = await new ListarMisCitasUseCase(makeRepo()).ejecutar(session.user.id, parsed.data)
    return c.json(resultado)
  },
)

consultorioConsumerCitasRouter.openapi(
  createRoute({
    method: "patch",
    path: "/mis-citas/{citaId}/cancelar",
    operationId: "consultorio_consumer_cancelar_cita",
    tags: ["Consultorio Público"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ citaId: z.string() }) },
    responses: {
      200: okResponse("Cita cancelada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
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
  },
)
