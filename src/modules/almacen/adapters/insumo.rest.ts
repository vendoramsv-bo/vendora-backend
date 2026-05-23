import { Hono } from "hono"
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

export const insumoRouter = new Hono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() {
  return new InsumosPrismaRepository(db)
}

function makeRecetaRepo() {
  return new RecetaProductoPrismaRepository(db)
}

// GET /insumos
insumoRouter.get("/", async (c) => {
  const tenantId = c.get("tenantId")
  const rawParams = QueryParamsInsumoSchema.parse(c.req.query())
  const stockCritico = c.req.query("stockCritico") === "true"
  const result = await new ListarInsumosUseCase(makeRepo()).execute(tenantId, rawParams, stockCritico)
  return c.json(result)
})

// POST /insumos
insumoRouter.post("/", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
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
})

// GET /insumos/:id
insumoRouter.get("/:id", async (c) => {
  const tenantId = c.get("tenantId")
  try {
    const result = await new ObtenerInsumoUseCase(makeRepo()).execute(c.req.param("id"), tenantId)
    return c.json(result)
  } catch (err) {
    if (err instanceof InsumoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

// PATCH /insumos/:id
insumoRouter.patch("/:id", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
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
})

// PATCH /insumos/:id/estado
insumoRouter.patch("/:id/estado", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
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
})

// DELETE /insumos/:id
insumoRouter.delete("/:id", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
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
})

// GET /insumos/:id/movimientos
insumoRouter.get("/:id/movimientos", async (c) => {
  const tenantId = c.get("tenantId")
  const params = QueryParamsMovimientosSchema.parse(c.req.query())
  const result = await new ListarMovimientosInsumoUseCase(makeRepo()).execute(
    c.req.param("id"),
    tenantId,
    params
  )
  return c.json(result)
})

// POST /insumos/:id/ajuste
insumoRouter.post("/:id/ajuste", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
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
})
