import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { ServicioMedicoPrismaRepository } from "../infrastructure/servicio-medico.prisma.repository.js"
import { CrearServicioUseCase } from "../application/servicio-medico/crear-servicio.usecase.js"
import { ListarServiciosUseCase } from "../application/servicio-medico/listar-servicios.usecase.js"
import { ObtenerServicioUseCase } from "../application/servicio-medico/obtener-servicio.usecase.js"
import { ActualizarServicioUseCase } from "../application/servicio-medico/actualizar-servicio.usecase.js"
import { ServicioBaseSchema, ServicioUpdateSchema, QueryParamsConsultorioSchema } from "./consultorio.schema.js"
import { ServicioNoEncontrado, ServicioNombreDuplicado, ServicioEnUso } from "../domain/consultorio.errors.js"
import { paginate } from "../../../core/query-params.js"
import { requireRol } from "../../../core/hono-context.js"
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"

export const servicioMedicoRouter = new OpenAPIHono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() { return new ServicioMedicoPrismaRepository(db) }

async function getConsultorioId(tenantId: string): Promise<string | null> {
  const r = await db.consultorio.findUnique({ where: { tenantId }, select: { id: true } })
  return r?.id ?? null
}

servicioMedicoRouter.openapi(
  createRoute({
    method: "get",
    path: "/servicios",
    operationId: "consultorio_listar_servicios",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de servicios médicos", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const cId = await getConsultorioId(c.get("tenantId"))
    if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
    const params = QueryParamsConsultorioSchema.parse(c.req.query())
    const resultado = await new ListarServiciosUseCase(makeRepo()).ejecutar(cId, params)
    return c.json(paginate(resultado.data.map((s) => s.toJSON()), resultado.total, params))
  },
)

servicioMedicoRouter.openapi(
  createRoute({
    method: "post",
    path: "/servicios",
    operationId: "consultorio_crear_servicio",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    responses: {
      201: createdResponse("Servicio médico creado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const session = c.get("session")
    const cId = await getConsultorioId(c.get("tenantId"))
    if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
    const body = await c.req.json()
    const parsed = ServicioBaseSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const servicio = await new CrearServicioUseCase(makeRepo()).ejecutar(parsed.data, cId, session.user.id)
      return c.json(servicio.toJSON(), 201)
    } catch (err) {
      if (err instanceof ServicioNombreDuplicado) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

servicioMedicoRouter.openapi(
  createRoute({
    method: "get",
    path: "/servicios/{id}",
    operationId: "consultorio_obtener_servicio",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: okResponse("Servicio médico", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const cId = await getConsultorioId(c.get("tenantId"))
    if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
    try {
      const s = await new ObtenerServicioUseCase(makeRepo()).ejecutar(c.req.param("id"), cId)
      return c.json(s.toJSON())
    } catch (err) {
      if (err instanceof ServicioNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

servicioMedicoRouter.openapi(
  createRoute({
    method: "put",
    path: "/servicios/{id}",
    operationId: "consultorio_actualizar_servicio",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: okResponse("Servicio médico actualizado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const session = c.get("session")
    const cId = await getConsultorioId(c.get("tenantId"))
    if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
    const body = await c.req.json()
    const parsed = ServicioUpdateSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const s = await new ActualizarServicioUseCase(makeRepo()).ejecutar(c.req.param("id"), parsed.data, session.user.id, cId)
      return c.json(s.toJSON())
    } catch (err) {
      if (err instanceof ServicioNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof ServicioEnUso) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)
