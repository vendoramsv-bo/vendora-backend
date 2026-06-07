import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { ReservaPrismaRepository } from "../infrastructure/reserva.prisma.repository.js"
import { ReservaDetallePrismaRepository } from "../infrastructure/reserva-detalle.prisma.repository.js"
import { ListarPanelCocinaUseCase } from "../application/cocina/listar-panel-cocina.usecase.js"
import { ActualizarEstadoCocinaUseCase } from "../application/cocina/actualizar-estado-cocina.usecase.js"
import { getRestauranteNotificador } from "../infrastructure/restaurante.notificador.provider.js"
import { EstadoCocinaSchema } from "./restaurante.schema.js"
import {
  ReservaNoEncontrada,
  TransicionCocinaInvalida,
  RolSinPermiso,
} from "../domain/restaurante.errors.js"
import { resolverRestauranteId } from "./restaurante.rest.js"
import { errorResponses, okResponse } from "../../../core/openapi-responses.js"

export const cocinaRouter = new OpenAPIHono<HonoEnv>()

cocinaRouter.openapi(
  createRoute({
    method: "get",
    path: "/cocina",
    operationId: "restaurante_panel_cocina",
    tags: ["Restaurante"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN", "ENCARGADO", "CHEF", "MESERO"]),
    responses: {
      200: okResponse("Panel de cocina", z.object({ data: z.array(z.record(z.string(), z.unknown())), meta: z.object({ total: z.number() }) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const restauranteId = await resolverRestauranteId(tenantId)
    if (!restauranteId) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)

    const panel = await new ListarPanelCocinaUseCase(new ReservaPrismaRepository()).ejecutar(restauranteId)
    return c.json({
      data: panel.map(({ reserva, detalles }) => ({
        ...reserva.toJSON(),
        detalles: detalles.map((d) => d.toJSON()),
      })),
      meta: { total: panel.length },
    })
  },
)

cocinaRouter.openapi(
  createRoute({
    method: "patch",
    path: "/cocina/items/{detalleId}/estado",
    operationId: "restaurante_actualizar_estado_cocina",
    tags: ["Restaurante"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN", "ENCARGADO", "CHEF", "MESERO"]),
    request: { params: z.object({ detalleId: z.string() }) },
    responses: {
      200: okResponse("Estado cocina actualizado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = EstadoCocinaSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

    const restauranteId = await resolverRestauranteId(tenantId)
    if (!restauranteId) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)

    try {
      const detalle = await new ActualizarEstadoCocinaUseCase(
        new ReservaPrismaRepository(),
        new ReservaDetallePrismaRepository(),
        getRestauranteNotificador(),
      ).ejecutar(
        c.req.param("detalleId"),
        parsed.data.estadoCocina,
        session.user.id,
        session.session.activeOrganizationRole ?? "MESERO",
        tenantId,
      )
      return c.json(detalle.toJSON())
    } catch (err) {
      if (err instanceof ReservaNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof TransicionCocinaInvalida) return c.json({ error: err.code, message: err.message }, 422)
      if (err instanceof RolSinPermiso) return c.json({ error: err.code, message: err.message }, 403)
      throw err
    }
  },
)
