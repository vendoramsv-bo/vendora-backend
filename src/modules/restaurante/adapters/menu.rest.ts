import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { MenuPrismaRepository } from "../infrastructure/menu.prisma.repository.js"
import { MenuItemPrismaRepository } from "../infrastructure/menu-item.prisma.repository.js"
import { ListarMenusUseCase } from "../application/menu/listar-menus.usecase.js"
import { CrearMenuUseCase } from "../application/menu/crear-menu.usecase.js"
import { ObtenerMenuUseCase } from "../application/menu/obtener-menu.usecase.js"
import { ActualizarMenuUseCase } from "../application/menu/actualizar-menu.usecase.js"
import { CambiarEstadoMenuUseCase } from "../application/menu/cambiar-estado-menu.usecase.js"
import { MenuCreateSchema, MenuUpdateSchema, MenuEstadoSchema } from "./restaurante.schema.js"
import {
  MenuNoEncontrado,
  MenuNoEditable,
  MenuSinItemsDisponibles,
  TransicionMenuInvalida,
  FechaEnPasado,
} from "../domain/restaurante.errors.js"
import { resolverRestauranteId } from "./restaurante.rest.js"

export const menuRouter = new Hono<HonoEnv>()
export const publicMenuRouter = new Hono<HonoEnv>()

function makeMenuRepo() {
  return new MenuPrismaRepository()
}

function makeItemRepo() {
  return new MenuItemPrismaRepository()
}

// ─── Staff endpoints ──────────────────────────────────────────────────────────

menuRouter.get("/menus", async (c) => {
  const tenantId = c.get("tenantId")
  const restauranteId = await resolverRestauranteId(tenantId)
  if (!restauranteId) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)

  const q = c.req.query()
  const params = {
    estado: q.estado,
    tipo: q.tipo,
    fechaInicio: q.fechaInicio ? new Date(q.fechaInicio) : undefined,
    fechaFin: q.fechaFin ? new Date(q.fechaFin) : undefined,
    page: q.page ? Number(q.page) : undefined,
    limit: q.limit ? Number(q.limit) : undefined,
  }

  const menus = await new ListarMenusUseCase(makeMenuRepo()).ejecutar(restauranteId, params)
  return c.json({ data: menus.map((m) => m.toJSON()), meta: { total: menus.length } })
})

menuRouter.post("/menus", requireRol(["PROPIETARIO", "ADMIN", "ENCARGADO"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = MenuCreateSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

  const restauranteId = await resolverRestauranteId(tenantId)
  if (!restauranteId) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)

  try {
    const menu = await new CrearMenuUseCase(makeMenuRepo()).ejecutar(
      {
        restauranteId,
        nombre: parsed.data.nombre,
        tipo: parsed.data.tipo,
        fechaInicio: new Date(parsed.data.fechaInicio),
        fechaFin: new Date(parsed.data.fechaFin),
        descripcion: parsed.data.descripcion ?? null,
        tema: parsed.data.tema ?? null,
        creadoPorId: session.user.id,
      },
      session.user.id,
    )
    return c.json(menu.toJSON(), 201)
  } catch (err) {
    if (err instanceof FechaEnPasado) return c.json({ error: err.code, message: err.message }, 422)
    throw err
  }
})

menuRouter.get("/menus/:id", async (c) => {
  const tenantId = c.get("tenantId")
  const restauranteId = await resolverRestauranteId(tenantId)
  if (!restauranteId) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)

  try {
    const { menu, items } = await new ObtenerMenuUseCase(makeMenuRepo(), makeItemRepo()).ejecutar(
      c.req.param("id"),
      restauranteId,
    )
    const itemsByTiempo = items.reduce(
      (acc, item) => {
        if (!acc[item.tiempoComidaId]) acc[item.tiempoComidaId] = []
        acc[item.tiempoComidaId].push(item.toJSON())
        return acc
      },
      {} as Record<string, ReturnType<typeof items[0]["toJSON"]>[]>,
    )
    return c.json({ ...menu.toJSON(), itemsByTiempoComida: itemsByTiempo })
  } catch (err) {
    if (err instanceof MenuNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

menuRouter.put("/menus/:id", requireRol(["PROPIETARIO", "ADMIN", "ENCARGADO"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = MenuUpdateSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

  const restauranteId = await resolverRestauranteId(tenantId)
  if (!restauranteId) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)

  try {
    const menu = await new ActualizarMenuUseCase(makeMenuRepo()).ejecutar(
      c.req.param("id"),
      restauranteId,
      {
        nombre: parsed.data.nombre,
        tipo: parsed.data.tipo,
        fechaInicio: parsed.data.fechaInicio ? new Date(parsed.data.fechaInicio) : undefined,
        fechaFin: parsed.data.fechaFin ? new Date(parsed.data.fechaFin) : undefined,
        descripcion: parsed.data.descripcion,
        tema: parsed.data.tema,
      },
      session.user.id,
    )
    return c.json(menu.toJSON())
  } catch (err) {
    if (err instanceof MenuNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof MenuNoEditable) return c.json({ error: err.code, message: err.message }, 409)
    throw err
  }
})

menuRouter.patch("/menus/:id/estado", requireRol(["PROPIETARIO", "ADMIN", "ENCARGADO"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = MenuEstadoSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

  const restauranteId = await resolverRestauranteId(tenantId)
  if (!restauranteId) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)

  try {
    const menu = await new CambiarEstadoMenuUseCase(makeMenuRepo()).ejecutar(
      c.req.param("id"),
      restauranteId,
      parsed.data.estado,
      session.user.id,
    )
    return c.json(menu.toJSON())
  } catch (err) {
    if (err instanceof MenuNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof TransicionMenuInvalida) return c.json({ error: err.code, message: err.message }, 422)
    if (err instanceof MenuSinItemsDisponibles) return c.json({ error: err.code, message: err.message }, 422)
    throw err
  }
})

// ─── Public endpoints ─────────────────────────────────────────────────────────

publicMenuRouter.get("/:slug/menus", async (c) => {
  const slug = c.req.param("slug")
  const fechaParam = c.req.query("fecha")
  const fecha = fechaParam ? new Date(fechaParam) : new Date()

  const menus = await makeMenuRepo().findPublicadosBySlug(slug, fecha)
  return c.json({ data: menus.map((m) => m.toJSON()), meta: { total: menus.length } })
})

publicMenuRouter.get("/:slug/menus/:menuId", async (c) => {
  const menuId = c.req.param("menuId")

  try {
    const { menu, items } = await new ObtenerMenuUseCase(makeMenuRepo(), makeItemRepo()).ejecutar(menuId)
    if (!menu.esPublico()) return c.json({ error: "MENU_NO_PUBLICADO" }, 404)

    const itemsByTiempo = items.reduce(
      (acc, item) => {
        if (!acc[item.tiempoComidaId]) acc[item.tiempoComidaId] = []
        acc[item.tiempoComidaId].push(item.toJSON())
        return acc
      },
      {} as Record<string, ReturnType<typeof items[0]["toJSON"]>[]>,
    )
    return c.json({ ...menu.toJSON(), itemsByTiempoComida: itemsByTiempo })
  } catch (err) {
    if (err instanceof MenuNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})
