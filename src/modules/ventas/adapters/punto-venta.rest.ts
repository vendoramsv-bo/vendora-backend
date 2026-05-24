import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { PuntoVentaPrismaRepository } from "../infrastructure/punto-venta.prisma.repository.js"
import { CrearPuntoVentaUseCase } from "../application/puntoVenta/crear-punto-venta.usecase.js"
import { ActualizarPuntoVentaUseCase } from "../application/puntoVenta/actualizar-punto-venta.usecase.js"
import { CambiarEstadoPuntoVentaUseCase } from "../application/puntoVenta/cambiar-estado-punto-venta.usecase.js"
import { ListarPuntosVentaUseCase } from "../application/puntoVenta/listar-puntos-venta.usecase.js"
import {
  CrearPuntoVentaSchema,
  ActualizarPuntoVentaSchema,
  CambiarEstadoSchema,
  QueryParamsPuntoVentaSchema,
} from "./ventas.schema.js"
import {
  PuntoVentaNoEncontradoError,
  PuntoVentaNombreDuplicadoError,
} from "../domain/ventas.errors.js"

export const puntoVentaRouter = new Hono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() {
  return new PuntoVentaPrismaRepository(db)
}

// GET /puntos-venta
puntoVentaRouter.get("/", async (c) => {
  const tenantId = c.get("tenantId")
  const params = QueryParamsPuntoVentaSchema.parse(c.req.query())
  const result = await new ListarPuntosVentaUseCase(makeRepo()).execute(tenantId, params)
  return c.json(result)
})

// POST /puntos-venta
puntoVentaRouter.post("/", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = CrearPuntoVentaSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const result = await new CrearPuntoVentaUseCase(makeRepo()).execute({
      tenantId,
      nombre: parsed.data.nombre,
      tipo: parsed.data.tipo,
      direccion: parsed.data.direccion,
      telefono: parsed.data.telefono,
      sucursal: parsed.data.sucursal,
      createdById: session.user.id,
    })
    return c.json(result, 201)
  } catch (err) {
    if (err instanceof PuntoVentaNombreDuplicadoError) return c.json({ error: err.code, message: err.message }, 409)
    throw err
  }
})

// PATCH /puntos-venta/:id
puntoVentaRouter.patch("/:id", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = ActualizarPuntoVentaSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const result = await new ActualizarPuntoVentaUseCase(makeRepo()).execute({
      id: c.req.param("id"),
      tenantId,
      nombre: parsed.data.nombre,
      tipo: parsed.data.tipo,
      direccion: parsed.data.direccion,
      telefono: parsed.data.telefono,
      sucursal: parsed.data.sucursal,
      updatedById: session.user.id,
    })
    return c.json(result)
  } catch (err) {
    if (err instanceof PuntoVentaNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof PuntoVentaNombreDuplicadoError) return c.json({ error: err.code, message: err.message }, 409)
    throw err
  }
})

// PATCH /puntos-venta/:id/estado
puntoVentaRouter.patch("/:id/estado", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = CambiarEstadoSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const result = await new CambiarEstadoPuntoVentaUseCase(makeRepo()).execute({
      id: c.req.param("id"),
      tenantId,
      estado: parsed.data.estado,
      updatedById: session.user.id,
    })
    return c.json(result)
  } catch (err) {
    if (err instanceof PuntoVentaNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})
