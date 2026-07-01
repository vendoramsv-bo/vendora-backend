import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireAuth, requireTenantActivo, requireRol } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { TiendaPrismaRepository } from "../infrastructure/tienda.prisma.repository.js"
import { getTiendaNotificador } from "../infrastructure/tienda.notificador.provider.js"
import { ActivarTiendaUseCase } from "../application/perfil/activar-tienda.usecase.js"
import { DesactivarTiendaUseCase } from "../application/perfil/desactivar-tienda.usecase.js"
import { ObtenerConfiguracionUseCase } from "../application/perfil/obtener-configuracion.usecase.js"
import { ActualizarConfiguracionUseCase } from "../application/perfil/actualizar-configuracion.usecase.js"
import { AgregarProductoDestacadoUseCase } from "../application/destacados/agregar-producto-destacado.usecase.js"
import { QuitarProductoDestacadoUseCase } from "../application/destacados/quitar-producto-destacado.usecase.js"
import { ReordenarDestacadosUseCase } from "../application/destacados/reordenar-destacados.usecase.js"
import { ListarDestacadosUseCase } from "../application/destacados/listar-destacados.usecase.js"
import {
  ActualizarConfiguracionSchema,
  AgregarDestacadoSchema,
  ReordenarDestacadosSchema,
} from "./tienda.schema.js"
import {
  TiendaNoEncontradaError,
  ConfiguracionNoEncontradaError,
  ProductoDestacadoLimiteError,
  ProductoNoVisibleParaDestacadoError,
  ProductoDestacadoYaExisteError,
} from "../domain/tienda.errors.js"
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"

export const tiendaStaffRouter = new OpenAPIHono<HonoEnv>()

tiendaStaffRouter.use("*", requireAuth, requireTenantActivo)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any
function makeRepo() { return new TiendaPrismaRepository(db) }

// ─── Activar perfil de tienda ─────────────────────────────────────────────────

tiendaStaffRouter.openapi(
  createRoute({
    method: "patch",
    path: "/tienda/activar",
    operationId: "tienda_activar_perfil",
    tags: ["Tienda"],
    security: [{ bearerAuth: [] }],
    middleware: [requireRol(["PROPIETARIO"])],
    responses: {
      200: okResponse("Tienda activada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const result = await new ActivarTiendaUseCase(makeRepo(), getTiendaNotificador()).execute(tenantId, session.user.id)
    return c.json(result)
  },
)

// ─── Desactivar perfil de tienda ──────────────────────────────────────────────

tiendaStaffRouter.openapi(
  createRoute({
    method: "patch",
    path: "/tienda/desactivar",
    operationId: "tienda_desactivar_perfil",
    tags: ["Tienda"],
    security: [{ bearerAuth: [] }],
    middleware: [requireRol(["PROPIETARIO"])],
    responses: {
      200: okResponse("Tienda desactivada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const result = await new DesactivarTiendaUseCase(makeRepo()).execute(tenantId)
    return c.json(result)
  },
)

// ─── Configuración visual ─────────────────────────────────────────────────────

tiendaStaffRouter.openapi(
  createRoute({
    method: "get",
    path: "/tienda/configuracion",
    operationId: "tienda_get_configuracion",
    tags: ["Tienda"],
    security: [{ bearerAuth: [] }],
    middleware: [requireRol(["PROPIETARIO", "ADMIN"])],
    responses: {
      200: okResponse("Configuración de la tienda", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    try {
      const result = await new ObtenerConfiguracionUseCase(makeRepo()).execute(tenantId)
      return c.json(result)
    } catch (err) {
      if (err instanceof ConfiguracionNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

tiendaStaffRouter.openapi(
  createRoute({
    method: "patch",
    path: "/tienda/configuracion",
    operationId: "tienda_actualizar_configuracion",
    tags: ["Tienda"],
    security: [{ bearerAuth: [] }],
    middleware: [requireRol(["PROPIETARIO", "ADMIN"])],
    request: {
      body: { content: { "application/json": { schema: ActualizarConfiguracionSchema } }, required: true },
    },
    responses: {
      200: okResponse("Configuración actualizada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = ActualizarConfiguracionSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new ActualizarConfiguracionUseCase(makeRepo(), getTiendaNotificador()).execute(
        tenantId, parsed.data, session.user.id,
      )
      return c.json(result)
    } catch (err) {
      if (err instanceof ConfiguracionNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof TiendaNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

// ─── Productos destacados ─────────────────────────────────────────────────────

tiendaStaffRouter.openapi(
  createRoute({
    method: "get",
    path: "/tienda/destacados",
    operationId: "tienda_listar_destacados",
    tags: ["Tienda"],
    security: [{ bearerAuth: [] }],
    middleware: [requireRol(["PROPIETARIO", "ADMIN"])],
    responses: {
      200: okResponse("Lista de productos destacados", z.object({ data: z.array(z.record(z.string(), z.unknown())), total: z.number() })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const data = await new ListarDestacadosUseCase(makeRepo()).execute(tenantId)
    return c.json({ data, total: data.length })
  },
)

tiendaStaffRouter.openapi(
  createRoute({
    method: "post",
    path: "/tienda/destacados",
    operationId: "tienda_agregar_destacado",
    tags: ["Tienda"],
    security: [{ bearerAuth: [] }],
    middleware: [requireRol(["PROPIETARIO", "ADMIN"])],
    request: {
      body: { content: { "application/json": { schema: AgregarDestacadoSchema } }, required: true },
    },
    responses: {
      201: createdResponse("Producto destacado agregado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = AgregarDestacadoSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new AgregarProductoDestacadoUseCase(makeRepo(), getTiendaNotificador()).execute(
        tenantId, parsed.data.productoId, parsed.data.orden, session.user.id,
      )
      return c.json(result, 201)
    } catch (err) {
      if (err instanceof ProductoDestacadoLimiteError) return c.json({ error: err.code, message: err.message }, 422)
      if (err instanceof ProductoNoVisibleParaDestacadoError) return c.json({ error: err.code, message: err.message }, 422)
      if (err instanceof ProductoDestacadoYaExisteError) return c.json({ error: err.code, message: err.message }, 409)
      if (err instanceof TiendaNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

tiendaStaffRouter.openapi(
  createRoute({
    method: "delete",
    path: "/tienda/destacados/{productoId}",
    operationId: "tienda_quitar_destacado",
    tags: ["Tienda"],
    security: [{ bearerAuth: [] }],
    middleware: [requireRol(["PROPIETARIO", "ADMIN"])],
    request: {
      params: z.object({ productoId: z.string() }),
    },
    responses: {
      200: okResponse("Producto destacado eliminado", z.object({ ok: z.boolean() })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    await new QuitarProductoDestacadoUseCase(makeRepo(), getTiendaNotificador()).execute(tenantId, c.req.param("productoId"))
    return c.json({ ok: true })
  },
)

tiendaStaffRouter.openapi(
  createRoute({
    method: "patch",
    path: "/tienda/destacados/reordenar",
    operationId: "tienda_reordenar_destacados",
    tags: ["Tienda"],
    security: [{ bearerAuth: [] }],
    middleware: [requireRol(["PROPIETARIO", "ADMIN"])],
    request: {
      body: { content: { "application/json": { schema: ReordenarDestacadosSchema } }, required: true },
    },
    responses: {
      200: okResponse("Destacados reordenados", z.object({ ok: z.boolean() })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const body = await c.req.json()
    const parsed = ReordenarDestacadosSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    await new ReordenarDestacadosUseCase(makeRepo(), getTiendaNotificador()).execute(tenantId, parsed.data.orden)
    return c.json({ ok: true })
  },
)
