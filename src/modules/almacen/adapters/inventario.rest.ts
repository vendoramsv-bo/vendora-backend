import { Hono } from "hono"
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

export const inventarioRouter = new Hono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() {
  return new InventarioProductoPrismaRepository(db)
}

// GET /variantes/:varianteId/stock
inventarioRouter.get("/variantes/:varianteId/stock", async (c) => {
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
})

// GET /variantes/:varianteId/movimientos
inventarioRouter.get("/variantes/:varianteId/movimientos", async (c) => {
  const tenantId = c.get("tenantId")
  const params = QueryParamsMovimientosSchema.parse(c.req.query())
  const result = await new ListarMovimientosVarianteUseCase(makeRepo()).execute(
    c.req.param("varianteId"),
    tenantId,
    params
  )
  return c.json(result)
})

// POST /inventario/inicializar
inventarioRouter.post("/inicializar", requireRol(["PROPIETARIO"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const result = await new AutoInicializarStockUseCase(makeRepo()).execute(tenantId, session.user.id)
  return c.json(result, 202)
})

// ─── Ajustes ─────────────────────────────────────────────────────────────────

// GET /ajustes
inventarioRouter.get("/ajustes", async (c) => {
  const tenantId = c.get("tenantId")
  const params = QueryParamsInventarioSchema.parse(c.req.query())
  const result = await new ListarAjustesUseCase(makeRepo()).execute(tenantId, params)
  return c.json(result)
})

// POST /ajustes
inventarioRouter.post("/ajustes", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
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
})

// GET /ajustes/:ajusteId
inventarioRouter.get("/ajustes/:ajusteId", async (c) => {
  const tenantId = c.get("tenantId")
  try {
    const result = await new ObtenerAjusteUseCase(makeRepo()).execute(c.req.param("ajusteId"), tenantId)
    return c.json(result)
  } catch (err) {
    if (err instanceof DocumentoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

// PATCH /ajustes/:ajusteId
inventarioRouter.patch("/ajustes/:ajusteId", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
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
})

// POST /ajustes/:ajusteId/aprobar
inventarioRouter.post("/ajustes/:ajusteId/aprobar", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
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
})

// ─── Recuentos ───────────────────────────────────────────────────────────────

// GET /recuentos
inventarioRouter.get("/recuentos", async (c) => {
  const tenantId = c.get("tenantId")
  const params = QueryParamsInventarioSchema.parse(c.req.query())
  const result = await new ListarRecuentosUseCase(makeRepo()).execute(tenantId, params)
  return c.json(result)
})

// POST /recuentos
inventarioRouter.post("/recuentos", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
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
})

// GET /recuentos/:recuentoId
inventarioRouter.get("/recuentos/:recuentoId", async (c) => {
  const tenantId = c.get("tenantId")
  try {
    const result = await new ObtenerRecuentoUseCase(makeRepo()).execute(c.req.param("recuentoId"), tenantId)
    return c.json(result)
  } catch (err) {
    if (err instanceof DocumentoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

// PATCH /recuentos/:recuentoId
inventarioRouter.patch("/recuentos/:recuentoId", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
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
})

// POST /recuentos/:recuentoId/aprobar
inventarioRouter.post("/recuentos/:recuentoId/aprobar", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
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
})
