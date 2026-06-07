import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import type { Context } from "hono"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { HistoriaClinicaPrismaRepository } from "../infrastructure/historia-clinica.prisma.repository.js"
import { CrearHistoriaUseCase } from "../application/historia-clinica/crear-historia.usecase.js"
import { ListarHistoriasUseCase } from "../application/historia-clinica/listar-historias.usecase.js"
import { ObtenerHistoriaUseCase } from "../application/historia-clinica/obtener-historia.usecase.js"
import { ActualizarHistoriaUseCase } from "../application/historia-clinica/actualizar-historia.usecase.js"
import { UpsertExtensionUseCase } from "../application/historia-clinica/upsert-extension.usecase.js"
import { AdjuntarArchivoUseCase } from "../application/historia-clinica/adjuntar-archivo.usecase.js"
import { getConsultorioNotificador } from "../infrastructure/consultorio.notificador.provider.js"
import { HistoriaCreateSchema, HistoriaUpdateWithLockSchema, QueryParamsConsultorioSchema } from "./consultorio.schema.js"
import { HistoriaNoEncontrada, ConflictoVersionError } from "../domain/consultorio.errors.js"
import { paginate } from "../../../core/query-params.js"
import type { ExtensionTipo } from "../domain/ports/IHistoriaClinicaRepository.js"
import { errorResponses, okResponse, createdResponse } from "../../../core/openapi-responses.js"

export const historiaClinicaRouter = new OpenAPIHono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() { return new HistoriaClinicaPrismaRepository(db) }

async function getConsultorioId(tenantId: string): Promise<string | null> {
  const r = await db.consultorio.findUnique({ where: { tenantId }, select: { id: true } })
  return r?.id ?? null
}

historiaClinicaRouter.openapi(
  createRoute({
    method: "get",
    path: "/historias",
    operationId: "consultorio_get_historias",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de historias clínicas", z.object({ data: z.array(z.record(z.string(), z.unknown())) })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const cId = await getConsultorioId(c.get("tenantId"))
    if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
    const params = QueryParamsConsultorioSchema.parse(c.req.query())
    const resultado = await new ListarHistoriasUseCase(makeRepo()).ejecutar(cId, params)
    return c.json(paginate(resultado.data.map((h) => h.toJSON()), resultado.total, params))
  },
)

historiaClinicaRouter.openapi(
  createRoute({
    method: "post",
    path: "/historias",
    operationId: "consultorio_post_historia",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    responses: {
      201: createdResponse("Historia clínica creada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const session = c.get("session")
    const tenantId = c.get("tenantId")
    const cId = await getConsultorioId(tenantId)
    if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
    const body = await c.req.json()
    const parsed = HistoriaCreateSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    const { fecha, ...restData } = parsed.data
    const historia = await new CrearHistoriaUseCase(makeRepo(), getConsultorioNotificador()).ejecutar(
      { ...restData, ...(fecha ? { fecha: new Date(fecha) } : {}) }, cId, session.user.id, tenantId,
    )
    return c.json(historia.toJSON(), 201)
  },
)

historiaClinicaRouter.openapi(
  createRoute({
    method: "get",
    path: "/historias/{id}",
    operationId: "consultorio_get_historia",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Historia clínica", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const cId = await getConsultorioId(c.get("tenantId"))
    if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
    try {
      const h = await new ObtenerHistoriaUseCase(makeRepo()).ejecutar(c.req.param("id"), cId)
      return c.json(h.toJSON())
    } catch (err) {
      if (err instanceof HistoriaNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

historiaClinicaRouter.openapi(
  createRoute({
    method: "put",
    path: "/historias/{id}",
    operationId: "consultorio_put_historia",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Historia clínica actualizada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const session = c.get("session")
    const cId = await getConsultorioId(c.get("tenantId"))
    if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
    const body = await c.req.json()
    const parsed = HistoriaUpdateWithLockSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    try {
      const { fecha: fechaStr, expectedUpdatedAt: expectedStr, ...restUpdate } = parsed.data
      const updateData = { ...restUpdate, ...(fechaStr ? { fecha: new Date(fechaStr) } : {}) }
      const expectedUpdatedAt = expectedStr ? new Date(expectedStr) : undefined
      const h = await new ActualizarHistoriaUseCase(makeRepo()).ejecutar(c.req.param("id"), updateData, session.user.id, cId, expectedUpdatedAt)
      return c.json(h.toJSON())
    } catch (err) {
      if (err instanceof HistoriaNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
      if (err instanceof ConflictoVersionError) return c.json({ error: err.code, message: err.message, statusCode: 409 }, 409)
      throw err
    }
  },
)

const extensionHandler = (tipo: ExtensionTipo) => async (c: Context<HonoEnv>) => {
  const cId = await getConsultorioId(c.get("tenantId"))
  if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
  const body = await c.req.json()
  try {
    await new UpsertExtensionUseCase(makeRepo()).ejecutar(c.req.param("id") as string, tipo, body, cId)
    return c.json({ ok: true })
  } catch (err) {
    if (err instanceof HistoriaNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
}

historiaClinicaRouter.openapi(
  createRoute({
    method: "put",
    path: "/historias/{id}/odontologia",
    operationId: "consultorio_put_historia_odontologia",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Extensión odontología actualizada", z.object({ ok: z.boolean() })),
      ...errorResponses,
    },
  }),
  extensionHandler("odontologia"),
)

historiaClinicaRouter.openapi(
  createRoute({
    method: "put",
    path: "/historias/{id}/pediatria",
    operationId: "consultorio_put_historia_pediatria",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Extensión pediatría actualizada", z.object({ ok: z.boolean() })),
      ...errorResponses,
    },
  }),
  extensionHandler("pediatria"),
)

historiaClinicaRouter.openapi(
  createRoute({
    method: "put",
    path: "/historias/{id}/general",
    operationId: "consultorio_put_historia_general",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Extensión general actualizada", z.object({ ok: z.boolean() })),
      ...errorResponses,
    },
  }),
  extensionHandler("general"),
)

historiaClinicaRouter.openapi(
  createRoute({
    method: "put",
    path: "/historias/{id}/perinatal",
    operationId: "consultorio_put_historia_perinatal",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Extensión perinatal actualizada", z.object({ ok: z.boolean() })),
      ...errorResponses,
    },
  }),
  extensionHandler("perinatal"),
)

historiaClinicaRouter.openapi(
  createRoute({
    method: "post",
    path: "/historias/{id}/perinatal/controles",
    operationId: "consultorio_post_historia_perinatal_control",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    responses: {
      201: createdResponse("Control perinatal registrado", z.object({ ok: z.boolean() })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const cId = await getConsultorioId(c.get("tenantId"))
    if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
    const body = await c.req.json()
    try {
      const historia = await new ObtenerHistoriaUseCase(makeRepo()).ejecutar(c.req.param("id"), cId)
      if (!historia.hcPerinatal) return c.json({ error: "PERINATAL_NO_ENCONTRADO" }, 404)
      await makeRepo().agregarControlPerinatal(historia.hcPerinatal.id, body)
      return c.json({ ok: true }, 201)
    } catch (err) {
      if (err instanceof HistoriaNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

historiaClinicaRouter.openapi(
  createRoute({
    method: "post",
    path: "/historias/{id}/adjuntos",
    operationId: "consultorio_post_historia_adjunto",
    tags: ["Consultorio"],
    security: [{ bearerAuth: [] }],
    responses: {
      201: createdResponse("Adjunto registrado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const cId = await getConsultorioId(c.get("tenantId"))
    if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
    const body = await c.req.json()
    try {
      const adjunto = await new AdjuntarArchivoUseCase(makeRepo()).ejecutar(c.req.param("id"), body, cId)
      return c.json(adjunto, 201)
    } catch (err) {
      if (err instanceof HistoriaNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)
