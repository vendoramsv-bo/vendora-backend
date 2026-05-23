import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { IngresoAlmacenPrismaRepository } from "../infrastructure/ingreso-almacen.prisma.repository.js"
import { SalidaAlmacenPrismaRepository } from "../infrastructure/salida-almacen.prisma.repository.js"
import { RecuentoAlmacenPrismaRepository } from "../infrastructure/recuento-almacen.prisma.repository.js"
import { InsumosPrismaRepository } from "../infrastructure/insumo.prisma.repository.js"
import { CrearIngresoUseCase } from "../application/almacen/crear-ingreso.usecase.js"
import { ListarIngresosUseCase } from "../application/almacen/listar-ingresos.usecase.js"
import { CrearSalidaUseCase } from "../application/almacen/crear-salida.usecase.js"
import { ListarSalidasUseCase } from "../application/almacen/listar-salidas.usecase.js"
import { RegistrarRecuentoAlmacenUseCase } from "../application/almacen/registrar-recuento-almacen.usecase.js"
import { ListarRecuentosAlmacenUseCase } from "../application/almacen/listar-recuentos-almacen.usecase.js"
import {
  CrearIngresoSchema,
  CrearSalidaSchema,
  RecuentoAlmacenSchema,
  QueryParamsAlmacenSchema,
} from "./almacen.schema.js"
import {
  InsumoNoEncontradoError,
  ProveedorNoEncontradoError,
  DetalleVacioError,
  StockInsuficienteError,
} from "../domain/almacen.errors.js"
import { getAlmacenNotificador } from "../infrastructure/almacen.notificador.provider.js"

export const almacenOperacionesRouter = new Hono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

// GET /almacen/ingresos
almacenOperacionesRouter.get("/ingresos", async (c) => {
  const tenantId = c.get("tenantId")
  const params = QueryParamsAlmacenSchema.parse(c.req.query())
  const result = await new ListarIngresosUseCase(new IngresoAlmacenPrismaRepository(db)).execute(tenantId, params)
  return c.json(result)
})

// POST /almacen/ingresos
almacenOperacionesRouter.post("/ingresos", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = CrearIngresoSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const result = await new CrearIngresoUseCase(
      new IngresoAlmacenPrismaRepository(db),
      new InsumosPrismaRepository(db),
      db,
      getAlmacenNotificador()
    ).execute({
      tenantId,
      proveedorId: parsed.data.proveedorId,
      descripcion: parsed.data.descripcion,
      detalles: parsed.data.detalles.map((d) => ({
        ...d,
        fechaVencimiento: d.fechaVencimiento ? new Date(d.fechaVencimiento) : undefined,
      })),
      createdById: session.user.id,
      tenantMemberId: session.user.id,
    })
    return c.json(result, 201)
  } catch (err) {
    if (err instanceof DetalleVacioError) return c.json({ error: err.code, message: err.message }, 400)
    if (err instanceof ProveedorNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof InsumoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

// GET /almacen/salidas
almacenOperacionesRouter.get("/salidas", async (c) => {
  const tenantId = c.get("tenantId")
  const params = QueryParamsAlmacenSchema.parse(c.req.query())
  const result = await new ListarSalidasUseCase(new SalidaAlmacenPrismaRepository(db)).execute(tenantId, params)
  return c.json(result)
})

// POST /almacen/salidas
almacenOperacionesRouter.post("/salidas", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = CrearSalidaSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const result = await new CrearSalidaUseCase(
      new SalidaAlmacenPrismaRepository(db),
      new InsumosPrismaRepository(db),
      getAlmacenNotificador()
    ).execute({
      tenantId,
      descripcion: parsed.data.descripcion,
      detalles: parsed.data.detalles,
      forzar: parsed.data.forzar,
      createdById: session.user.id,
      tenantMemberId: session.user.id,
    })
    return c.json(result, 201)
  } catch (err) {
    if (err instanceof DetalleVacioError) return c.json({ error: err.code, message: err.message }, 400)
    if (err instanceof InsumoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof StockInsuficienteError) return c.json({ error: err.code, message: err.message }, 422)
    throw err
  }
})

// GET /almacen/recuentos
almacenOperacionesRouter.get("/recuentos", async (c) => {
  const tenantId = c.get("tenantId")
  const params = QueryParamsAlmacenSchema.parse(c.req.query())
  const result = await new ListarRecuentosAlmacenUseCase(new RecuentoAlmacenPrismaRepository(db)).execute(tenantId, params)
  return c.json(result)
})

// POST /almacen/recuentos
almacenOperacionesRouter.post("/recuentos", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = RecuentoAlmacenSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const result = await new RegistrarRecuentoAlmacenUseCase(
      new RecuentoAlmacenPrismaRepository(db),
      new InsumosPrismaRepository(db),
      getAlmacenNotificador()
    ).execute({
      tenantId,
      observacion: parsed.data.observacion,
      detalles: parsed.data.detalles,
      createdById: session.user.id,
      tenantMemberId: session.user.id,
    })
    return c.json(result, 201)
  } catch (err) {
    if (err instanceof DetalleVacioError) return c.json({ error: err.code, message: err.message }, 400)
    if (err instanceof InsumoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})
