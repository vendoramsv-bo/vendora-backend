import { Hono } from "hono"
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

export const cocinaRouter = new Hono<HonoEnv>()

cocinaRouter.get("/cocina", requireRol(["PROPIETARIO", "ADMIN", "ENCARGADO", "CHEF", "MESERO"]), async (c) => {
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
})

cocinaRouter.patch(
  "/cocina/items/:detalleId/estado",
  requireRol(["PROPIETARIO", "ADMIN", "ENCARGADO", "CHEF", "MESERO"]),
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
