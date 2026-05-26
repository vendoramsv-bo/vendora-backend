import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { prismaBase } from "../../../core/prisma-scoped.js"
import { ReservaPrismaRepository } from "../infrastructure/reserva.prisma.repository.js"
import { MenuItemPrismaRepository } from "../infrastructure/menu-item.prisma.repository.js"
import { CrearReservaPublicaUseCase } from "../application/reserva/crear-reserva-publica.usecase.js"
import { ListarReservasClienteUseCase } from "../application/reserva/listar-reservas-cliente.usecase.js"
import { getRestauranteNotificador } from "../infrastructure/restaurante.notificador.provider.js"
import { ReservaPublicaCreateSchema } from "./restaurante.schema.js"
import { ItemNoDisponible } from "../domain/restaurante.errors.js"

export const reservaPublicaRouter = new Hono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prismaBase as any

async function resolverRestaurantePorSlug(slug: string): Promise<{ restauranteId: string; tenantId: string } | null> {
  const tenant = await db.tenant.findUnique({ where: { slug }, select: { id: true } })
  if (!tenant) return null
  const restaurante = await db.restaurante.findUnique({
    where: { tenantId: tenant.id },
    select: { id: true },
  })
  if (!restaurante) return null
  return { restauranteId: restaurante.id, tenantId: tenant.id }
}

reservaPublicaRouter.post("/:slug/reservas", async (c) => {
  const slug = c.req.param("slug")
  const body = await c.req.json()
  const parsed = ReservaPublicaCreateSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

  const ctx = await resolverRestaurantePorSlug(slug)
  if (!ctx) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)

  // Look up registered client by email (optional)
  let clienteId: string | null = null
  if (parsed.data.clienteEmail) {
    const cliente = await db.cliente.findFirst({
      where: { email: parsed.data.clienteEmail },
      select: { id: true },
    })
    clienteId = cliente?.id ?? null
  }

  try {
    const reserva = await new CrearReservaPublicaUseCase(
      new ReservaPrismaRepository(),
      new MenuItemPrismaRepository(),
      getRestauranteNotificador(),
    ).ejecutar({
      restauranteId: ctx.restauranteId,
      tenantId: ctx.tenantId,
      menuId: parsed.data.menuId ?? null,
      clienteNombre: parsed.data.clienteNombre,
      clienteTelefono: parsed.data.clienteTelefono ?? null,
      clienteEmail: parsed.data.clienteEmail ?? null,
      clienteId,
      fechaLlegada: new Date(parsed.data.fechaLlegada),
      numeroComensales: parsed.data.numeroComensales,
      observaciones: parsed.data.observaciones ?? null,
      canalOrigen: parsed.data.canalOrigen ?? "WEB",
      items: parsed.data.items.map((i) => ({
        menuItemId: i.menuItemId,
        cantidad: i.cantidad,
        observacion: i.observacion ?? null,
      })),
    })
    return c.json({ codigo: reserva.codigo, estado: reserva.estado, fechaLlegada: reserva.fechaLlegada }, 201)
  } catch (err) {
    if (err instanceof ItemNoDisponible) return c.json({ error: err.code, message: err.message }, 422)
    throw err
  }
})

reservaPublicaRouter.get("/:slug/mis-reservas", async (c) => {
  const slug = c.req.param("slug")
  const email = c.req.query("email")
  const codigo = c.req.query("codigo")

  if (!email) return c.json({ error: "VALIDACION", message: "Se requiere el parámetro email" }, 400)

  const ctx = await resolverRestaurantePorSlug(slug)
  if (!ctx) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)

  const reservas = await new ListarReservasClienteUseCase(new ReservaPrismaRepository()).ejecutar(
    ctx.restauranteId,
    email,
    codigo,
  )
  return c.json({ data: reservas.map((r) => r.toJSON()), meta: { total: reservas.length } })
})
