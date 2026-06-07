import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { InventarioProductoPrismaRepository } from "../infrastructure/inventario-producto.prisma.repository.js"
import { AutoInicializarStockUseCase } from "../application/inventario/auto-inicializar-stock.usecase.js"
import { ObtenerStockUseCase } from "../application/inventario/obtener-stock.usecase.js"
import { ListarAjustesUseCase } from "../application/inventario/listar-ajustes.usecase.js"
import { ListarMovimientosVarianteUseCase } from "../application/inventario/listar-movimientos-variante.usecase.js"
import { ListarRecuentosUseCase } from "../application/inventario/listar-recuentos.usecase.js"
import { CrearAjusteUseCase } from "../application/inventario/crear-ajuste.usecase.js"
import { ObtenerAjusteUseCase } from "../application/inventario/obtener-ajuste.usecase.js"
import { ActualizarAjusteUseCase } from "../application/inventario/actualizar-ajuste.usecase.js"
import { AprobarAjusteUseCase } from "../application/inventario/aprobar-ajuste.usecase.js"
import { CrearRecuentoUseCase } from "../application/inventario/crear-recuento.usecase.js"
import { ObtenerRecuentoUseCase } from "../application/inventario/obtener-recuento.usecase.js"
import { ActualizarRecuentoUseCase } from "../application/inventario/actualizar-recuento.usecase.js"
import { AprobarRecuentoUseCase } from "../application/inventario/aprobar-recuento.usecase.js"
import {
  CrearAjusteSchema,
  ActualizarAjusteSchema,
  AprobarDocumentoSchema,
  CrearRecuentoSchema,
  ActualizarRecuentoSchema,
  QueryParamsInventarioSchema,
  QueryParamsMovimientosSchema,
} from "./almacen.schema.js"
import {
  VarianteNoEncontradaError,
  VarianteNoInicializadaError,
  DetalleVacioError,
  StockNegativoError,
  ConflictoVersionError,
  DocumentoYaAprobadoError,
  DocumentoNoEncontradoError,
} from "../domain/almacen.errors.js"
import { getAlmacenNotificador } from "../infrastructure/almacen.notificador.provider.js"
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"

export const inventarioRouter = new OpenAPIHono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() {
  return new InventarioProductoPrismaRepository(db)
}

// GET /variantes/:varianteId/stock
inventarioRouter.openapi(
  createRoute({
    method: "get",
    path: "/variantes/{varianteId}/stock",
    operationId: "almacen_obtener_stock_variante",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ varianteId: z.string() }) },
    responses: {
      200: okResponse("Stock de variante", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    try {
      const result = await new ObtenerStockUseCase(makeRepo()).execute(
        c.req.param("varianteId"),
        tenantId
      )
      return c.json(result)
    } catch (err) {
      if (err instanceof VarianteNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

// GET /variantes/:varianteId/movimientos
inventarioRouter.openapi(
  createRoute({
    method: "get",
    path: "/variantes/{varianteId}/movimientos",
    operationId: "almacen_listar_movimientos_variante",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ varianteId: z.string() }) },
    responses: {
      200: okResponse("Movimientos de variante", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const params = QueryParamsMovimientosSchema.parse(c.req.query())
    const result = await new ListarMovimientosVarianteUseCase(makeRepo()).execute(
      c.req.param("varianteId"),
      tenantId,
      params
    )
    return c.json(result)
  },
)

// POST /inventario/inicializar
inventarioRouter.openapi(
  createRoute({
    method: "post",
    path: "/inicializar",
    operationId: "almacen_inicializar_stock",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO"]),
    responses: {
      202: okResponse("Stock inicializado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const result = await new AutoInicializarStockUseCase(makeRepo()).execute(tenantId, session.user.id)
    return c.json(result, 202)
  },
)

// ─── Ajustes ─────────────────────────────────────────────────────────────────

// GET /ajustes
inventarioRouter.openapi(
  createRoute({
    method: "get",
    path: "/ajustes",
    operationId: "almacen_listar_ajustes_inventario",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de ajustes de inventario", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const params = QueryParamsInventarioSchema.parse(c.req.query())
    const result = await new ListarAjustesUseCase(makeRepo()).execute(tenantId, params)
    return c.json(result)
  },
)

// POST /ajustes
inventarioRouter.openapi(
  createRoute({
    method: "post",
    path: "/ajustes",
    operationId: "almacen_crear_ajuste_inventario",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: { body: { content: { "application/json": { schema: CrearAjusteSchema } } } },
    responses: {
      201: createdResponse("Ajuste de inventario creado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = CrearAjusteSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new CrearAjusteUseCase(makeRepo()).execute({
        tenantId,
        motivo: parsed.data.motivo,
        detalles: parsed.data.detalles,
        createdById: session.user.id,
      })
      return c.json(result, 201)
    } catch (err) {
      if (err instanceof DetalleVacioError) return c.json({ error: err.code, message: err.message }, 400)
      if (err instanceof VarianteNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

// GET /ajustes/:ajusteId
inventarioRouter.openapi(
  createRoute({
    method: "get",
    path: "/ajustes/{ajusteId}",
    operationId: "almacen_obtener_ajuste_inventario",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ ajusteId: z.string() }) },
    responses: {
      200: okResponse("Ajuste de inventario", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    try {
      const result = await new ObtenerAjusteUseCase(makeRepo()).execute(c.req.param("ajusteId"), tenantId)
      return c.json(result)
    } catch (err) {
      if (err instanceof DocumentoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

// PATCH /ajustes/:ajusteId
inventarioRouter.openapi(
  createRoute({
    method: "patch",
    path: "/ajustes/{ajusteId}",
    operationId: "almacen_actualizar_ajuste_inventario",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: {
      params: z.object({ ajusteId: z.string() }),
      body: { content: { "application/json": { schema: ActualizarAjusteSchema } } },
    },
    responses: {
      200: okResponse("Ajuste de inventario actualizado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = ActualizarAjusteSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new ActualizarAjusteUseCase(makeRepo()).execute(
        c.req.param("ajusteId"),
        tenantId,
        { ...parsed.data, updatedById: session.user.id }
      )
      return c.json(result)
    } catch (err) {
      if (err instanceof DocumentoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof DocumentoYaAprobadoError) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

// POST /ajustes/:ajusteId/aprobar
inventarioRouter.openapi(
  createRoute({
    method: "post",
    path: "/ajustes/{ajusteId}/aprobar",
    operationId: "almacen_aprobar_ajuste_inventario",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: {
      params: z.object({ ajusteId: z.string() }),
      body: { content: { "application/json": { schema: AprobarDocumentoSchema } } },
    },
    responses: {
      200: okResponse("Ajuste de inventario aprobado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = AprobarDocumentoSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new AprobarAjusteUseCase(makeRepo(), getAlmacenNotificador()).execute({
        ajusteId: c.req.param("ajusteId"),
        tenantId,
        version: parsed.data.version,
        aprobadoPorId: session.user.id,
      })
      return c.json(result)
    } catch (err) {
      if (err instanceof DocumentoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof DocumentoYaAprobadoError) return c.json({ error: err.code, message: err.message }, 409)
      if (err instanceof ConflictoVersionError) return c.json({ error: err.code, message: err.message }, 409)
      if (err instanceof StockNegativoError)
        return c.json({ error: err.code, message: err.message, productoId: err.productoId, varianteId: err.varianteId, stockResultante: err.stockResultante }, 422)
      throw err
    }
  },
)

// ─── Recuentos ───────────────────────────────────────────────────────────────

// GET /recuentos
inventarioRouter.openapi(
  createRoute({
    method: "get",
    path: "/recuentos",
    operationId: "almacen_listar_recuentos_inventario",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de recuentos de inventario", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const params = QueryParamsInventarioSchema.parse(c.req.query())
    const result = await new ListarRecuentosUseCase(makeRepo()).execute(tenantId, params)
    return c.json(result)
  },
)

// POST /recuentos
inventarioRouter.openapi(
  createRoute({
    method: "post",
    path: "/recuentos",
    operationId: "almacen_crear_recuento_inventario",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: { body: { content: { "application/json": { schema: CrearRecuentoSchema } } } },
    responses: {
      201: createdResponse("Recuento de inventario creado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = CrearRecuentoSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new CrearRecuentoUseCase(makeRepo()).execute({
        tenantId,
        observacion: parsed.data.observacion,
        detalles: parsed.data.detalles,
        createdById: session.user.id,
      })
      return c.json(result, 201)
    } catch (err) {
      if (err instanceof DetalleVacioError) return c.json({ error: err.code, message: err.message }, 400)
      if (err instanceof VarianteNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof VarianteNoInicializadaError) return c.json({ error: err.code, message: err.message }, 422)
      throw err
    }
  },
)

// GET /recuentos/:recuentoId
inventarioRouter.openapi(
  createRoute({
    method: "get",
    path: "/recuentos/{recuentoId}",
    operationId: "almacen_obtener_recuento_inventario",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ recuentoId: z.string() }) },
    responses: {
      200: okResponse("Recuento de inventario", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    try {
      const result = await new ObtenerRecuentoUseCase(makeRepo()).execute(c.req.param("recuentoId"), tenantId)
      return c.json(result)
    } catch (err) {
      if (err instanceof DocumentoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

// PATCH /recuentos/:recuentoId
inventarioRouter.openapi(
  createRoute({
    method: "patch",
    path: "/recuentos/{recuentoId}",
    operationId: "almacen_actualizar_recuento_inventario",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: {
      params: z.object({ recuentoId: z.string() }),
      body: { content: { "application/json": { schema: ActualizarRecuentoSchema } } },
    },
    responses: {
      200: okResponse("Recuento de inventario actualizado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = ActualizarRecuentoSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new ActualizarRecuentoUseCase(makeRepo()).execute(
        c.req.param("recuentoId"),
        tenantId,
        { ...parsed.data, updatedById: session.user.id }
      )
      return c.json(result)
    } catch (err) {
      if (err instanceof DocumentoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof DocumentoYaAprobadoError) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

// POST /recuentos/:recuentoId/aprobar
inventarioRouter.openapi(
  createRoute({
    method: "post",
    path: "/recuentos/{recuentoId}/aprobar",
    operationId: "almacen_aprobar_recuento_inventario",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: {
      params: z.object({ recuentoId: z.string() }),
      body: { content: { "application/json": { schema: AprobarDocumentoSchema } } },
    },
    responses: {
      200: okResponse("Recuento de inventario aprobado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = AprobarDocumentoSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new AprobarRecuentoUseCase(makeRepo(), getAlmacenNotificador()).execute({
        recuentoId: c.req.param("recuentoId"),
        tenantId,
        version: parsed.data.version,
        aprobadoPorId: session.user.id,
      })
      return c.json(result)
    } catch (err) {
      if (err instanceof DocumentoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof DocumentoYaAprobadoError) return c.json({ error: err.code, message: err.message }, 409)
      if (err instanceof ConflictoVersionError) return c.json({ error: err.code, message: err.message }, 409)
      if (err instanceof StockNegativoError)
        return c.json({ error: err.code, message: err.message, productoId: err.productoId, varianteId: err.varianteId, stockResultante: err.stockResultante }, 422)
      throw err
    }
  },
)
