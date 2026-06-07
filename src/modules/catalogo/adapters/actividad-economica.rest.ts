import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { ActividadEconomicaPrismaRepository } from "../infrastructure/actividad-economica.prisma.repository.js"
import { ListarActividadesUseCase } from "../application/actividad-economica/listar-actividades.usecase.js"
import { CrearActividadUseCase } from "../application/actividad-economica/crear-actividad.usecase.js"
import { DesactivarActividadUseCase } from "../application/actividad-economica/desactivar-actividad.usecase.js"
import { ActividadCreateSchema } from "./catalogo.schema.js"
import { ActividadDuplicada, ActividadNoEncontrada, ActividadEnUso } from "../domain/catalogo.errors.js"
import { getCatalogoNotificador } from "../infrastructure/catalogo.notificador.provider.js"
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"

export const actividadEconomicaRouter = new OpenAPIHono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() {
  return new ActividadEconomicaPrismaRepository(db)
}

actividadEconomicaRouter.openapi(
  createRoute({
    method: "get",
    path: "/cla-actividades",
    operationId: "catalogo_listar_cla_actividades",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de clasificadores de actividades", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const repo = makeRepo()
    const clasificadores = await repo.listarClasificadores()
    return c.json({ data: clasificadores })
  },
)

actividadEconomicaRouter.openapi(
  createRoute({
    method: "get",
    path: "/actividades",
    operationId: "catalogo_listar_actividades",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de actividades económicas", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const resultado = await new ListarActividadesUseCase(makeRepo()).ejecutar(tenantId)
    return c.json({ data: resultado.actividades.map((a) => a.toJSON()) })
  },
)

actividadEconomicaRouter.openapi(
  createRoute({
    method: "post",
    path: "/actividades",
    operationId: "catalogo_crear_actividad",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: {
      body: { content: { "application/json": { schema: ActividadCreateSchema } } },
    },
    responses: {
      201: createdResponse("Actividad creada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = ActividadCreateSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const actividad = await new CrearActividadUseCase(makeRepo(), getCatalogoNotificador()).ejecutar(
        parsed.data.claActividadId,
        tenantId,
        session.user.id,
      )
      return c.json(actividad.toJSON(), 201)
    } catch (err) {
      if (err instanceof ActividadDuplicada) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

actividadEconomicaRouter.openapi(
  createRoute({
    method: "delete",
    path: "/actividades/{id}",
    operationId: "catalogo_eliminar_actividad",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    middleware: requireRol(["PROPIETARIO", "ADMIN"]),
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: okResponse("Actividad desactivada", z.object({ ok: z.boolean() })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    try {
      await new DesactivarActividadUseCase(makeRepo()).ejecutar(c.req.param("id"), tenantId, session.user.id)
      return c.json({ ok: true })
    } catch (err) {
      if (err instanceof ActividadNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof ActividadEnUso) return c.json({ error: err.code, message: err.message }, 422)
      throw err
    }
  },
)
