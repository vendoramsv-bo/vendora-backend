import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { MedicoPrismaRepository } from "../infrastructure/medico.prisma.repository.js"
import { CrearMedicoUseCase } from "../application/medico/crear-medico.usecase.js"
import { ListarMedicosUseCase } from "../application/medico/listar-medicos.usecase.js"
import { ObtenerMedicoUseCase } from "../application/medico/obtener-medico.usecase.js"
import { ActualizarMedicoUseCase } from "../application/medico/actualizar-medico.usecase.js"
import { GestionarHorariosUseCase } from "../application/medico/gestionar-horarios.usecase.js"
import { MedicoBaseSchema, MedicoUpdateSchema, HorarioSchema, QueryParamsConsultorioSchema } from "./consultorio.schema.js"
import { MedicoNoEncontrado, MedicoYaExiste, MedicoTieneCitasPendientes, HorarioDuplicado } from "../domain/consultorio.errors.js"
import { paginate } from "../../../core/query-params.js"
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"

export const medicoRouter = new OpenAPIHono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() {
  return new MedicoPrismaRepository(db)
}

medicoRouter.openapi(
  createRoute({
    method: "get",
    path: "/medicos",
    operationId: "consultorio_get_medicos",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de médicos", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const consultorioRaw = await db.consultorio.findUnique({ where: { tenantId }, select: { id: true } })
    if (!consultorioRaw) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
    const params = QueryParamsConsultorioSchema.parse(c.req.query())
    const resultado = await new ListarMedicosUseCase(makeRepo()).ejecutar(consultorioRaw.id, params)
    return c.json(paginate(resultado.data.map((m) => m.toJSON()), resultado.total, params))
  },
)

medicoRouter.openapi(
  createRoute({
    method: "post",
    path: "/medicos",
    operationId: "consultorio_post_medico",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    middleware: [requireRol(["PROPIETARIO", "ADMIN"])],
    responses: {
      201: createdResponse("Médico creado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = MedicoBaseSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    const consultorioRaw = await db.consultorio.findUnique({ where: { tenantId }, select: { id: true } })
    if (!consultorioRaw) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
    try {
      const medico = await new CrearMedicoUseCase(makeRepo()).ejecutar({ ...parsed.data, consultorioId: consultorioRaw.id }, session.user.id)
      return c.json(medico.toJSON(), 201)
    } catch (err) {
      if (err instanceof MedicoYaExiste) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

medicoRouter.openapi(
  createRoute({
    method: "get",
    path: "/medicos/{id}",
    operationId: "consultorio_get_medico",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Médico", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const consultorioRaw = await db.consultorio.findUnique({ where: { tenantId }, select: { id: true } })
    if (!consultorioRaw) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
    try {
      const medico = await new ObtenerMedicoUseCase(makeRepo()).ejecutar(c.req.param("id"), consultorioRaw.id)
      return c.json(medico.toJSON())
    } catch (err) {
      if (err instanceof MedicoNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

medicoRouter.openapi(
  createRoute({
    method: "put",
    path: "/medicos/{id}",
    operationId: "consultorio_put_medico",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    middleware: [requireRol(["PROPIETARIO", "ADMIN"])],
    responses: {
      200: okResponse("Médico actualizado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = MedicoUpdateSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    const consultorioRaw = await db.consultorio.findUnique({ where: { tenantId }, select: { id: true } })
    if (!consultorioRaw) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
    try {
      const medico = await new ActualizarMedicoUseCase(makeRepo()).ejecutar(c.req.param("id"), parsed.data, session.user.id, consultorioRaw.id)
      return c.json(medico.toJSON())
    } catch (err) {
      if (err instanceof MedicoNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof MedicoTieneCitasPendientes) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

medicoRouter.openapi(
  createRoute({
    method: "delete",
    path: "/medicos/{id}",
    operationId: "consultorio_delete_medico",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    middleware: [requireRol(["PROPIETARIO", "ADMIN"])],
    responses: {
      200: okResponse("Médico desactivado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const consultorioRaw = await db.consultorio.findUnique({ where: { tenantId }, select: { id: true } })
    if (!consultorioRaw) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
    try {
      const medico = await new ActualizarMedicoUseCase(makeRepo()).ejecutar(c.req.param("id"), { estado: "INACTIVO" }, session.user.id, consultorioRaw.id)
      return c.json(medico.toJSON())
    } catch (err) {
      if (err instanceof MedicoNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof MedicoTieneCitasPendientes) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

medicoRouter.openapi(
  createRoute({
    method: "get",
    path: "/medicos/{id}/horarios",
    operationId: "consultorio_get_medico_horarios",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Horarios del médico", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const consultorioRaw = await db.consultorio.findUnique({ where: { tenantId }, select: { id: true } })
    if (!consultorioRaw) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
    try {
      await new ObtenerMedicoUseCase(makeRepo()).ejecutar(c.req.param("id"), consultorioRaw.id)
      const horarios = await makeRepo().listarHorarios(c.req.param("id"))
      return c.json({ data: horarios })
    } catch (err) {
      if (err instanceof MedicoNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

medicoRouter.openapi(
  createRoute({
    method: "post",
    path: "/medicos/{id}/horarios",
    operationId: "consultorio_post_medico_horario",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    middleware: [requireRol(["PROPIETARIO", "ADMIN", "MEDICO"])],
    responses: {
      201: createdResponse("Horario agregado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const body = await c.req.json()
    const parsed = HorarioSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    const consultorioRaw = await db.consultorio.findUnique({ where: { tenantId }, select: { id: true } })
    if (!consultorioRaw) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
    try {
      const horario = await new GestionarHorariosUseCase(makeRepo()).agregar(c.req.param("id"), parsed.data, consultorioRaw.id)
      return c.json(horario, 201)
    } catch (err) {
      if (err instanceof MedicoNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof HorarioDuplicado) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

medicoRouter.openapi(
  createRoute({
    method: "delete",
    path: "/medicos/{id}/horarios/{horarioId}",
    operationId: "consultorio_delete_medico_horario",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    middleware: [requireRol(["PROPIETARIO", "ADMIN", "MEDICO"])],
    responses: {
      200: okResponse("Horario eliminado", z.object({ ok: z.boolean() })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const consultorioRaw = await db.consultorio.findUnique({ where: { tenantId }, select: { id: true } })
    if (!consultorioRaw) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
    try {
      await new GestionarHorariosUseCase(makeRepo()).eliminar(c.req.param("horarioId"), c.req.param("id"), consultorioRaw.id)
      return c.json({ ok: true })
    } catch (err) {
      if (err instanceof MedicoNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)
