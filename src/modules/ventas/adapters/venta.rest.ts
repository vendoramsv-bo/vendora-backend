import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { resolverMiembroActivo } from "../../../core/hono-context.js"
import { whereDeAlcance } from "../../../core/alcance.js"
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
  QueryConsolidadoSchema,
} from "./ventas.schema.js"
import {
  VentaNoEncontradaError,
  VentaYaConfirmadaError,
  CajaNoEncontradaError,
  CajaYaCerradaError,
} from "../domain/ventas.errors.js"
import { getVentasNotificador } from "../infrastructure/ventas.notificador.provider.js"
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"

export const ventaRouter = new OpenAPIHono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() { return new VentaPrismaRepository(db) }
function makeCajaRepo() { return new CajaPrismaRepository(db) }
function makeReporteRepo() { return new ReportePrismaRepository(db) }

// Must be registered before /{id} to avoid route conflict
ventaRouter.openapi(
  createRoute({
    method: "get",
    path: "/reporte-consolidado",
    operationId: "ventas_reporte_consolidado",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    // El guard `requireRol(["PROPIETARIO","ADMIN"])` se fue de acá (023 R-06).
    // Era literalmente el defecto que la feature viene a arreglar: con él, todo
    // rol operativo recibía 403 y las cuatro tarjetas del panel quedaban en
    // error. Quitarlo **sin** aplicar el alcance sería el extremo opuesto —cada
    // vendedor viendo los números del negocio—, así que las dos cosas van
    // juntas y no se separan.
    middleware: resolverMiembroActivo,
    // Los query params se declaran para que salgan en el OpenAPI y el cliente
    // generado pueda enviarlos sin `@ts-expect-error` (023 R-07, T071/T072).
    request: { query: QueryConsolidadoSchema },
    responses: {
      200: okResponse("Reporte consolidado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const params = QueryParamsReporteSchema.parse(c.req.query())
    const fechaDesde = c.req.query("fechaDesde") ? new Date(c.req.query("fechaDesde")!) : undefined
    const fechaHasta = c.req.query("fechaHasta") ? new Date(c.req.query("fechaHasta")!) : undefined
    const fuente = c.req.query("fuente") as "VENTA" | "CONSULTORIO" | undefined
    const result = await new ReporteConsolidadoUseCase(makeReporteRepo()).execute({
      tenantId,
      filtros: {
        fechaDesde,
        fechaHasta,
        fuente,
        puntoVentaId: c.req.query("puntoVentaId"),
        // El alcance sale de la sesión. Lo que venga en el query string con
        // este nombre no se lee: se ignora en silencio, sin 400, porque un 400
        // revelaría que el parámetro existe.
        ...whereDeAlcance(c.get("alcance")),
      },
      params,
    })
    return c.json(result)
  },
)

ventaRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    operationId: "ventas_listar_ventas",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    middleware: resolverMiembroActivo,
    responses: {
      200: okResponse("Lista de ventas", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const params = QueryParamsVentaSchema.parse(c.req.query())
    const result = await new ListarVentasUseCase(makeRepo()).execute(tenantId, params, {
      estadoPago: c.req.query("estadoPago"),
      tipoPago: c.req.query("tipoPago"),
      puntoVentaId: c.req.query("puntoVentaId"),
      turnoId: c.req.query("turnoId"),
      clienteId: c.req.query("clienteId"),
      // El alcance se aplica **además** de los filtros de arriba, nunca en
      // lugar de (contracts §A.2). Este endpoint alimenta la actividad
      // reciente del panel y el listado completo, y FR-016 exige que los dos
      // cuenten lo mismo: coinciden porque son el mismo endpoint con el mismo
      // alcance.
      ...whereDeAlcance(c.get("alcance")),
    })
    return c.json(result)
  },
)

ventaRouter.openapi(
  createRoute({
    method: "get",
    path: "/{id}",
    operationId: "ventas_obtener_venta",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: okResponse("Venta", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    try {
      const result = await new ObtenerVentaUseCase(makeRepo()).execute(c.req.param("id"), tenantId)
      return c.json(result)
    } catch (err) {
      if (err instanceof VentaNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

ventaRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    operationId: "ventas_crear_venta",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    responses: {
      201: createdResponse("Venta creada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
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
        tenantMemberId: c.get("miembro").id,
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
  },
)

ventaRouter.openapi(
  createRoute({
    method: "post",
    path: "/{id}/confirmar",
    operationId: "ventas_confirmar_venta",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: okResponse("Venta confirmada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
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
  },
)
