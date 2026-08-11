import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol, ROLES_ATENCION } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { GastosPrismaRepository } from "../infrastructure/gastos.prisma.repository.js"
import { CrearGastoUseCase } from "../application/gastos/crear-gasto.usecase.js"
import { ActualizarGastoUseCase } from "../application/gastos/actualizar-gasto.usecase.js"
import { EliminarGastoUseCase } from "../application/gastos/eliminar-gasto.usecase.js"
import { ListarGastosUseCase } from "../application/gastos/listar-gastos.usecase.js"
import {
  CrearGastoSchema,
  ActualizarGastoSchema,
  QueryParamsGastosSchema,
} from "./ventas.schema.js"
import { GastoNoEncontradoError } from "../domain/ventas.errors.js"
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"

export const gastosRouter = new OpenAPIHono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() { return new GastosPrismaRepository(db) }

// GET /gastos
gastosRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    operationId: "ventas_listar_gastos",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de gastos", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const params = QueryParamsGastosSchema.parse(c.req.query())
    const incluirEliminados = c.req.query("incluirEliminados") === "true"
    const result = await new ListarGastosUseCase(makeRepo()).execute(tenantId, params, incluirEliminados)
    return c.json(result)
  },
)

// POST /gastos
gastosRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    operationId: "ventas_crear_gasto",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_ATENCION),
    request: {
      body: {
        content: {
          "application/json": { schema: CrearGastoSchema },
        },
      },
    },
    responses: {
      201: createdResponse("Gasto creado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = CrearGastoSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    const result = await new CrearGastoUseCase(makeRepo()).execute({
      tenantId,
      tenantMemberId: c.get("miembro").id,
      fecha: new Date(parsed.data.fecha),
      motivo: parsed.data.motivo,
      totalGasto: parsed.data.totalGasto,
      createdById: session.user.id,
    })
    return c.json(result, 201)
  },
)

// PATCH /gastos/:id
gastosRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{id}",
    operationId: "ventas_actualizar_gasto",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_ATENCION),
    request: {
      params: z.object({ id: z.string() }),
      body: {
        content: {
          "application/json": { schema: ActualizarGastoSchema },
        },
      },
    },
    responses: {
      200: okResponse("Gasto actualizado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = ActualizarGastoSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new ActualizarGastoUseCase(makeRepo()).execute({
        id: c.req.param("id"),
        tenantId,
        fecha: parsed.data.fecha ? new Date(parsed.data.fecha) : undefined,
        motivo: parsed.data.motivo,
        totalGasto: parsed.data.totalGasto,
        updatedById: session.user.id,
      })
      return c.json(result)
    } catch (err) {
      if (err instanceof GastoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

// DELETE /gastos/:id
gastosRouter.openapi(
  createRoute({
    method: "delete",
    path: "/{id}",
    operationId: "ventas_eliminar_gasto",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_ATENCION),
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      204: { description: "Gasto eliminado" },
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    try {
      await new EliminarGastoUseCase(makeRepo()).execute(c.req.param("id"), tenantId, session.user.id)
      return c.body(null, 204)
    } catch (err) {
      if (err instanceof GastoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)
