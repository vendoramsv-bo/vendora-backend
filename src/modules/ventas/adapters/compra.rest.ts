import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol, ROLES_ABASTECIMIENTO } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { CompraPrismaRepository } from "../infrastructure/compra.prisma.repository.js"
import { ProveedorPrismaRepository } from "../infrastructure/proveedor.prisma.repository.js"
import { CrearCompraUseCase } from "../application/compra/crear-compra.usecase.js"
import { ObtenerCompraUseCase } from "../application/compra/obtener-compra.usecase.js"
import { ActualizarCompraUseCase } from "../application/compra/actualizar-compra.usecase.js"
import { EliminarCompraUseCase } from "../application/compra/eliminar-compra.usecase.js"
import { ListarComprasUseCase } from "../application/compra/listar-compras.usecase.js"
import { ConfirmarCompraUseCase } from "../application/compra/confirmar-compra.usecase.js"
import {
  CrearCompraSchema,
  ActualizarCompraSchema,
  CompraDetalleSchema,
  ActualizarDetalleSchema,
  CompraCostoSchema,
  ActualizarCostoSchema,
  QueryParamsCompraSchema,
} from "./ventas.schema.js"
import {
  CompraNoEncontradaError,
  CompraYaConfirmadaError,
  DetalleVacioError,
  DetalleYaExisteError,
  CostoMotivoYaExisteError,
  ProveedorNoEncontradoError,
} from "../domain/ventas.errors.js"
import { getVentasNotificador } from "../infrastructure/ventas.notificador.provider.js"
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"

export const compraRouter = new OpenAPIHono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() {
  return new CompraPrismaRepository(db)
}

function makeProveedorRepo() {
  return new ProveedorPrismaRepository(db)
}

// GET /compras
compraRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    operationId: "ventas_listar_compras",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de compras", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const params = QueryParamsCompraSchema.parse(c.req.query())
    const estado = c.req.query("estado")
    const proveedorId = c.req.query("proveedorId")
    const result = await new ListarComprasUseCase(makeRepo()).execute(tenantId, params, estado, proveedorId)
    return c.json(result)
  },
)

// POST /compras
compraRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    operationId: "ventas_crear_compra",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_ABASTECIMIENTO),
    request: {
      body: {
        content: {
          "application/json": { schema: CrearCompraSchema },
        },
      },
    },
    responses: {
      201: createdResponse("Compra creada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = CrearCompraSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new CrearCompraUseCase(makeRepo(), makeProveedorRepo(), getVentasNotificador()).execute({
        tenantId,
        proveedorId: parsed.data.proveedorId,
        fecha: parsed.data.fecha ? new Date(parsed.data.fecha) : undefined,
        descripcion: parsed.data.descripcion,
        detalles: parsed.data.detalles,
        costosAdicionales: parsed.data.costosAdicionales,
        createdById: session.user.id,
      })
      return c.json(result, 201)
    } catch (err) {
      if (err instanceof DetalleVacioError) return c.json({ error: err.code, message: err.message }, 400)
      if (err instanceof ProveedorNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

// GET /compras/:id
compraRouter.openapi(
  createRoute({
    method: "get",
    path: "/{id}",
    operationId: "ventas_obtener_compra",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      200: okResponse("Compra encontrada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    try {
      const result = await new ObtenerCompraUseCase(makeRepo()).execute(c.req.param("id"), tenantId)
      return c.json(result)
    } catch (err) {
      if (err instanceof CompraNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

// PATCH /compras/:id
compraRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{id}",
    operationId: "ventas_actualizar_compra",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_ABASTECIMIENTO),
    request: {
      params: z.object({ id: z.string() }),
      body: {
        content: {
          "application/json": { schema: ActualizarCompraSchema },
        },
      },
    },
    responses: {
      200: okResponse("Compra actualizada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = ActualizarCompraSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new ActualizarCompraUseCase(makeRepo(), getVentasNotificador()).execute({
        id: c.req.param("id"),
        tenantId,
        proveedorId: parsed.data.proveedorId,
        fecha: parsed.data.fecha ? new Date(parsed.data.fecha) : undefined,
        descripcion: parsed.data.descripcion,
        updatedById: session.user.id,
      })
      return c.json(result)
    } catch (err) {
      if (err instanceof CompraNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof CompraYaConfirmadaError) return c.json({ error: err.code, message: err.message }, 422)
      throw err
    }
  },
)

// DELETE /compras/:id
compraRouter.openapi(
  createRoute({
    method: "delete",
    path: "/{id}",
    operationId: "ventas_eliminar_compra",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_ABASTECIMIENTO),
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      204: { description: "Compra eliminada" },
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    try {
      await new EliminarCompraUseCase(makeRepo()).execute(c.req.param("id"), tenantId)
      return c.body(null, 204)
    } catch (err) {
      if (err instanceof CompraNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof CompraYaConfirmadaError) return c.json({ error: err.code, message: err.message }, 422)
      throw err
    }
  },
)

// POST /compras/:id/detalles
compraRouter.openapi(
  createRoute({
    method: "post",
    path: "/{id}/detalles",
    operationId: "ventas_agregar_detalle_compra",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_ABASTECIMIENTO),
    request: {
      params: z.object({ id: z.string() }),
      body: {
        content: {
          "application/json": { schema: CompraDetalleSchema },
        },
      },
    },
    responses: {
      201: createdResponse("Detalle de compra agregado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const body = await c.req.json()
    const parsed = CompraDetalleSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await makeRepo().agregarDetalle(c.req.param("id"), tenantId, parsed.data)
      return c.json(result, 201)
    } catch (err) {
      if (err instanceof CompraNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof CompraYaConfirmadaError) return c.json({ error: err.code, message: err.message }, 422)
      if (err instanceof DetalleYaExisteError) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

// PATCH /compras/:id/detalles/:detalleId
compraRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{id}/detalles/{detalleId}",
    operationId: "ventas_actualizar_detalle_compra",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_ABASTECIMIENTO),
    request: {
      params: z.object({ id: z.string(), detalleId: z.string() }),
      body: {
        content: {
          "application/json": { schema: ActualizarDetalleSchema },
        },
      },
    },
    responses: {
      200: okResponse("Detalle de compra actualizado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const body = await c.req.json()
    const parsed = ActualizarDetalleSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await makeRepo().actualizarDetalle(
        c.req.param("id"),
        c.req.param("detalleId"),
        tenantId,
        parsed.data,
      )
      return c.json(result)
    } catch (err) {
      if (err instanceof CompraNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof CompraYaConfirmadaError) return c.json({ error: err.code, message: err.message }, 422)
      throw err
    }
  },
)

// DELETE /compras/:id/detalles/:detalleId
compraRouter.openapi(
  createRoute({
    method: "delete",
    path: "/{id}/detalles/{detalleId}",
    operationId: "ventas_eliminar_detalle_compra",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_ABASTECIMIENTO),
    request: {
      params: z.object({ id: z.string(), detalleId: z.string() }),
    },
    responses: {
      204: { description: "Detalle de compra eliminado" },
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    try {
      await makeRepo().eliminarDetalle(c.req.param("id"), c.req.param("detalleId"), tenantId)
      return c.body(null, 204)
    } catch (err) {
      if (err instanceof CompraNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof CompraYaConfirmadaError) return c.json({ error: err.code, message: err.message }, 422)
      throw err
    }
  },
)

// POST /compras/:id/costos
compraRouter.openapi(
  createRoute({
    method: "post",
    path: "/{id}/costos",
    operationId: "ventas_agregar_costo_compra",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_ABASTECIMIENTO),
    request: {
      params: z.object({ id: z.string() }),
      body: {
        content: {
          "application/json": { schema: CompraCostoSchema },
        },
      },
    },
    responses: {
      201: createdResponse("Costo de compra agregado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const body = await c.req.json()
    const parsed = CompraCostoSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await makeRepo().agregarCosto(c.req.param("id"), tenantId, parsed.data)
      return c.json(result, 201)
    } catch (err) {
      if (err instanceof CompraNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof CompraYaConfirmadaError) return c.json({ error: err.code, message: err.message }, 422)
      if (err instanceof CostoMotivoYaExisteError) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

// PATCH /compras/:id/costos/:costoId
compraRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{id}/costos/{costoId}",
    operationId: "ventas_actualizar_costo_compra",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_ABASTECIMIENTO),
    request: {
      params: z.object({ id: z.string(), costoId: z.string() }),
      body: {
        content: {
          "application/json": { schema: ActualizarCostoSchema },
        },
      },
    },
    responses: {
      200: okResponse("Costo de compra actualizado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const body = await c.req.json()
    const parsed = ActualizarCostoSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await makeRepo().actualizarCosto(
        c.req.param("id"),
        c.req.param("costoId"),
        tenantId,
        parsed.data.costo,
      )
      return c.json(result)
    } catch (err) {
      if (err instanceof CompraNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof CompraYaConfirmadaError) return c.json({ error: err.code, message: err.message }, 422)
      throw err
    }
  },
)

// DELETE /compras/:id/costos/:costoId
compraRouter.openapi(
  createRoute({
    method: "delete",
    path: "/{id}/costos/{costoId}",
    operationId: "ventas_eliminar_costo_compra",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_ABASTECIMIENTO),
    request: {
      params: z.object({ id: z.string(), costoId: z.string() }),
    },
    responses: {
      204: { description: "Costo de compra eliminado" },
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    try {
      await makeRepo().eliminarCosto(c.req.param("id"), c.req.param("costoId"), tenantId)
      return c.body(null, 204)
    } catch (err) {
      if (err instanceof CompraNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof CompraYaConfirmadaError) return c.json({ error: err.code, message: err.message }, 422)
      throw err
    }
  },
)

// POST /compras/:id/confirmar
compraRouter.openapi(
  createRoute({
    method: "post",
    path: "/{id}/confirmar",
    operationId: "ventas_confirmar_compra",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_ABASTECIMIENTO),
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      200: okResponse("Compra confirmada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    try {
      const result = await new ConfirmarCompraUseCase(makeRepo(), getVentasNotificador()).execute({
        id: c.req.param("id"),
        tenantId,
        updatedById: session.user.id,
      })
      return c.json(result)
    } catch (err) {
      if (err instanceof CompraNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof CompraYaConfirmadaError) return c.json({ error: err.code, message: err.message }, 422)
      throw err
    }
  },
)
