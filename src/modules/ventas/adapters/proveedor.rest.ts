import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol, ROLES_ABASTECIMIENTO } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { ProveedorPrismaRepository } from "../infrastructure/proveedor.prisma.repository.js"
import { CrearProveedorUseCase } from "../application/proveedor/crear-proveedor.usecase.js"
import { ObtenerProveedorUseCase } from "../application/proveedor/obtener-proveedor.usecase.js"
import { ActualizarProveedorUseCase } from "../application/proveedor/actualizar-proveedor.usecase.js"
import { CambiarEstadoProveedorUseCase } from "../application/proveedor/cambiar-estado-proveedor.usecase.js"
import { EliminarProveedorUseCase } from "../application/proveedor/eliminar-proveedor.usecase.js"
import { ListarProveedoresUseCase } from "../application/proveedor/listar-proveedores.usecase.js"
import {
  CrearProveedorSchema,
  ActualizarProveedorSchema,
  CambiarEstadoSchema,
  QueryParamsProveedorSchema,
} from "./ventas.schema.js"
import {
  ProveedorNoEncontradoError,
  ProveedorNombreDuplicadoError,
  ProveedorNITDuplicadoError,
  ProveedorEnUsoError,
} from "../domain/ventas.errors.js"
import { getVentasNotificador } from "../infrastructure/ventas.notificador.provider.js"
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"

export const proveedorRouter = new OpenAPIHono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() {
  return new ProveedorPrismaRepository(db)
}

// GET /proveedores
proveedorRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    operationId: "ventas_listar_proveedores",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de proveedores", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const params = QueryParamsProveedorSchema.parse(c.req.query())
    const estado = c.req.query("estado")
    const result = await new ListarProveedoresUseCase(makeRepo()).execute(tenantId, params, estado)
    return c.json(result)
  },
)

// POST /proveedores
proveedorRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    operationId: "ventas_crear_proveedor",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_ABASTECIMIENTO),
    request: {
      body: {
        content: {
          "application/json": { schema: CrearProveedorSchema },
        },
      },
    },
    responses: {
      201: createdResponse("Proveedor creado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = CrearProveedorSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new CrearProveedorUseCase(makeRepo(), getVentasNotificador()).execute({
        tenantId,
        ...parsed.data,
        createdById: session.user.id,
      })
      return c.json(result, 201)
    } catch (err) {
      if (err instanceof ProveedorNombreDuplicadoError) return c.json({ error: err.code, message: err.message }, 409)
      if (err instanceof ProveedorNITDuplicadoError) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

// GET /proveedores/:id
proveedorRouter.openapi(
  createRoute({
    method: "get",
    path: "/{id}",
    operationId: "ventas_obtener_proveedor",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      200: okResponse("Proveedor encontrado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    try {
      const result = await new ObtenerProveedorUseCase(makeRepo()).execute(c.req.param("id"), tenantId)
      return c.json(result)
    } catch (err) {
      if (err instanceof ProveedorNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

// PATCH /proveedores/:id
proveedorRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{id}",
    operationId: "ventas_actualizar_proveedor",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_ABASTECIMIENTO),
    request: {
      params: z.object({ id: z.string() }),
      body: {
        content: {
          "application/json": { schema: ActualizarProveedorSchema },
        },
      },
    },
    responses: {
      200: okResponse("Proveedor actualizado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = ActualizarProveedorSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const result = await new ActualizarProveedorUseCase(makeRepo(), getVentasNotificador()).execute({
        id: c.req.param("id"),
        tenantId,
        ...parsed.data,
        updatedById: session.user.id,
      })
      return c.json(result)
    } catch (err) {
      if (err instanceof ProveedorNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof ProveedorNombreDuplicadoError) return c.json({ error: err.code, message: err.message }, 409)
      if (err instanceof ProveedorNITDuplicadoError) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

// PATCH /proveedores/:id/estado
proveedorRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{id}/estado",
    operationId: "ventas_cambiar_estado_proveedor",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_ABASTECIMIENTO),
    request: {
      params: z.object({ id: z.string() }),
      body: {
        content: {
          "application/json": { schema: CambiarEstadoSchema },
        },
      },
    },
    responses: {
      200: okResponse("Estado de proveedor actualizado", z.record(z.string(), z.unknown())),
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
      const result = await new CambiarEstadoProveedorUseCase(makeRepo()).execute(
        c.req.param("id"),
        tenantId,
        parsed.data.estado,
        session.user.id,
      )
      return c.json(result)
    } catch (err) {
      if (err instanceof ProveedorNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

// DELETE /proveedores/:id
proveedorRouter.openapi(
  createRoute({
    method: "delete",
    path: "/{id}",
    operationId: "ventas_eliminar_proveedor",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(ROLES_ABASTECIMIENTO),
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      204: { description: "Proveedor eliminado" },
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    try {
      await new EliminarProveedorUseCase(makeRepo()).execute(c.req.param("id"), tenantId)
      return c.body(null, 204)
    } catch (err) {
      if (err instanceof ProveedorNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof ProveedorEnUsoError) return c.json({ error: err.code, message: err.message }, 422)
      throw err
    }
  },
)
