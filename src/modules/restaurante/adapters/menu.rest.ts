import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
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
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"

export const menuRouter = new OpenAPIHono<HonoEnv>()
export const publicMenuRouter = new OpenAPIHono<HonoEnv>()

function makeMenuRepo() {
  return new MenuPrismaRepository()
}

function makeItemRepo() {
  return new MenuItemPrismaRepository()
}

// ─── Staff endpoints ──────────────────────────────────────────────────────────

menuRouter.openapi(
  createRoute({
    method: "get",
    path: "/menus",
    operationId: "restaurante_listar_menus",
    tags: ["Restaurante"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de menús", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
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
  },
)

menuRouter.openapi(
  createRoute({
    method: "post",
    path: "/menus",
    operationId: "restaurante_crear_menu",
    tags: ["Restaurante"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN", "ENCARGADO"]),
    request: {
      body: { content: { "application/json": { schema: MenuCreateSchema } } },
    },
    responses: {
      201: createdResponse("Menú creado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
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
  },
)

menuRouter.openapi(
  createRoute({
    method: "get",
    path: "/menus/{id}",
    operationId: "restaurante_obtener_menu",
    tags: ["Restaurante"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: okResponse("Menú con items", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
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
  },
)

menuRouter.openapi(
  createRoute({
    method: "put",
    path: "/menus/{id}",
    operationId: "restaurante_actualizar_menu",
    tags: ["Restaurante"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN", "ENCARGADO"]),
    request: {
      params: z.object({ id: z.string() }),
      body: { content: { "application/json": { schema: MenuUpdateSchema } } },
    },
    responses: {
      200: okResponse("Menú actualizado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
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
  },
)

menuRouter.openapi(
  createRoute({
    method: "patch",
    path: "/menus/{id}/estado",
    operationId: "restaurante_cambiar_estado_menu",
    tags: ["Restaurante"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN", "ENCARGADO"]),
    request: {
      params: z.object({ id: z.string() }),
      body: { content: { "application/json": { schema: MenuEstadoSchema } } },
    },
    responses: {
      200: okResponse("Estado de menú actualizado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
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
  },
)

// ─── Public endpoints ─────────────────────────────────────────────────────────

publicMenuRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/menus",
    operationId: "restaurante_menu_publico_listar_menus",
    tags: ["Restaurante Público"],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      200: okResponse("Menús públicos", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const slug = c.req.param("slug")
    const fechaParam = c.req.query("fecha")
    const fecha = fechaParam ? new Date(fechaParam) : new Date()

    const menus = await makeMenuRepo().findPublicadosBySlug(slug, fecha)
    return c.json({ data: menus.map((m) => m.toJSON()), meta: { total: menus.length } })
  },
)

publicMenuRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/menus/{menuId}",
    operationId: "restaurante_publico_obtener_menu",
    tags: ["Restaurante Público"],
    request: { params: z.object({ slug: z.string(), menuId: z.string() }) },
    responses: {
      200: okResponse("Menú público con items", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
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
  },
)
