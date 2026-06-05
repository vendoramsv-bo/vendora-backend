import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { VentaPrismaRepository } from "../infrastructure/venta.prisma.repository.js"
import { CajaPrismaRepository } from "../infrastructure/caja.prisma.repository.js"
import { ReportePrismaRepository } from "../infrastructure/reporte.prisma.repository.js"
import { CrearVentaUseCase } from "../application/venta/crear-venta.usecase.js"
import { getAlmacenInventarioPort } from "../../almacen/infrastructure/almacen-inventario.port.provider.js"
import { ConfirmarVentaUseCase } from "../application/venta/confirmar-venta.usecase.js"
import { ObtenerVentaUseCase } from "../application/venta/obtener-venta.usecase.js"
import { ListarVentasUseCase } from "../application/venta/listar-ventas.usecase.js"
import { ReporteConsolidadoUseCase } from "../application/reporte/reporte-consolidado.usecase.js"
import {
  CrearVentaSchema,
  QueryParamsVentaSchema,
  QueryParamsReporteSchema,
} from "./ventas.schema.js"
import {
  VentaNoEncontradaError,
  VentaYaConfirmadaError,
  CajaNoEncontradaError,
  CajaYaCerradaError,
} from "../domain/ventas.errors.js"
import { getVentasNotificador } from "../infrastructure/ventas.notificador.provider.js"

export const ventaRouter = new Hono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() { return new VentaPrismaRepository(db) }
function makeCajaRepo() { return new CajaPrismaRepository(db) }
function makeReporteRepo() { return new ReportePrismaRepository(db) }

// GET /ventas/reporte-consolidado (before /:id to avoid route conflict)
ventaRouter.get("/reporte-consolidado", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  const params = QueryParamsReporteSchema.parse(c.req.query())
  const fechaDesde = c.req.query("fechaDesde") ? new Date(c.req.query("fechaDesde")!) : undefined
  const fechaHasta = c.req.query("fechaHasta") ? new Date(c.req.query("fechaHasta")!) : undefined
  const fuente = c.req.query("fuente") as "VENTA" | "CONSULTORIO" | undefined
  const result = await new ReporteConsolidadoUseCase(makeReporteRepo()).execute({
    tenantId,
    filtros: { fechaDesde, fechaHasta, fuente, puntoVentaId: c.req.query("puntoVentaId") },
    params,
  })
  return c.json(result)
})

// GET /ventas
ventaRouter.get("/", async (c) => {
  const tenantId = c.get("tenantId")
  const params = QueryParamsVentaSchema.parse(c.req.query())
  const result = await new ListarVentasUseCase(makeRepo()).execute(tenantId, params, {
    estadoPago: c.req.query("estadoPago"),
    tipoPago: c.req.query("tipoPago"),
    puntoVentaId: c.req.query("puntoVentaId"),
    turnoId: c.req.query("turnoId"),
    clienteId: c.req.query("clienteId"),
  })
  return c.json(result)
})

// GET /ventas/:id
ventaRouter.get("/:id", async (c) => {
  const tenantId = c.get("tenantId")
  try {
    const result = await new ObtenerVentaUseCase(makeRepo()).execute(c.req.param("id"), tenantId)
    return c.json(result)
  } catch (err) {
    if (err instanceof VentaNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

// POST /ventas
ventaRouter.post("/", async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = CrearVentaSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const result = await new CrearVentaUseCase(makeRepo(), makeCajaRepo(), getVentasNotificador(), getAlmacenInventarioPort() ?? undefined).execute({
      tenantId,
      puntoVentaId: parsed.data.puntoVentaId,
      turnoId: parsed.data.turnoId,
      tenantMemberId: session.user.id,
      aperturaCierreCajaId: parsed.data.aperturaCierreCajaId,
      clienteId: parsed.data.clienteId,
      clienteNombre: parsed.data.clienteNombre,
      clienteTipoDocumento: parsed.data.clienteTipoDocumento,
      clienteNroDocumento: parsed.data.clienteNroDocumento,
      clienteEmail: parsed.data.clienteEmail,
      tipoPago: parsed.data.tipoPago,
      estadoPago: parsed.data.estadoPago,
      efectivo: parsed.data.efectivo,
      referenciaTipo: parsed.data.referenciaTipo,
      referenciaId: parsed.data.referenciaId,
      detalles: parsed.data.detalles,
      createdById: session.user.id,
    })
    return c.json(result, 201)
  } catch (err) {
    if (err instanceof CajaNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof CajaYaCerradaError) return c.json({ error: err.code, message: err.message }, 422)
    throw err
  }
})

// POST /ventas/:id/confirmar
ventaRouter.post("/:id/confirmar", async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  try {
    const result = await new ConfirmarVentaUseCase(makeRepo()).execute({
      id: c.req.param("id"),
      tenantId,
      updatedById: session.user.id,
    })
    return c.json(result)
  } catch (err) {
    if (err instanceof VentaNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof VentaYaConfirmadaError) return c.json({ error: err.code, message: err.message }, 422)
    throw err
  }
})
