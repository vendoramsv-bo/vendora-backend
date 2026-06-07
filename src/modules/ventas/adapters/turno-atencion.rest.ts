import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { TurnoAtencionPrismaRepository } from "../infrastructure/turno-atencion.prisma.repository.js"
import { CrearTurnoAtencionUseCase } from "../application/turnoAtencion/crear-turno-atencion.usecase.js"
import { ActualizarTurnoAtencionUseCase } from "../application/turnoAtencion/actualizar-turno-atencion.usecase.js"
import { CambiarEstadoTurnoAtencionUseCase } from "../application/turnoAtencion/cambiar-estado-turno-atencion.usecase.js"
import { ListarTurnosAtencionUseCase } from "../application/turnoAtencion/listar-turnos-atencion.usecase.js"
import {
  CrearTurnoAtencionSchema,
  ActualizarTurnoAtencionSchema,
  CambiarEstadoSchema,
  QueryParamsTurnoSchema,
} from "./ventas.schema.js"
import {
  TurnoNoEncontradoError,
  TurnoNombreDuplicadoError,
} from "../domain/ventas.errors.js"
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"

export const turnoAtencionRouter = new OpenAPIHono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() {
  return new TurnoAtencionPrismaRepository(db)
}

// GET /turnos-atencion
turnoAtencionRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    operationId: "ventas_listar_turnos_atencion",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de turnos de atención", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const params = QueryParamsTurnoSchema.parse(c.req.query())
    const result = await new ListarTurnosAtencionUseCase(makeRepo()).execute(tenantId, params)
    return c.json(result)
  },
)

// POST /turnos-atencion
turnoAtencionRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    operationId: "ventas_crear_turno_atencion",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: {
      body: {
        content: {
          "application/json": { schema: CrearTurnoAtencionSchema },
        },
      },
    },
    responses: {
      201: createdResponse("Turno de atención creado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = CrearTurnoAtencionSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new CrearTurnoAtencionUseCase(makeRepo()).execute({
        tenantId,
        turno: parsed.data.turno,
        descripcion: parsed.data.descripcion,
        createdById: session.user.id,
      })
      return c.json(result, 201)
    } catch (err) {
      if (err instanceof TurnoNombreDuplicadoError) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

// PATCH /turnos-atencion/:id
turnoAtencionRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{id}",
    operationId: "ventas_actualizar_turno_atencion",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: {
      params: z.object({ id: z.string() }),
      body: {
        content: {
          "application/json": { schema: ActualizarTurnoAtencionSchema },
        },
      },
    },
    responses: {
      200: okResponse("Turno de atención actualizado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = ActualizarTurnoAtencionSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new ActualizarTurnoAtencionUseCase(makeRepo()).execute({
        id: c.req.param("id"),
        tenantId,
        turno: parsed.data.turno,
        descripcion: parsed.data.descripcion,
        updatedById: session.user.id,
      })
      return c.json(result)
    } catch (err) {
      if (err instanceof TurnoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof TurnoNombreDuplicadoError) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

// PATCH /turnos-atencion/:id/estado
turnoAtencionRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{id}/estado",
    operationId: "ventas_cambiar_estado_turno_atencion",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: {
      params: z.object({ id: z.string() }),
      body: {
        content: {
          "application/json": { schema: CambiarEstadoSchema },
        },
      },
    },
    responses: {
      200: okResponse("Estado de turno de atención actualizado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = CambiarEstadoSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new CambiarEstadoTurnoAtencionUseCase(makeRepo()).execute({
        id: c.req.param("id"),
        tenantId,
        estado: parsed.data.estado,
        updatedById: session.user.id,
      })
      return c.json(result)
    } catch (err) {
      if (err instanceof TurnoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)
