import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { CategoriaPrismaRepository } from "../infrastructure/categoria.prisma.repository.js"
import { ActividadEconomicaPrismaRepository } from "../infrastructure/actividad-economica.prisma.repository.js"
import { ListarCategoriasUseCase } from "../application/categoria/listar-categorias.usecase.js"
import { CrearCategoriaUseCase } from "../application/categoria/crear-categoria.usecase.js"
import { ObtenerCategoriaUseCase } from "../application/categoria/obtener-categoria.usecase.js"
import { ActualizarCategoriaUseCase } from "../application/categoria/actualizar-categoria.usecase.js"
import { CambiarEstadoCategoriaUseCase } from "../application/categoria/cambiar-estado-categoria.usecase.js"
import { CategoriaCreateSchema, CategoriaUpdateSchema, CambiarEstadoSchema } from "./catalogo.schema.js"
import { CategoriaNombreDuplicado, CategoriaNoEncontrada, CategoriaPadreNoEncontrada, ActividadNoEncontrada } from "../domain/catalogo.errors.js"
import { getCatalogoNotificador } from "../infrastructure/catalogo.notificador.provider.js"
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"

export const categoriaRouter = new OpenAPIHono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() {
  return new CategoriaPrismaRepository(db)
}

function makeActividadRepo() {
  return new ActividadEconomicaPrismaRepository(db)
}

categoriaRouter.openapi(
  createRoute({
    method: "get",
    path: "/categorias",
    operationId: "catalogo_listar_categorias",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de categorías", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const { actividadId, estado } = c.req.query()
    const categorias = await new ListarCategoriasUseCase(makeRepo()).ejecutar(tenantId, actividadId, estado)
    return c.json({ data: categorias.map((c) => c.toJSON()) })
  },
)

categoriaRouter.openapi(
  createRoute({
    method: "post",
    path: "/categorias",
    operationId: "catalogo_crear_categoria",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: {
      body: { content: { "application/json": { schema: CategoriaCreateSchema } } },
    },
    responses: {
      201: createdResponse("Categoría creada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = CategoriaCreateSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const categoria = await new CrearCategoriaUseCase(makeRepo(), makeActividadRepo(), getCatalogoNotificador()).ejecutar(
        parsed.data,
        tenantId,
        session.user.id,
      )
      return c.json(categoria.toJSON(), 201)
    } catch (err) {
      if (err instanceof CategoriaNombreDuplicado) return c.json({ error: err.code, message: err.message }, 409)
      if (err instanceof CategoriaPadreNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof ActividadNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

categoriaRouter.openapi(
  createRoute({
    method: "get",
    path: "/categorias/{id}",
    operationId: "catalogo_obtener_categoria",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: okResponse("Categoría", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    try {
      const categoria = await new ObtenerCategoriaUseCase(makeRepo()).ejecutar(c.req.param("id"), tenantId)
      return c.json(categoria.toJSON())
    } catch (err) {
      if (err instanceof CategoriaNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

categoriaRouter.openapi(
  createRoute({
    method: "put",
    path: "/categorias/{id}",
    operationId: "catalogo_actualizar_categoria",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: {
      params: z.object({ id: z.string() }),
      body: { content: { "application/json": { schema: CategoriaUpdateSchema } } },
    },
    responses: {
      200: okResponse("Categoría actualizada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = CategoriaUpdateSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const categoria = await new ActualizarCategoriaUseCase(makeRepo(), getCatalogoNotificador()).ejecutar(
        c.req.param("id"),
        parsed.data,
        tenantId,
        session.user.id,
      )
      return c.json(categoria.toJSON())
    } catch (err) {
      if (err instanceof CategoriaNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

categoriaRouter.openapi(
  createRoute({
    method: "patch",
    path: "/categorias/{id}/estado",
    operationId: "catalogo_cambiarEstado_categoria",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: {
      params: z.object({ id: z.string() }),
      body: { content: { "application/json": { schema: CambiarEstadoSchema } } },
    },
    responses: {
      200: okResponse("Estado cambiado", z.object({ ok: z.boolean() })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = CambiarEstadoSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      await new CambiarEstadoCategoriaUseCase(makeRepo(), getCatalogoNotificador()).ejecutar(
        c.req.param("id"),
        parsed.data.estado,
        tenantId,
        session.user.id,
      )
      return c.json({ ok: true })
    } catch (err) {
      if (err instanceof CategoriaNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)
