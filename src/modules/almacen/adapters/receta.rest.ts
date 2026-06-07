import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { RecetaProductoPrismaRepository } from "../infrastructure/receta-producto.prisma.repository.js"
import { InsumosPrismaRepository } from "../infrastructure/insumo.prisma.repository.js"
import { SalidaAlmacenPrismaRepository } from "../infrastructure/salida-almacen.prisma.repository.js"
import { ObtenerRecetaUseCase } from "../application/receta/obtener-receta.usecase.js"
import { DefinirRecetaUseCase } from "../application/receta/definir-receta.usecase.js"
import { EliminarRecetaUseCase } from "../application/receta/eliminar-receta.usecase.js"
import { RegistrarConsumoUseCase } from "../application/receta/registrar-consumo.usecase.js"
import { DefinirRecetaSchema, ConsumirProductoSchema } from "./almacen.schema.js"
import { InsumoNoEncontradoError, StockInsuficienteError } from "../domain/almacen.errors.js"
import { getAlmacenNotificador } from "../infrastructure/almacen.notificador.provider.js"
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"

export const recetaRouter = new OpenAPIHono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRecetaRepo() { return new RecetaProductoPrismaRepository(db) }
function makeInsumoRepo() { return new InsumosPrismaRepository(db) }

// GET /productos/:productoId/receta
recetaRouter.openapi(
  createRoute({
    method: "get",
    path: "/productos/{productoId}/receta",
    operationId: "almacen_obtener_receta",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ productoId: z.string() }) },
    responses: {
      200: okResponse("Receta del producto", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const varianteId = c.req.query("varianteId")
    const result = await new ObtenerRecetaUseCase(makeRecetaRepo()).execute(
      c.req.param("productoId"),
      varianteId
    )
    return c.json(result)
  },
)

// PUT /productos/:productoId/receta
recetaRouter.openapi(
  createRoute({
    method: "put",
    path: "/productos/{productoId}/receta",
    operationId: "almacen_definir_receta",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: {
      params: z.object({ productoId: z.string() }),
      body: { content: { "application/json": { schema: DefinirRecetaSchema } } },
    },
    responses: {
      200: okResponse("Receta definida", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const varianteId = c.req.query("varianteId") ?? null
    const body = await c.req.json()
    const parsed = DefinirRecetaSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new DefinirRecetaUseCase(makeRecetaRepo(), makeInsumoRepo()).execute({
        productoId: c.req.param("productoId"),
        varianteId,
        tenantId,
        lineas: parsed.data.lineas,
      })
      return c.json(result)
    } catch (err) {
      if (err instanceof InsumoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

// DELETE /productos/:productoId/receta
recetaRouter.openapi(
  createRoute({
    method: "delete",
    path: "/productos/{productoId}/receta",
    operationId: "almacen_eliminar_receta",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: { params: z.object({ productoId: z.string() }) },
    responses: {
      204: { description: "Receta eliminada" },
      ...errorResponses,
    },
  }),
  async (c) => {
    const varianteId = c.req.query("varianteId") ?? null
    await new EliminarRecetaUseCase(makeRecetaRepo()).execute(c.req.param("productoId"), varianteId)
    return c.body(null, 204)
  },
)

// POST /consumo
recetaRouter.openapi(
  createRoute({
    method: "post",
    path: "/consumo",
    operationId: "almacen_registrar_consumo",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: { body: { content: { "application/json": { schema: ConsumirProductoSchema } } } },
    responses: {
      201: createdResponse("Consumo registrado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = ConsumirProductoSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new RegistrarConsumoUseCase(
        makeRecetaRepo(),
        new SalidaAlmacenPrismaRepository(db),
        makeInsumoRepo(),
        getAlmacenNotificador()
      ).execute({
        tenantId,
        productoId: parsed.data.productoId,
        varianteId: parsed.data.varianteId,
        cantidad: parsed.data.cantidad,
        motivo: parsed.data.motivo,
        forzar: parsed.data.forzar,
        createdById: session.user.id,
        tenantMemberId: session.user.id,
      })
      return c.json(result, 201)
    } catch (err) {
      if (err instanceof InsumoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof StockInsuficienteError) return c.json({ error: err.code, message: err.message }, 422)
      throw err
    }
  },
)
