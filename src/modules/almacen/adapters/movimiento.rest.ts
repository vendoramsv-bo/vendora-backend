import { OpenAPIHono, createRoute } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { errorResponses, okResponse, paginadoSchema } from "../../../core/openapi-responses.js"
import { MovimientoTenantPrismaRepository } from "../infrastructure/movimiento-tenant.prisma.repository.js"
import { ListarMovimientosTenantUseCase } from "../application/movimiento/listar-movimientos-tenant.usecase.js"
import { FiltroInvalidoError } from "../domain/almacen.errors.js"
import { QueryParamsMovimientosTenantSchema, MovimientoTenantSchema } from "./almacen.schema.js"

export const movimientoRouter = new OpenAPIHono<HonoEnv>()

function makeRepo() {
  return new MovimientoTenantPrismaRepository(prisma)
}

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
