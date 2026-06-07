import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { CitaPrismaRepository } from "../infrastructure/cita.prisma.repository.js"
import { getConsultorioNotificador } from "../infrastructure/consultorio.notificador.provider.js"
import { CrearCitaUseCase } from "../application/cita/crear-cita.usecase.js"
import { ListarCitasUseCase } from "../application/cita/listar-citas.usecase.js"
import { ObtenerCitaUseCase } from "../application/cita/obtener-cita.usecase.js"
import { ConfirmarCitaUseCase } from "../application/cita/confirmar-cita.usecase.js"
import { CancelarCitaUseCase } from "../application/cita/cancelar-cita.usecase.js"
import { MarcarNoAsistioUseCase } from "../application/cita/marcar-no-asistio.usecase.js"
import { CitaCreateSchema, ConfirmarCitaBodySchema, CancelarCitaBodySchema, QueryParamsConsultorioSchema } from "./consultorio.schema.js"
import { CitaNoEncontrada, CitaSolapada, CitaNoConfirmable, CitaYaAtendida, ConflictoVersionError } from "../domain/consultorio.errors.js"
import { paginate } from "../../../core/query-params.js"
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"

export const citaRouter = new OpenAPIHono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() { return new CitaPrismaRepository(db) }

async function getConsultorioId(tenantId: string): Promise<string | null> {
  const r = await db.consultorio.findUnique({ where: { tenantId }, select: { id: true } })
  return r?.id ?? null
}

citaRouter.openapi(
  createRoute({
    method: "get",
    path: "/citas",
    operationId: "consultorio_get_citas",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de citas", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const cId = await getConsultorioId(c.get("tenantId"))
    if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
    const params = QueryParamsConsultorioSchema.parse(c.req.query())
    const resultado = await new ListarCitasUseCase(makeRepo()).ejecutar(cId, params)
    return c.json(paginate(resultado.data.map((c2) => c2.toJSON()), resultado.total, params))
  },
)

citaRouter.openapi(
  createRoute({
    method: "post",
    path: "/citas",
    operationId: "consultorio_post_cita",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    responses: {
      201: createdResponse("Cita creada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const session = c.get("session")
    const tenantId = c.get("tenantId")
    const cId = await getConsultorioId(tenantId)
    if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
    const body = await c.req.json()
    const parsed = CitaCreateSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const cita = await new CrearCitaUseCase(makeRepo(), getConsultorioNotificador()).ejecutar(
        { ...parsed.data, fechaHora: new Date(parsed.data.fechaHora) },
        cId,
        session.user.id,
        tenantId,
      )
      return c.json(cita.toJSON(), 201)
    } catch (err) {
      if (err instanceof CitaSolapada) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

citaRouter.openapi(
  createRoute({
    method: "get",
    path: "/citas/{id}",
    operationId: "consultorio_get_cita",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Cita", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const cId = await getConsultorioId(c.get("tenantId"))
    if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
    try {
      const cita = await new ObtenerCitaUseCase(makeRepo()).ejecutar(c.req.param("id"), cId)
      return c.json(cita.toJSON())
    } catch (err) {
      if (err instanceof CitaNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

citaRouter.openapi(
  createRoute({
    method: "post",
    path: "/citas/{id}/confirmar",
    operationId: "consultorio_post_cita_confirmar",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Cita confirmada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const session = c.get("session")
    const tenantId = c.get("tenantId")
    const cId = await getConsultorioId(tenantId)
    if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
    const body = await c.req.json().catch(() => ({}))
    const parsed = ConfirmarCitaBodySchema.safeParse(body)
    const expectedUpdatedAt = parsed.success && parsed.data.expectedUpdatedAt ? new Date(parsed.data.expectedUpdatedAt) : undefined
    try {
      const cita = await new ConfirmarCitaUseCase(makeRepo(), getConsultorioNotificador()).ejecutar(
        c.req.param("id"), cId, session.user.id, tenantId, expectedUpdatedAt,
      )
      return c.json(cita.toJSON())
    } catch (err) {
      if (err instanceof CitaNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof CitaNoConfirmable) return c.json({ error: err.code, message: err.message }, 409)
      if (err instanceof ConflictoVersionError) return c.json({ error: err.code, message: err.message, statusCode: 409 }, 409)
      throw err
    }
  },
)

citaRouter.openapi(
  createRoute({
    method: "post",
    path: "/citas/{id}/cancelar",
    operationId: "consultorio_post_cita_cancelar",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Cita cancelada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const session = c.get("session")
    const tenantId = c.get("tenantId")
    const cId = await getConsultorioId(tenantId)
    if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
    const body = await c.req.json().catch(() => ({}))
    const parsed = CancelarCitaBodySchema.safeParse(body)
    const expectedUpdatedAt = parsed.success && parsed.data.expectedUpdatedAt ? new Date(parsed.data.expectedUpdatedAt) : undefined
    try {
      const cita = await new CancelarCitaUseCase(makeRepo(), getConsultorioNotificador()).ejecutar(
        c.req.param("id"), cId, session.user.id, tenantId, expectedUpdatedAt,
      )
      return c.json(cita.toJSON())
    } catch (err) {
      if (err instanceof CitaNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof CitaYaAtendida) return c.json({ error: err.code, message: err.message }, 409)
      if (err instanceof ConflictoVersionError) return c.json({ error: err.code, message: err.message, statusCode: 409 }, 409)
      throw err
    }
  },
)

citaRouter.openapi(
  createRoute({
    method: "post",
    path: "/citas/{id}/no-asistio",
    operationId: "consultorio_post_cita_no_asistio",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Marcado como no asistió", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const session = c.get("session")
    const tenantId = c.get("tenantId")
    const cId = await getConsultorioId(tenantId)
    if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
    try {
      const cita = await new MarcarNoAsistioUseCase(makeRepo(), getConsultorioNotificador()).ejecutar(
        c.req.param("id"), cId, session.user.id, tenantId,
      )
      return c.json(cita.toJSON())
    } catch (err) {
      if (err instanceof CitaNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof CitaYaAtendida) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)
