import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { PedidoPrismaRepository } from "../infrastructure/pedido.prisma.repository.js"
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

export const pedidoRouter = new Hono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() { return new PedidoPrismaRepository(db) }

// GET /pedidos
pedidoRouter.get("/", async (c) => {
  const tenantId = c.get("tenantId")
  const params = QueryParamsPedidoSchema.parse(c.req.query())
  const result = await new ListarPedidosUseCase(makeRepo()).execute(tenantId, params, {
    estado: c.req.query("estado"),
    userId: c.req.query("userId"),
  })
  return c.json(result)
})

// GET /pedidos/:id
pedidoRouter.get("/:id", async (c) => {
  const tenantId = c.get("tenantId")
  try {
    const result = await new ObtenerPedidoUseCase(makeRepo()).execute(c.req.param("id"), tenantId)
    return c.json(result)
  } catch (err) {
    if (err instanceof PedidoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

// POST /pedidos (any authenticated user / member can create)
pedidoRouter.post("/", async (c) => {
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
})

// PATCH /pedidos/:id/estado (staff only)
pedidoRouter.patch("/:id/estado", requireRol(["PROPIETARIO", "ADMIN", "EMPLEADO"]), async (c) => {
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
})

// POST /pedidos/:id/convertir-en-venta (staff only)
pedidoRouter.post("/:id/convertir-en-venta", requireRol(["PROPIETARIO", "ADMIN", "EMPLEADO"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = ConvertirPedidoEnVentaSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const result = await new ConvertirPedidoEnVentaUseCase(makeRepo(), getVentasNotificador()).execute({
      pedidoId: c.req.param("id"),
      tenantId,
      aperturaCierreCajaId: parsed.data.aperturaCierreCajaId,
      puntoVentaId: parsed.data.puntoVentaId,
      turnoId: parsed.data.turnoId,
      tenantMemberId: session.user.id,
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
})
