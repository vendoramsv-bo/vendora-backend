import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { PedidoPrismaRepository } from "../infrastructure/pedido.prisma.repository.js"
import { getAlmacenInventarioPort } from "../../almacen/infrastructure/almacen-inventario.port.provider.js"
import { CrearPedidoUseCase } from "../application/pedido/crear-pedido.usecase.js"
import { ActualizarEstadoPedidoUseCase } from "../application/pedido/actualizar-estado-pedido.usecase.js"
import { ConvertirPedidoEnVentaUseCase } from "../application/pedido/convertir-pedido-en-venta.usecase.js"
import { ObtenerPedidoUseCase } from "../application/pedido/obtener-pedido.usecase.js"
import { ListarPedidosUseCase } from "../application/pedido/listar-pedidos.usecase.js"
import {
  CrearPedidoSchema,
  ActualizarEstadoPedidoSchema,
  ConvertirPedidoEnVentaSchema,
  QueryParamsPedidoSchema,
} from "./ventas.schema.js"
import {
  PedidoNoEncontradoError,
  PedidoTerminalError,
} from "../domain/ventas.errors.js"
import { getVentasNotificador } from "../infrastructure/ventas.notificador.provider.js"
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"

export const pedidoRouter = new OpenAPIHono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() { return new PedidoPrismaRepository(db) }

pedidoRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    operationId: "ventas_listar_pedidos",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de pedidos", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const params = QueryParamsPedidoSchema.parse(c.req.query())
    const result = await new ListarPedidosUseCase(makeRepo()).execute(tenantId, params, {
      estado: c.req.query("estado"),
      userId: c.req.query("userId"),
    })
    return c.json(result)
  },
)

pedidoRouter.openapi(
  createRoute({
    method: "get",
    path: "/{id}",
    operationId: "ventas_obtener_pedido",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: okResponse("Pedido", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    try {
      const result = await new ObtenerPedidoUseCase(makeRepo()).execute(c.req.param("id"), tenantId)
      return c.json(result)
    } catch (err) {
      if (err instanceof PedidoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

pedidoRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    operationId: "ventas_crear_pedido",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    responses: {
      201: createdResponse("Pedido creado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = CrearPedidoSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    const result = await new CrearPedidoUseCase(makeRepo(), getVentasNotificador()).execute({
      tenantId,
      userId: session.user.id,
      detalles: parsed.data.detalles,
      respuesta: parsed.data.respuesta,
      createdById: session.user.id,
    })
    return c.json(result, 201)
  },
)

pedidoRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{id}/estado",
    operationId: "ventas_actualizar_estado_pedido",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN", "EMPLEADO"]),
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: okResponse("Estado actualizado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = ActualizarEstadoPedidoSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new ActualizarEstadoPedidoUseCase(makeRepo(), getVentasNotificador()).execute({
        id: c.req.param("id"),
        tenantId,
        estado: parsed.data.estado,
        respuesta: parsed.data.respuesta,
        updatedById: session.user.id,
      })
      return c.json(result)
    } catch (err) {
      if (err instanceof PedidoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof PedidoTerminalError) return c.json({ error: err.code, message: err.message }, 422)
      throw err
    }
  },
)

pedidoRouter.openapi(
  createRoute({
    method: "post",
    path: "/{id}/convertir-en-venta",
    operationId: "ventas_convertir_pedido_en_venta",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN", "EMPLEADO"]),
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: okResponse("Pedido convertido en venta", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = ConvertirPedidoEnVentaSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new ConvertirPedidoEnVentaUseCase(makeRepo(), getVentasNotificador(), getAlmacenInventarioPort() ?? undefined).execute({
        pedidoId: c.req.param("id"),
        tenantId,
        aperturaCierreCajaId: parsed.data.aperturaCierreCajaId,
        puntoVentaId: parsed.data.puntoVentaId,
        turnoId: parsed.data.turnoId,
        tenantMemberId: c.get("miembro").id,
        tipoPago: parsed.data.tipoPago,
        estadoPago: parsed.data.estadoPago,
        efectivo: parsed.data.efectivo,
        updatedById: session.user.id,
      })
      return c.json(result)
    } catch (err) {
      if (err instanceof PedidoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof PedidoTerminalError) return c.json({ error: err.code, message: err.message }, 422)
      throw err
    }
  },
)
