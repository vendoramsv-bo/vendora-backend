import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { CajaPrismaRepository } from "../infrastructure/caja.prisma.repository.js"
import { PuntoVentaPrismaRepository } from "../infrastructure/punto-venta.prisma.repository.js"
import { TurnoAtencionPrismaRepository } from "../infrastructure/turno-atencion.prisma.repository.js"
import { AbrirCajaUseCase } from "../application/caja/abrir-caja.usecase.js"
import { CerrarCajaUseCase } from "../application/caja/cerrar-caja.usecase.js"
import { RegistrarIngresoCajaUseCase } from "../application/caja/registrar-ingreso-caja.usecase.js"
import { RegistrarEgresoCajaUseCase } from "../application/caja/registrar-egreso-caja.usecase.js"
import { ObtenerCajaUseCase } from "../application/caja/obtener-caja.usecase.js"
import { ListarCajasUseCase } from "../application/caja/listar-cajas.usecase.js"
import {
  AbrirCajaSchema,
  CerrarCajaSchema,
  RegistrarIngresoCajaSchema,
  RegistrarEgresoCajaSchema,
  QueryParamsCajaSchema,
} from "./ventas.schema.js"
import {
  CajaNoEncontradaError,
  CajaYaAbiertaError,
  CajaYaCerradaError,
  PuntoVentaInactivoError,
  TurnoInactivoError,
} from "../domain/ventas.errors.js"
import { getVentasNotificador } from "../infrastructure/ventas.notificador.provider.js"

export const cajaRouter = new Hono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() { return new CajaPrismaRepository(db) }
function makePuntoVentaRepo() { return new PuntoVentaPrismaRepository(db) }
function makeTurnoRepo() { return new TurnoAtencionPrismaRepository(db) }

// GET /cajas
cajaRouter.get("/", async (c) => {
  const tenantId = c.get("tenantId")
  const params = QueryParamsCajaSchema.parse(c.req.query())
  const estadoCaja = c.req.query("estadoCaja")
  const puntoVentaId = c.req.query("puntoVentaId")
  const result = await new ListarCajasUseCase(makeRepo()).execute(tenantId, params, estadoCaja, puntoVentaId)
  return c.json(result)
})

// GET /cajas/:id
cajaRouter.get("/:id", async (c) => {
  const tenantId = c.get("tenantId")
  try {
    const result = await new ObtenerCajaUseCase(makeRepo()).execute(c.req.param("id"), tenantId)
    return c.json(result)
  } catch (err) {
    if (err instanceof CajaNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

// POST /cajas/abrir
cajaRouter.post("/abrir", async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = AbrirCajaSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const result = await new AbrirCajaUseCase(
      makeRepo(),
      makePuntoVentaRepo(),
      makeTurnoRepo(),
      getVentasNotificador(),
    ).execute({
      tenantId,
      puntoVentaId: parsed.data.puntoVentaId,
      turnoId: parsed.data.turnoId,
      tenantMemberId: session.user.id,
      montoInicial: parsed.data.montoInicial,
      createdById: session.user.id,
    })
    return c.json(result, 201)
  } catch (err) {
    if (err instanceof CajaYaAbiertaError) return c.json({ error: err.code, message: err.message }, 409)
    if (err instanceof PuntoVentaInactivoError) return c.json({ error: err.code, message: err.message }, 422)
    if (err instanceof TurnoInactivoError) return c.json({ error: err.code, message: err.message }, 422)
    throw err
  }
})

// POST /cajas/:id/cerrar
cajaRouter.post("/:id/cerrar", async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = CerrarCajaSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const result = await new CerrarCajaUseCase(makeRepo(), getVentasNotificador()).execute({
      id: c.req.param("id"),
      tenantId,
      montoArqueoCaja: parsed.data.montoArqueoCaja,
      updatedById: session.user.id,
    })
    return c.json(result)
  } catch (err) {
    if (err instanceof CajaNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof CajaYaCerradaError) return c.json({ error: err.code, message: err.message }, 422)
    throw err
  }
})

// POST /cajas/:id/ingresos
cajaRouter.post("/:id/ingresos", async (c) => {
  const tenantId = c.get("tenantId")
  const body = await c.req.json()
  const parsed = RegistrarIngresoCajaSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const result = await new RegistrarIngresoCajaUseCase(makeRepo()).execute({
      cajaId: c.req.param("id"),
      tenantId,
      motivo: parsed.data.motivo,
      montoIngreso: parsed.data.montoIngreso,
    })
    return c.json(result, 201)
  } catch (err) {
    if (err instanceof CajaNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof CajaYaCerradaError) return c.json({ error: err.code, message: err.message }, 422)
    throw err
  }
})

// POST /cajas/:id/egresos
cajaRouter.post("/:id/egresos", async (c) => {
  const tenantId = c.get("tenantId")
  const body = await c.req.json()
  const parsed = RegistrarEgresoCajaSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const result = await new RegistrarEgresoCajaUseCase(makeRepo()).execute({
      cajaId: c.req.param("id"),
      tenantId,
      motivo: parsed.data.motivo,
      montoEgreso: parsed.data.montoEgreso,
    })
    return c.json(result, 201)
  } catch (err) {
    if (err instanceof CajaNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof CajaYaCerradaError) return c.json({ error: err.code, message: err.message }, 422)
    throw err
  }
})
