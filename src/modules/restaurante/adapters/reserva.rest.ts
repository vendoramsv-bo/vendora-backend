import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { ReservaPrismaRepository } from "../infrastructure/reserva.prisma.repository.js"
import { ListarReservasUseCase } from "../application/reserva/listar-reservas.usecase.js"
import { ObtenerReservaUseCase } from "../application/reserva/obtener-reserva.usecase.js"
import { CambiarEstadoReservaUseCase } from "../application/reserva/cambiar-estado-reserva.usecase.js"
import { PagarReservaUseCase } from "../application/reserva/pagar-reserva.usecase.js"
import { VentaRestauranteService } from "../infrastructure/venta.restaurante.service.js"
import { getRestauranteNotificador } from "../infrastructure/restaurante.notificador.provider.js"
import { ReservaEstadoSchema, PagarReservaSchema } from "./restaurante.schema.js"
import {
  ReservaNoEncontrada,
  TransicionReservaInvalida,
  ReservaYaPagada,
  CajaNoAbierta,
  RolSinPermiso,
} from "../domain/restaurante.errors.js"
import { resolverRestauranteId } from "./restaurante.rest.js"

export const reservaRouter = new Hono<HonoEnv>()

function makeRepo() {
  return new ReservaPrismaRepository()
}

reservaRouter.get("/reservas", async (c) => {
  const tenantId = c.get("tenantId")
  const restauranteId = await resolverRestauranteId(tenantId)
  if (!restauranteId) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)

  const q = c.req.query()
  const reservas = await new ListarReservasUseCase(makeRepo()).ejecutar(restauranteId, {
    estado: q.estado,
    fecha: q.fecha ? new Date(q.fecha) : undefined,
    search: q.search,
    page: q.page ? Number(q.page) : undefined,
    limit: q.limit ? Number(q.limit) : undefined,
  })
  return c.json({ data: reservas.map((r) => r.toJSON()), meta: { total: reservas.length } })
})

reservaRouter.get("/reservas/:id", async (c) => {
  const tenantId = c.get("tenantId")
  const restauranteId = await resolverRestauranteId(tenantId)
  if (!restauranteId) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)

  try {
    const { reserva, detalles } = await new ObtenerReservaUseCase(makeRepo()).ejecutar(c.req.param("id"), restauranteId)
    return c.json({ ...reserva.toJSON(), detalles: detalles.map((d) => d.toJSON()) })
  } catch (err) {
    if (err instanceof ReservaNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

reservaRouter.patch(
  "/reservas/:id/estado",
  requireRol(["PROPIETARIO", "ADMIN", "ENCARGADO", "MESERO"]),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = ReservaEstadoSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

    const restauranteId = await resolverRestauranteId(tenantId)
    if (!restauranteId) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)

    try {
      const reserva = await new CambiarEstadoReservaUseCase(makeRepo(), getRestauranteNotificador()).ejecutar(
        c.req.param("id"),
        restauranteId,
        tenantId,
        parsed.data.estado,
        session.user.id,
        session.session.activeOrganizationRole ?? "MESERO",
        { numeroMesa: parsed.data.numeroMesa, nota: parsed.data.nota },
      )
      return c.json(reserva.toJSON())
    } catch (err) {
      if (err instanceof ReservaNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof TransicionReservaInvalida) return c.json({ error: err.code, message: err.message }, 422)
      if (err instanceof RolSinPermiso) return c.json({ error: err.code, message: err.message }, 403)
      throw err
    }
  },
)

reservaRouter.post(
  "/reservas/:id/pagar",
  requireRol(["PROPIETARIO", "ADMIN", "ENCARGADO", "MESERO"]),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = PagarReservaSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

    const restauranteId = await resolverRestauranteId(tenantId)
    if (!restauranteId) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)

    try {
      const reserva = await new PagarReservaUseCase(
        makeRepo(),
        new VentaRestauranteService(),
        getRestauranteNotificador(),
      ).ejecutar(
        c.req.param("id"),
        restauranteId,
        tenantId,
        session.user.id,
        parsed.data.cajaId,
        parsed.data.cajeroId,
      )
      return c.json(reserva.toJSON())
    } catch (err) {
      if (err instanceof ReservaNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof ReservaYaPagada) return c.json({ error: err.code, message: err.message }, 409)
      if (err instanceof CajaNoAbierta) return c.json({ error: err.code, message: err.message }, 422)
      throw err
    }
  },
)
