import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { VacunacionPrismaRepository } from "../infrastructure/vacunacion.prisma.repository.js"
import { PacientePrismaRepository } from "../infrastructure/paciente.prisma.repository.js"
import { CrearVacunacionUseCase } from "../application/vacunacion/crear-vacunacion.usecase.js"
import { ListarVacunacionesUseCase } from "../application/vacunacion/listar-vacunaciones.usecase.js"
import { EliminarVacunacionUseCase } from "../application/vacunacion/eliminar-vacunacion.usecase.js"
import { VacunacionSchema, QueryParamsConsultorioSchema } from "./consultorio.schema.js"
import { PacienteNoEncontrado, VacunacionNoEncontrada } from "../domain/consultorio.errors.js"
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"

export const vacunacionRouter = new OpenAPIHono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeVacunacionRepo() { return new VacunacionPrismaRepository(db) }
function makePacienteRepo() { return new PacientePrismaRepository(db) }

async function getConsultorioId(tenantId: string): Promise<string | null> {
  const r = await db.consultorio.findUnique({ where: { tenantId }, select: { id: true } })
  return r?.id ?? null
}

vacunacionRouter.openapi(
  createRoute({
    method: "get",
    path: "/pacientes/{pacienteId}/vacunaciones",
    operationId: "consultorio_listar_vacunaciones",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ pacienteId: z.string() }) },
    responses: {
      200: okResponse("Lista de vacunaciones", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const cId = await getConsultorioId(c.get("tenantId"))
    if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
    const params = QueryParamsConsultorioSchema.parse(c.req.query())
    try {
      await makePacienteRepo().obtener(c.req.param("pacienteId"), cId)
      const lista = await new ListarVacunacionesUseCase(makeVacunacionRepo()).ejecutar(c.req.param("pacienteId"), params)
      return c.json({ data: lista.map((v) => v.toJSON()) })
    } catch (err) {
      if (err instanceof PacienteNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

vacunacionRouter.openapi(
  createRoute({
    method: "post",
    path: "/pacientes/{pacienteId}/vacunaciones",
    operationId: "consultorio_crear_vacunacion",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ pacienteId: z.string() }) },
    responses: {
      201: createdResponse("Vacunación registrada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const cId = await getConsultorioId(c.get("tenantId"))
    if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
    const body = await c.req.json()
    const parsed = VacunacionSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const { fechaAplicacion, proximaDosis, ...rest } = parsed.data
      const data = {
        ...rest,
        ...(fechaAplicacion ? { fechaAplicacion: new Date(fechaAplicacion) } : {}),
        ...(proximaDosis ? { proximaDosis: new Date(proximaDosis) } : {}),
      }
      const vac = await new CrearVacunacionUseCase(makeVacunacionRepo(), makePacienteRepo()).ejecutar(
        c.req.param("pacienteId"), cId, data,
      )
      return c.json(vac.toJSON(), 201)
    } catch (err) {
      if (err instanceof PacienteNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

vacunacionRouter.openapi(
  createRoute({
    method: "delete",
    path: "/pacientes/{pacienteId}/vacunaciones/{id}",
    operationId: "consultorio_eliminar_vacunacion",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ pacienteId: z.string(), id: z.string() }) },
    responses: {
      200: okResponse("Vacunación eliminada", z.object({ ok: z.boolean() })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const cId = await getConsultorioId(c.get("tenantId"))
    if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
    try {
      await makePacienteRepo().obtener(c.req.param("pacienteId"), cId)
      await new EliminarVacunacionUseCase(makeVacunacionRepo()).ejecutar(c.req.param("id"), c.req.param("pacienteId"))
      return c.json({ ok: true })
    } catch (err) {
      if (err instanceof PacienteNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof VacunacionNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)
