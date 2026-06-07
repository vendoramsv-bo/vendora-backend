import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { MenuPrismaRepository } from "../infrastructure/menu.prisma.repository.js"
import { MenuItemPrismaRepository } from "../infrastructure/menu-item.prisma.repository.js"
import { AgregarItemMenuUseCase } from "../application/menu/agregar-item-menu.usecase.js"
import { ActualizarItemMenuUseCase } from "../application/menu/actualizar-item-menu.usecase.js"
import { EliminarItemMenuUseCase } from "../application/menu/eliminar-item-menu.usecase.js"
import { ObtenerMenuUseCase } from "../application/menu/obtener-menu.usecase.js"
import { MenuItemCreateSchema, MenuItemUpdateSchema } from "./restaurante.schema.js"
import {
  MenuNoEncontrado,
  MenuNoEditable,
  ItemDuplicado,
  ItemNoDisponible,
  ItemConReservasActivas,
} from "../domain/restaurante.errors.js"
import { resolverRestauranteId } from "./restaurante.rest.js"
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"

export const menuItemRouter = new OpenAPIHono<HonoEnv>()

function makeMenuRepo() {
  return new MenuPrismaRepository()
}

function makeItemRepo() {
  return new MenuItemPrismaRepository()
}

menuItemRouter.openapi(
  createRoute({
    method: "get",
    path: "/menus/{menuId}/items",
    operationId: "restaurante_listar_items_menu",
    tags: ["Restaurante"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ menuId: z.string() }) },
    responses: {
      200: okResponse("Items del menú", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const restauranteId = await resolverRestauranteId(tenantId)
    if (!restauranteId) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)

    try {
      const { items } = await new ObtenerMenuUseCase(makeMenuRepo(), makeItemRepo()).ejecutar(
        c.req.param("menuId"),
        restauranteId,
      )
      return c.json({ data: items.map((i) => i.toJSON()), meta: { total: items.length } })
    } catch (err) {
      if (err instanceof MenuNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

menuItemRouter.openapi(
  createRoute({
    method: "post",
    path: "/menus/{menuId}/items",
    operationId: "restaurante_agregar_item_menu",
    tags: ["Restaurante"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN", "ENCARGADO"]),
    request: {
      params: z.object({ menuId: z.string() }),
      body: { content: { "application/json": { schema: MenuItemCreateSchema } } },
    },
    responses: {
      201: createdResponse("Item agregado al menú", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const body = await c.req.json()
    const parsed = MenuItemCreateSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

    const restauranteId = await resolverRestauranteId(tenantId)
    if (!restauranteId) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)

    try {
      const item = await new AgregarItemMenuUseCase(makeMenuRepo(), makeItemRepo()).ejecutar(
        c.req.param("menuId"),
        restauranteId,
        {
          menuId: c.req.param("menuId"),
          tiempoComidaId: parsed.data.tiempoComidaId,
          productoId: parsed.data.productoId,
          precio: parsed.data.precio,
          esEspecial: parsed.data.esEspecial,
          destacado: parsed.data.destacado,
          disponible: parsed.data.disponible,
          orden: parsed.data.orden,
          notaMenu: parsed.data.notaMenu ?? null,
        },
      )
      return c.json(item.toJSON(), 201)
    } catch (err) {
      if (err instanceof MenuNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof MenuNoEditable) return c.json({ error: err.code, message: err.message }, 409)
      if (err instanceof ItemDuplicado) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

menuItemRouter.openapi(
  createRoute({
    method: "put",
    path: "/menus/{menuId}/items/{itemId}",
    operationId: "restaurante_actualizar_item_menu",
    tags: ["Restaurante"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN", "ENCARGADO"]),
    request: {
      params: z.object({ menuId: z.string(), itemId: z.string() }),
      body: { content: { "application/json": { schema: MenuItemUpdateSchema } } },
    },
    responses: {
      200: okResponse("Item actualizado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const body = await c.req.json()
    const parsed = MenuItemUpdateSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

    const restauranteId = await resolverRestauranteId(tenantId)
    if (!restauranteId) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)

    try {
      const item = await new ActualizarItemMenuUseCase(makeMenuRepo(), makeItemRepo()).ejecutar(
        c.req.param("menuId"),
        c.req.param("itemId"),
        restauranteId,
        {
          precio: parsed.data.precio,
          esEspecial: parsed.data.esEspecial,
          destacado: parsed.data.destacado,
          disponible: parsed.data.disponible,
          orden: parsed.data.orden,
          notaMenu: parsed.data.notaMenu,
        },
      )
      return c.json(item.toJSON())
    } catch (err) {
      if (err instanceof MenuNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof MenuNoEditable) return c.json({ error: err.code, message: err.message }, 409)
      if (err instanceof ItemNoDisponible) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

menuItemRouter.openapi(
  createRoute({
    method: "delete",
    path: "/menus/{menuId}/items/{itemId}",
    operationId: "restaurante_eliminar_item_menu",
    tags: ["Restaurante"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: { params: z.object({ menuId: z.string(), itemId: z.string() }) },
    responses: {
      204: { description: "Item eliminado" },
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const restauranteId = await resolverRestauranteId(tenantId)
    if (!restauranteId) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)

    try {
      await new EliminarItemMenuUseCase(makeMenuRepo(), makeItemRepo()).ejecutar(
        c.req.param("menuId"),
        c.req.param("itemId"),
        restauranteId,
      )
      return c.body(null, 204)
    } catch (err) {
      if (err instanceof MenuNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof ItemNoDisponible) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof ItemConReservasActivas) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)
