import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { InventarioProductoPrismaRepository } from "../infrastructure/inventario-producto.prisma.repository.js"
import { InicializarVarianteUseCase } from "../application/inventario/inicializar-variante.usecase.js"
import { ObtenerStockUseCase } from "../application/inventario/obtener-stock.usecase.js"
import { RegistrarAjusteUseCase } from "../application/inventario/registrar-ajuste.usecase.js"
import { ListarAjustesUseCase } from "../application/inventario/listar-ajustes.usecase.js"
import { ListarMovimientosVarianteUseCase } from "../application/inventario/listar-movimientos-variante.usecase.js"
import { RegistrarRecuentoUseCase } from "../application/inventario/registrar-recuento.usecase.js"
import { ListarRecuentosUseCase } from "../application/inventario/listar-recuentos.usecase.js"
import {
  InicializarVarianteSchema,
  AjusteInventarioSchema,
  RecuentoInventarioSchema,
  QueryParamsInventarioSchema,
  QueryParamsMovimientosSchema,
} from "./almacen.schema.js"
import {
  VarianteNoEncontradaError,
  VarianteNoInicializadaError,
  VarianteYaInicializadaError,
  DetalleVacioError,
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

// POST /variantes/:varianteId/inicializar
inventarioRouter.post("/variantes/:varianteId/inicializar", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = InicializarVarianteSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const result = await new InicializarVarianteUseCase(makeRepo()).execute({
      varianteId: c.req.param("varianteId"),
      tenantId,
      stockInicial: parsed.data.stockInicial,
      stockMinimo: parsed.data.stockMinimo,
      createdById: session.user.id,
    })
    return c.json(result, 200)
  } catch (err) {
    if (err instanceof VarianteNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof VarianteYaInicializadaError) return c.json({ error: err.code, message: err.message }, 409)
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
  const parsed = AjusteInventarioSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const result = await new RegistrarAjusteUseCase(makeRepo(), getAlmacenNotificador()).execute({
      tenantId,
      motivo: parsed.data.motivo,
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
  const parsed = RecuentoInventarioSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const result = await new RegistrarRecuentoUseCase(makeRepo(), getAlmacenNotificador()).execute({
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
