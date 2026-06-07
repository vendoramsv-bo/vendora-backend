import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { InsumosPrismaRepository } from "../infrastructure/insumo.prisma.repository.js"
import { RecetaProductoPrismaRepository } from "../infrastructure/receta-producto.prisma.repository.js"
import { CrearInsumoUseCase } from "../application/insumo/crear-insumo.usecase.js"
import { ListarInsumosUseCase } from "../application/insumo/listar-insumos.usecase.js"
import { ObtenerInsumoUseCase } from "../application/insumo/obtener-insumo.usecase.js"
import { ActualizarInsumoUseCase } from "../application/insumo/actualizar-insumo.usecase.js"
import { CambiarEstadoInsumoUseCase } from "../application/insumo/cambiar-estado-insumo.usecase.js"
import { EliminarInsumoUseCase } from "../application/insumo/eliminar-insumo.usecase.js"
import { RegistrarAjusteInsumoUseCase } from "../application/insumo/registrar-ajuste-insumo.usecase.js"
import { ListarMovimientosInsumoUseCase } from "../application/insumo/listar-movimientos-insumo.usecase.js"
import {
  CrearInsumoSchema,
  ActualizarInsumoSchema,
  CambiarEstadoInsumoSchema,
  AjusteInsumoSchema,
  QueryParamsInsumoSchema,
  QueryParamsMovimientosSchema,
} from "./almacen.schema.js"
import {
  InsumoNoEncontradoError,
  InsumoNombreDuplicadoError,
  InsumoEnUsoEnRecetaError,
  MotivoRequeridoError,
} from "../domain/almacen.errors.js"
import { getAlmacenNotificador } from "../infrastructure/almacen.notificador.provider.js"
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"

export const insumoRouter = new OpenAPIHono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() {
  return new InsumosPrismaRepository(db)
}

function makeRecetaRepo() {
  return new RecetaProductoPrismaRepository(db)
}

// GET /insumos
insumoRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    operationId: "almacen_listar_insumos",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de insumos", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const rawParams = QueryParamsInsumoSchema.parse(c.req.query())
    const stockCritico = c.req.query("stockCritico") === "true"
    const result = await new ListarInsumosUseCase(makeRepo()).execute(tenantId, rawParams, stockCritico)
    return c.json(result)
  },
)

// POST /insumos
insumoRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    operationId: "almacen_crear_insumo",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: { body: { content: { "application/json": { schema: CrearInsumoSchema } } } },
    responses: {
      201: createdResponse("Insumo creado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = CrearInsumoSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new CrearInsumoUseCase(makeRepo()).execute({
        tenantId,
        nombre: parsed.data.nombre,
        unidadMedidaId: parsed.data.unidadMedidaId,
        stockMinimo: parsed.data.stockMinimo,
        costoUnitario: parsed.data.costoUnitario,
        fechaVencimiento: parsed.data.fechaVencimiento ? new Date(parsed.data.fechaVencimiento) : undefined,
        createdById: session.user.id,
      })
      return c.json(result, 201)
    } catch (err) {
      if (err instanceof InsumoNombreDuplicadoError) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

// GET /insumos/:id
insumoRouter.openapi(
  createRoute({
    method: "get",
    path: "/{id}",
    operationId: "almacen_obtener_insumo",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: okResponse("Insumo", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    try {
      const result = await new ObtenerInsumoUseCase(makeRepo()).execute(c.req.param("id"), tenantId)
      return c.json(result)
    } catch (err) {
      if (err instanceof InsumoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

// PATCH /insumos/:id
insumoRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{id}",
    operationId: "almacen_actualizar_insumo",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: {
      params: z.object({ id: z.string() }),
      body: { content: { "application/json": { schema: ActualizarInsumoSchema } } },
    },
    responses: {
      200: okResponse("Insumo actualizado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = ActualizarInsumoSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new ActualizarInsumoUseCase(makeRepo()).execute({
        id: c.req.param("id"),
        tenantId,
        ...parsed.data,
        fechaVencimiento: parsed.data.fechaVencimiento !== undefined
          ? (parsed.data.fechaVencimiento ? new Date(parsed.data.fechaVencimiento) : null)
          : undefined,
        updatedById: session.user.id,
      })
      return c.json(result)
    } catch (err) {
      if (err instanceof InsumoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof InsumoNombreDuplicadoError) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

// PATCH /insumos/:id/estado
insumoRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{id}/estado",
    operationId: "almacen_cambiar_estado_insumo",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: {
      params: z.object({ id: z.string() }),
      body: { content: { "application/json": { schema: CambiarEstadoInsumoSchema } } },
    },
    responses: {
      200: okResponse("Estado de insumo actualizado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = CambiarEstadoInsumoSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new CambiarEstadoInsumoUseCase(makeRepo(), makeRecetaRepo()).execute(
        c.req.param("id"),
        tenantId,
        parsed.data.estado,
        session.user.id
      )
      return c.json(result)
    } catch (err) {
      if (err instanceof InsumoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof InsumoEnUsoEnRecetaError)
        return c.json({ error: err.code, message: err.message, productoIds: err.productoIds }, 422)
      throw err
    }
  },
)

// DELETE /insumos/:id
insumoRouter.openapi(
  createRoute({
    method: "delete",
    path: "/{id}",
    operationId: "almacen_eliminar_insumo",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: { params: z.object({ id: z.string() }) },
    responses: {
      204: { description: "Insumo eliminado" },
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    try {
      await new EliminarInsumoUseCase(makeRepo(), makeRecetaRepo()).execute(c.req.param("id"), tenantId)
      return c.body(null, 204)
    } catch (err) {
      if (err instanceof InsumoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof InsumoEnUsoEnRecetaError)
        return c.json({ error: err.code, message: err.message, productoIds: err.productoIds }, 422)
      throw err
    }
  },
)

// GET /insumos/:id/movimientos
insumoRouter.openapi(
  createRoute({
    method: "get",
    path: "/{id}/movimientos",
    operationId: "almacen_listar_movimientos_insumo",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: okResponse("Movimientos del insumo", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const params = QueryParamsMovimientosSchema.parse(c.req.query())
    const result = await new ListarMovimientosInsumoUseCase(makeRepo()).execute(
      c.req.param("id"),
      tenantId,
      params
    )
    return c.json(result)
  },
)

// POST /insumos/:id/ajuste
insumoRouter.openapi(
  createRoute({
    method: "post",
    path: "/{id}/ajuste",
    operationId: "almacen_registrar_ajuste_insumo",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: {
      params: z.object({ id: z.string() }),
      body: { content: { "application/json": { schema: AjusteInsumoSchema } } },
    },
    responses: {
      201: createdResponse("Ajuste de insumo registrado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = AjusteInsumoSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new RegistrarAjusteInsumoUseCase(makeRepo(), getAlmacenNotificador()).execute({
        insumoId: c.req.param("id"),
        tenantId,
        cantidadAjuste: parsed.data.cantidadAjuste,
        motivo: parsed.data.motivo,
        createdById: session.user.id,
      })
      return c.json(result, 201)
    } catch (err) {
      if (err instanceof InsumoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof MotivoRequeridoError) return c.json({ error: err.code, message: err.message }, 400)
      throw err
    }
  },
)
