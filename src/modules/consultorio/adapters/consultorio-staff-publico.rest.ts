import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import { requireAuth, requireTenantActivo, requireConsultorio, type HonoEnv } from "../../../core/hono-context.js"
import { ConsultorioPublicoPrismaRepository } from "../infrastructure/consultorio-publico.prisma.repository.js"
import { getConsultorioPublicoNotificador } from "../infrastructure/consultorio-publico.notificador.provider.js"
import { ActivarPerfilPublicoConsultorioUseCase } from "../application/perfil-publico/activar-perfil-publico.usecase.js"
import { DesactivarPerfilPublicoConsultorioUseCase } from "../application/perfil-publico/desactivar-perfil-publico.usecase.js"
import { ActualizarConfiguracionPublicaConsultorioUseCase } from "../application/perfil-publico/actualizar-configuracion-publica.usecase.js"
import {
  ActualizarConfiguracionPublicaBodySchema,
  VisibilidadMedicoBodySchema,
  VisibilidadServicioBodySchema,
  CitasOnlineQuerySchema,
  RechazarCitaBodySchema,
} from "./consultorio.schema.js"
import { ConsultorioNoEncontradoError, SlotNoDisponibleError } from "../domain/consultorio-publico.errors.js"
import { errorResponses, okResponse } from "../../../core/openapi-responses.js"

export const consultorioStaffPublicoRouter = new OpenAPIHono<HonoEnv>()
consultorioStaffPublicoRouter.use("*", requireAuth, requireTenantActivo, requireConsultorio)

function makeRepo() { return new ConsultorioPublicoPrismaRepository() }

consultorioStaffPublicoRouter.openapi(
  createRoute({
    method: "post",
    path: "/activar-perfil-publico",
    operationId: "consultorio_staff_activar_perfil_publico",
    tags: ["Consultorio Público"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Perfil público activado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const resultado = await new ActivarPerfilPublicoConsultorioUseCase(makeRepo()).ejecutar(tenantId, session.user.id)
    return c.json(resultado)
  },
)

consultorioStaffPublicoRouter.openapi(
  createRoute({
    method: "post",
    path: "/desactivar-perfil-publico",
    operationId: "consultorio_staff_desactivar_perfil_publico",
    tags: ["Consultorio Público"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Perfil público desactivado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const resultado = await new DesactivarPerfilPublicoConsultorioUseCase(makeRepo()).ejecutar(tenantId, session.user.id)
    return c.json(resultado)
  },
)

consultorioStaffPublicoRouter.openapi(
  createRoute({
    method: "patch",
    path: "/configuracion-publica",
    operationId: "consultorio_staff_actualizar_configuracion_publica",
    tags: ["Consultorio Público"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Configuración pública actualizada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const session = c.get("session")
    const body = await c.req.json()
    const parsed = ActualizarConfiguracionPublicaBodySchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

    try {
      const tenant = await import("../../../modules/autenticacion/infrastructure/better-auth.setup.js")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tenantData = await (tenant.prisma as any).tenant.findUnique({
        where: { id: c.get("tenantId") }, select: { slug: true },
      })
      const resultado = await new ActualizarConfiguracionPublicaConsultorioUseCase(makeRepo(), getConsultorioPublicoNotificador()).ejecutar(
        tenantData.slug, parsed.data, session.user.id,
      )
      return c.json(resultado)
    } catch (err) {
      if (err instanceof ConsultorioNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

consultorioStaffPublicoRouter.openapi(
  createRoute({
    method: "patch",
    path: "/medicos/{medicoId}/visibilidad",
    operationId: "consultorio_staff_visibilidad_medico",
    tags: ["Consultorio Público"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ medicoId: z.string() }) },
    responses: {
      200: okResponse("Visibilidad de médico actualizada", z.object({ ok: z.boolean() })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const body = await c.req.json()
    const parsed = VisibilidadMedicoBodySchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

    const tenantId = c.get("tenantId")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { prisma } = await import("../../../modules/autenticacion/infrastructure/better-auth.setup.js")
    const consultorio = await (prisma as any).consultorio.findUnique({ where: { tenantId }, select: { id: true } })
    if (!consultorio) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)

    await makeRepo().setVisibilidadMedico(c.req.param("medicoId"), consultorio.id, parsed.data.visiblePublico)
    return c.json({ ok: true })
  },
)

consultorioStaffPublicoRouter.openapi(
  createRoute({
    method: "patch",
    path: "/servicios/{servicioId}/visibilidad",
    operationId: "consultorio_staff_visibilidad_servicio",
    tags: ["Consultorio Público"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ servicioId: z.string() }) },
    responses: {
      200: okResponse("Visibilidad de servicio actualizada", z.object({ ok: z.boolean() })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const body = await c.req.json()
    const parsed = VisibilidadServicioBodySchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

    const tenantId = c.get("tenantId")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { prisma } = await import("../../../modules/autenticacion/infrastructure/better-auth.setup.js")
    const consultorio = await (prisma as any).consultorio.findUnique({ where: { tenantId }, select: { id: true } })
    if (!consultorio) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)

    await makeRepo().setVisibilidadServicio(c.req.param("servicioId"), consultorio.id, parsed.data.visiblePublico, parsed.data.mostrarPrecio)
    return c.json({ ok: true })
  },
)

consultorioStaffPublicoRouter.openapi(
  createRoute({
    method: "get",
    path: "/citas-online",
    operationId: "consultorio_staff_listar_citas_online",
    tags: ["Consultorio Público"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Citas online del consultorio", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const q = c.req.query()
    const parsed = CitasOnlineQuerySchema.safeParse(q)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

    const tenantId = c.get("tenantId")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { prisma } = await import("../../../modules/autenticacion/infrastructure/better-auth.setup.js")
    const consultorio = await (prisma as any).consultorio.findUnique({ where: { tenantId }, select: { id: true } })
    if (!consultorio) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)

    const resultado = await makeRepo().listarCitasOnline(consultorio.id, parsed.data)
    return c.json(resultado)
  },
)

consultorioStaffPublicoRouter.openapi(
  createRoute({
    method: "patch",
    path: "/citas-online/{citaId}/confirmar",
    operationId: "consultorio_staff_confirmar_cita_online",
    tags: ["Consultorio Público"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ citaId: z.string() }) },
    responses: {
      200: okResponse("Cita confirmada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { prisma } = await import("../../../modules/autenticacion/infrastructure/better-auth.setup.js")
    const consultorio = await (prisma as any).consultorio.findUnique({ where: { tenantId }, select: { id: true } })
    if (!consultorio) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)

    try {
      const cita = await makeRepo().confirmarCitaOnline(c.req.param("citaId"), consultorio.id)
      return c.json(cita)
    } catch (err) {
      if (err instanceof SlotNoDisponibleError) return c.json({ error: err.code, message: err.message }, 409)
      throw err
    }
  },
)

consultorioStaffPublicoRouter.openapi(
  createRoute({
    method: "patch",
    path: "/citas-online/{citaId}/rechazar",
    operationId: "consultorio_staff_rechazar_cita_online",
    tags: ["Consultorio Público"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ citaId: z.string() }) },
    responses: {
      200: okResponse("Cita rechazada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const body = await c.req.json()
    const parsed = RechazarCitaBodySchema.safeParse(body)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

    const tenantId = c.get("tenantId")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { prisma } = await import("../../../modules/autenticacion/infrastructure/better-auth.setup.js")
    const consultorio = await (prisma as any).consultorio.findUnique({ where: { tenantId }, select: { id: true } })
    if (!consultorio) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)

    const cita = await makeRepo().rechazarCitaOnline(c.req.param("citaId"), consultorio.id, parsed.data.motivo)
    return c.json(cita)
  },
)
