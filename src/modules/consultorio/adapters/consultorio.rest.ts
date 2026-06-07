import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { ConsultorioPrismaRepository } from "../infrastructure/consultorio.prisma.repository.js"
import { AuditoriaAccesoPrismaRepository } from "../infrastructure/auditoria-acceso.prisma.repository.js"
import { ObtenerConsultorioUseCase } from "../application/consultorio/obtener-consultorio.usecase.js"
import { ActualizarConsultorioUseCase } from "../application/consultorio/actualizar-consultorio.usecase.js"
import { ConsultorioPerfilSchema, QueryParamsConsultorioSchema } from "./consultorio.schema.js"
import { ConsultorioNoEncontrado } from "../domain/consultorio.errors.js"
import { paginate } from "../../../core/query-params.js"
import { errorResponses, okResponse } from "../../../core/openapi-responses.js"

export const consultorioPerfilRouter = new OpenAPIHono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

consultorioPerfilRouter.openapi(
  createRoute({
    method: "get",
    path: "/perfil",
    operationId: "consultorio_get_perfil",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Perfil del consultorio", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repo = new ConsultorioPrismaRepository(prisma as any)
    const useCase = new ObtenerConsultorioUseCase(repo)
    try {
      const consultorio = await useCase.ejecutar(tenantId)
      return c.json(consultorio.toJSON())
    } catch (err) {
      if (err instanceof ConsultorioNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
    void session
  },
)

consultorioPerfilRouter.openapi(
  createRoute({
    method: "get",
    path: "/auditoria",
    operationId: "consultorio_get_auditoria",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    middleware: [requireRol(["PROPIETARIO", "ADMIN"])],
    responses: {
      200: okResponse("Lista de auditoría", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const cResult = await db.consultorio.findUnique({ where: { tenantId }, select: { id: true } })
    if (!cResult) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
    const params = QueryParamsConsultorioSchema.parse(c.req.query())
    const repo = new AuditoriaAccesoPrismaRepository(db)
    const { data, total } = await repo.listar(cResult.id, params)
    return c.json(paginate(data, total, params))
  },
)

consultorioPerfilRouter.openapi(
  createRoute({
    method: "put",
    path: "/perfil",
    operationId: "consultorio_put_perfil",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    middleware: [requireRol(["PROPIETARIO", "ADMIN"])],
    responses: {
      200: okResponse("Perfil actualizado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = ConsultorioPerfilSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repo = new ConsultorioPrismaRepository(prisma as any)
    const useCase = new ActualizarConsultorioUseCase(repo)
    const consultorio = await useCase.ejecutar(tenantId, parsed.data, session.user.id)
    return c.json(consultorio.toJSON())
  },
)
