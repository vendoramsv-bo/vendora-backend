import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { TiempoComidaPrismaRepository } from "../infrastructure/tiempo-comida.prisma.repository.js"
import { ListarTiemposComidaUseCase } from "../application/tiempo-comida/listar-tiempos-comida.usecase.js"
import { CrearTiempoComidaUseCase } from "../application/tiempo-comida/crear-tiempo-comida.usecase.js"
import { ActualizarTiempoComidaUseCase } from "../application/tiempo-comida/actualizar-tiempo-comida.usecase.js"
import { EliminarTiempoComidaUseCase } from "../application/tiempo-comida/eliminar-tiempo-comida.usecase.js"
import { TiempoComidaCreateSchema, TiempoComidaUpdateSchema } from "./restaurante.schema.js"
import { TiempoComidaNoEncontrado, TiempoComidaDuplicado, TiempoComidaEnUso } from "../domain/restaurante.errors.js"
import { resolverRestauranteId } from "./restaurante.rest.js"
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"

export const tiempoComidaRouter = new OpenAPIHono<HonoEnv>()

function makeRepo() {
  return new TiempoComidaPrismaRepository()
}

tiempoComidaRouter.openapi(
  createRoute({
    method: "get",
    path: "/tiempos-comida",
    operationId: "restaurante_listar_tiempos_comida",
    tags: ["Restaurante"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de tiempos de comida", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const restauranteId = await resolverRestauranteId(tenantId)
    if (!restauranteId) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)
    const soloActivos = c.req.query("estado") !== "INACTIVO"
    const tiempos = await new ListarTiemposComidaUseCase(makeRepo()).ejecutar(restauranteId, soloActivos)
    return c.json({ data: tiempos.map((t) => t.toJSON()), meta: { total: tiempos.length } })
  },
)

tiempoComidaRouter.openapi(
  createRoute({
    method: "post",
    path: "/tiempos-comida",
    operationId: "restaurante_crear_tiempo_comida",
    tags: ["Restaurante"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN", "ENCARGADO"]),
    request: {
      body: { content: { "application/json": { schema: TiempoComidaCreateSchema } } },
    },
    responses: {
      201: createdResponse("Tiempo de comida creado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = TiempoComidaCreateSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    const restauranteId = await resolverRestauranteId(tenantId)
    if (!restauranteId) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)
    try {
      const tc = await new CrearTiempoComidaUseCase(makeRepo()).ejecutar({ ...parsed.data, restauranteId }, session.user.id)
      return c.json(tc.toJSON(), 201)
    } catch (err) {
      if (err instanceof TiempoComidaDuplicado) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

tiempoComidaRouter.openapi(
  createRoute({
    method: "get",
    path: "/tiempos-comida/{id}",
    operationId: "restaurante_obtener_tiempo_comida",
    tags: ["Restaurante"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: okResponse("Tiempo de comida", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const restauranteId = await resolverRestauranteId(tenantId)
    if (!restauranteId) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)
    const repo = makeRepo()
    const tc = await repo.findById(c.req.param("id"), restauranteId)
    if (!tc) return c.json({ error: "TIEMPO_COMIDA_NO_ENCONTRADO" }, 404)
    return c.json(tc.toJSON())
  },
)

tiempoComidaRouter.openapi(
  createRoute({
    method: "put",
    path: "/tiempos-comida/{id}",
    operationId: "restaurante_actualizar_tiempo_comida",
    tags: ["Restaurante"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN", "ENCARGADO"]),
    request: {
      params: z.object({ id: z.string() }),
      body: { content: { "application/json": { schema: TiempoComidaUpdateSchema } } },
    },
    responses: {
      200: okResponse("Tiempo de comida actualizado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = TiempoComidaUpdateSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    const restauranteId = await resolverRestauranteId(tenantId)
    if (!restauranteId) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)
    try {
      const tc = await new ActualizarTiempoComidaUseCase(makeRepo()).ejecutar(c.req.param("id"), restauranteId, parsed.data, session.user.id)
      return c.json(tc.toJSON())
    } catch (err) {
      if (err instanceof TiempoComidaNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof TiempoComidaDuplicado) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

tiempoComidaRouter.openapi(
  createRoute({
    method: "delete",
    path: "/tiempos-comida/{id}",
    operationId: "restaurante_eliminar_tiempo_comida",
    tags: ["Restaurante"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: { params: z.object({ id: z.string() }) },
    responses: {
      204: { description: "Eliminado" },
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const restauranteId = await resolverRestauranteId(tenantId)
    if (!restauranteId) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)
    try {
      await new EliminarTiempoComidaUseCase(makeRepo()).ejecutar(c.req.param("id"), restauranteId, session.user.id)
      return c.body(null, 204)
    } catch (err) {
      if (err instanceof TiempoComidaNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof TiempoComidaEnUso) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)
