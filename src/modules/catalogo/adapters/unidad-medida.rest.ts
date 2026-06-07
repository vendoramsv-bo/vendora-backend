import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { UnidadMedidaPrismaRepository } from "../infrastructure/unidad-medida.prisma.repository.js"
import { ListarUnidadesUseCase } from "../application/unidad-medida/listar-unidades.usecase.js"
import { CrearUnidadUseCase } from "../application/unidad-medida/crear-unidad.usecase.js"
import { ActualizarUnidadUseCase } from "../application/unidad-medida/actualizar-unidad.usecase.js"
import { UnidadCreateSchema, UnidadUpdateSchema } from "./catalogo.schema.js"
import { UnidadDuplicada, UnidadNoEncontrada } from "../domain/catalogo.errors.js"
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"

export const unidadMedidaRouter = new OpenAPIHono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() {
  return new UnidadMedidaPrismaRepository(db)
}

unidadMedidaRouter.openapi(
  createRoute({
    method: "get",
    path: "/cla-unidades",
    operationId: "catalogo_listar_cla_unidades",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de clasificadores de unidades", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const clasificadores = await makeRepo().listarClasificadores()
    return c.json({ data: clasificadores })
  },
)

unidadMedidaRouter.openapi(
  createRoute({
    method: "get",
    path: "/unidades",
    operationId: "catalogo_listar_unidades",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de unidades de medida", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const resultado = await new ListarUnidadesUseCase(makeRepo()).ejecutar(tenantId)
    return c.json({ data: resultado.unidades.map((u) => u.toJSON()) })
  },
)

unidadMedidaRouter.openapi(
  createRoute({
    method: "post",
    path: "/unidades",
    operationId: "catalogo_crear_unidad",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: {
      body: { content: { "application/json": { schema: UnidadCreateSchema } } },
    },
    responses: {
      201: createdResponse("Unidad creada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = UnidadCreateSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const unidad = await new CrearUnidadUseCase(makeRepo()).ejecutar(parsed.data, tenantId, session.user.id)
      return c.json(unidad.toJSON(), 201)
    } catch (err) {
      if (err instanceof UnidadDuplicada) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

unidadMedidaRouter.openapi(
  createRoute({
    method: "put",
    path: "/unidades/{id}",
    operationId: "catalogo_actualizar_unidad",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: {
      params: z.object({ id: z.string() }),
      body: { content: { "application/json": { schema: UnidadUpdateSchema } } },
    },
    responses: {
      200: okResponse("Unidad actualizada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = UnidadUpdateSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const unidad = await new ActualizarUnidadUseCase(makeRepo()).ejecutar(c.req.param("id"), parsed.data, tenantId, session.user.id)
      return c.json(unidad.toJSON())
    } catch (err) {
      if (err instanceof UnidadNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)
