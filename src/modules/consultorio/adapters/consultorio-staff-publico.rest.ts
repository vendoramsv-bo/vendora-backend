import { Hono } from "hono"
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

export const consultorioStaffPublicoRouter = new Hono<HonoEnv>()
consultorioStaffPublicoRouter.use("*", requireAuth, requireTenantActivo, requireConsultorio)

function makeRepo() { return new ConsultorioPublicoPrismaRepository() }

// POST /api/consultorio/activar-perfil-publico
consultorioStaffPublicoRouter.post("/activar-perfil-publico", async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const resultado = await new ActivarPerfilPublicoConsultorioUseCase(makeRepo()).ejecutar(tenantId, session.user.id)
  return c.json(resultado)
})

// POST /api/consultorio/desactivar-perfil-publico
consultorioStaffPublicoRouter.post("/desactivar-perfil-publico", async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const resultado = await new DesactivarPerfilPublicoConsultorioUseCase(makeRepo()).ejecutar(tenantId, session.user.id)
  return c.json(resultado)
})

// PATCH /api/consultorio/configuracion-publica
consultorioStaffPublicoRouter.patch("/configuracion-publica", async (c) => {
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
})

// PATCH /api/consultorio/medicos/:medicoId/visibilidad
consultorioStaffPublicoRouter.patch("/medicos/:medicoId/visibilidad", async (c) => {
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
})

// PATCH /api/consultorio/servicios/:servicioId/visibilidad
consultorioStaffPublicoRouter.patch("/servicios/:servicioId/visibilidad", async (c) => {
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
})

// GET /api/consultorio/citas-online
consultorioStaffPublicoRouter.get("/citas-online", async (c) => {
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
})

// PATCH /api/consultorio/citas-online/:citaId/confirmar
consultorioStaffPublicoRouter.patch("/citas-online/:citaId/confirmar", async (c) => {
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
})

// PATCH /api/consultorio/citas-online/:citaId/rechazar
consultorioStaffPublicoRouter.patch("/citas-online/:citaId/rechazar", async (c) => {
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
})
