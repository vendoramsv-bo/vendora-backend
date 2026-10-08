import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { errorResponses, okResponse, paginadoSchema } from "../../../core/openapi-responses.js"
import { MovimientoTenantPrismaRepository } from "../infrastructure/movimiento-tenant.prisma.repository.js"
import { ListarMovimientosTenantUseCase } from "../application/movimiento/listar-movimientos-tenant.usecase.js"
import { MovimientoResumenPrismaRepository } from "../infrastructure/movimiento-resumen.prisma.repository.js"
import { ResumenMovimientosUseCase } from "../application/movimiento/resumen-movimientos.usecase.js"
import { FiltroInvalidoError, ProductoNoEncontradoError, VarianteNoEncontradaError } from "../domain/almacen.errors.js"
import { QueryParamsMovimientosTenantSchema, MovimientoTenantSchema } from "./almacen.schema.js"

export const movimientoRouter = new OpenAPIHono<HonoEnv>()

function makeRepo() {
  return new MovimientoTenantPrismaRepository(prisma)
}

const ResumenMovimientosSchema = z.object({
  entradas: z.number(),
  salidas: z.number(),
  stockActual: z.number(),
  variantes: z.array(z.object({ varianteId: z.string(), etiqueta: z.string(), stock: z.number() })),
})

// GET /movimientos/resumen — totales y stock de un producto (spec 032, B-03). Antes de
// cualquier ruta con parámetro que pudiera capturar "resumen".
movimientoRouter.openapi(
  createRoute({
    method: "get",
    path: "/resumen",
    operationId: "almacen_resumen_movimientos_producto",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    request: {
      query: z.object({
        productoId: z.string().min(1),
        varianteId: z.string().min(1).optional(),
      }),
    },
    responses: {
      200: okResponse("Resumen del historial de un producto", ResumenMovimientosSchema),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const { productoId, varianteId } = c.req.valid("query")
    try {
      const result = await new ResumenMovimientosUseCase(new MovimientoResumenPrismaRepository(prisma)).execute(
        tenantId,
        productoId,
        varianteId,
      )
      return c.json(result)
    } catch (err) {
      if (err instanceof ProductoNoEncontradoError || err instanceof VarianteNoEncontradaError) {
        return c.json({ error: err.code, message: err.message }, 404)
      }
      throw err
    }
  },
)

// GET /movimientos — insumos y variantes del tenant en un solo listado
movimientoRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    operationId: "almacen_listar_movimientos_tenant",
    tags: ["Almacén"],
    security: [{ bearerAuth: [] }],
    request: { query: QueryParamsMovimientosTenantSchema },
    responses: {
      200: okResponse("Movimientos de inventario del tenant", paginadoSchema(MovimientoTenantSchema)),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    try {
      const result = await new ListarMovimientosTenantUseCase(makeRepo()).execute(tenantId, c.req.valid("query"))
      return c.json(result)
    } catch (err) {
      if (err instanceof FiltroInvalidoError) return c.json({ error: err.code, message: err.message }, 400)
      throw err
    }
  },
)
