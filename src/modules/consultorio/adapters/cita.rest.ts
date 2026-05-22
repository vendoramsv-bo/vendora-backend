import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { CitaPrismaRepository } from "../infrastructure/cita.prisma.repository.js"
import { getConsultorioNotificador } from "../infrastructure/consultorio.notificador.provider.js"
import { CrearCitaUseCase } from "../application/cita/crear-cita.usecase.js"
import { ListarCitasUseCase } from "../application/cita/listar-citas.usecase.js"
import { ObtenerCitaUseCase } from "../application/cita/obtener-cita.usecase.js"
import { ConfirmarCitaUseCase } from "../application/cita/confirmar-cita.usecase.js"
import { CancelarCitaUseCase } from "../application/cita/cancelar-cita.usecase.js"
import { MarcarNoAsistioUseCase } from "../application/cita/marcar-no-asistio.usecase.js"
import { CitaCreateSchema, QueryParamsConsultorioSchema } from "./consultorio.schema.js"
import { CitaNoEncontrada, CitaSolapada, CitaNoConfirmable, CitaYaAtendida } from "../domain/consultorio.errors.js"
import { paginate } from "../../../core/query-params.js"

export const citaRouter = new Hono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() { return new CitaPrismaRepository(db) }

async function getConsultorioId(tenantId: string): Promise<string | null> {
  const r = await db.consultorio.findUnique({ where: { tenantId }, select: { id: true } })
  return r?.id ?? null
}

citaRouter.get("/citas", async (c) => {
  const cId = await getConsultorioId(c.get("tenantId"))
  if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
  const params = QueryParamsConsultorioSchema.parse(c.req.query())
  const resultado = await new ListarCitasUseCase(makeRepo()).ejecutar(cId, params)
  return c.json(paginate(resultado.data.map((c2) => c2.toJSON()), resultado.total, params))
})

citaRouter.post("/citas", async (c) => {
  const session = c.get("session")
  const tenantId = c.get("tenantId")
  const cId = await getConsultorioId(tenantId)
  if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
  const body = await c.req.json()
  const parsed = CitaCreateSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const cita = await new CrearCitaUseCase(makeRepo(), getConsultorioNotificador()).ejecutar(
      { ...parsed.data, fechaHora: new Date(parsed.data.fechaHora) },
      cId,
      session.user.id,
      tenantId,
    )
    return c.json(cita.toJSON(), 201)
  } catch (err) {
    if (err instanceof CitaSolapada) return c.json({ error: err.code, message: err.message }, 409)
    throw err
  }
})

citaRouter.get("/citas/:id", async (c) => {
  const cId = await getConsultorioId(c.get("tenantId"))
  if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
  try {
    const cita = await new ObtenerCitaUseCase(makeRepo()).ejecutar(c.req.param("id"), cId)
    return c.json(cita.toJSON())
  } catch (err) {
    if (err instanceof CitaNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

citaRouter.post("/citas/:id/confirmar", async (c) => {
  const session = c.get("session")
  const tenantId = c.get("tenantId")
  const cId = await getConsultorioId(tenantId)
  if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
  try {
    const cita = await new ConfirmarCitaUseCase(makeRepo(), getConsultorioNotificador()).ejecutar(
      c.req.param("id"), cId, session.user.id, tenantId,
    )
    return c.json(cita.toJSON())
  } catch (err) {
    if (err instanceof CitaNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof CitaNoConfirmable) return c.json({ error: err.code, message: err.message }, 409)
    throw err
  }
})

citaRouter.post("/citas/:id/cancelar", async (c) => {
  const session = c.get("session")
  const tenantId = c.get("tenantId")
  const cId = await getConsultorioId(tenantId)
  if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
  try {
    const cita = await new CancelarCitaUseCase(makeRepo(), getConsultorioNotificador()).ejecutar(
      c.req.param("id"), cId, session.user.id, tenantId,
    )
    return c.json(cita.toJSON())
  } catch (err) {
    if (err instanceof CitaNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof CitaYaAtendida) return c.json({ error: err.code, message: err.message }, 409)
    throw err
  }
})

citaRouter.post("/citas/:id/no-asistio", async (c) => {
  const session = c.get("session")
  const tenantId = c.get("tenantId")
  const cId = await getConsultorioId(tenantId)
  if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
  try {
    const cita = await new MarcarNoAsistioUseCase(makeRepo(), getConsultorioNotificador()).ejecutar(
      c.req.param("id"), cId, session.user.id, tenantId,
    )
    return c.json(cita.toJSON())
  } catch (err) {
    if (err instanceof CitaNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof CitaYaAtendida) return c.json({ error: err.code, message: err.message }, 409)
    throw err
  }
})
