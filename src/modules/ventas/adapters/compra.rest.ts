import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
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

export const compraRouter = new Hono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() {
  return new CompraPrismaRepository(db)
}

function makeProveedorRepo() {
  return new ProveedorPrismaRepository(db)
}

// GET /compras
compraRouter.get("/", async (c) => {
  const tenantId = c.get("tenantId")
  const params = QueryParamsCompraSchema.parse(c.req.query())
  const estado = c.req.query("estado")
  const proveedorId = c.req.query("proveedorId")
  const result = await new ListarComprasUseCase(makeRepo()).execute(tenantId, params, estado, proveedorId)
  return c.json(result)
})

// POST /compras
compraRouter.post("/", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
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
})

// GET /compras/:id
compraRouter.get("/:id", async (c) => {
  const tenantId = c.get("tenantId")
  try {
    const result = await new ObtenerCompraUseCase(makeRepo()).execute(c.req.param("id"), tenantId)
    return c.json(result)
  } catch (err) {
    if (err instanceof CompraNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

// PATCH /compras/:id
compraRouter.patch("/:id", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
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
})

// DELETE /compras/:id
compraRouter.delete("/:id", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  try {
    await new EliminarCompraUseCase(makeRepo()).execute(c.req.param("id"), tenantId)
    return c.body(null, 204)
  } catch (err) {
    if (err instanceof CompraNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof CompraYaConfirmadaError) return c.json({ error: err.code, message: err.message }, 422)
    throw err
  }
})

// POST /compras/:id/detalles
compraRouter.post("/:id/detalles", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
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
})

// PATCH /compras/:id/detalles/:detalleId
compraRouter.patch("/:id/detalles/:detalleId", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
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
})

// DELETE /compras/:id/detalles/:detalleId
compraRouter.delete("/:id/detalles/:detalleId", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  try {
    await makeRepo().eliminarDetalle(c.req.param("id"), c.req.param("detalleId"), tenantId)
    return c.body(null, 204)
  } catch (err) {
    if (err instanceof CompraNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof CompraYaConfirmadaError) return c.json({ error: err.code, message: err.message }, 422)
    throw err
  }
})

// POST /compras/:id/costos
compraRouter.post("/:id/costos", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
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
})

// PATCH /compras/:id/costos/:costoId
compraRouter.patch("/:id/costos/:costoId", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
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
})

// DELETE /compras/:id/costos/:costoId
compraRouter.delete("/:id/costos/:costoId", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  try {
    await makeRepo().eliminarCosto(c.req.param("id"), c.req.param("costoId"), tenantId)
    return c.body(null, 204)
  } catch (err) {
    if (err instanceof CompraNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof CompraYaConfirmadaError) return c.json({ error: err.code, message: err.message }, 422)
    throw err
  }
})

// POST /compras/:id/confirmar
compraRouter.post("/:id/confirmar", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
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
})
