import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { ServicioMedicoPrismaRepository } from "../infrastructure/servicio-medico.prisma.repository.js"
import { CrearServicioUseCase } from "../application/servicio-medico/crear-servicio.usecase.js"
import { ListarServiciosUseCase } from "../application/servicio-medico/listar-servicios.usecase.js"
import { ObtenerServicioUseCase } from "../application/servicio-medico/obtener-servicio.usecase.js"
import { ActualizarServicioUseCase } from "../application/servicio-medico/actualizar-servicio.usecase.js"
import { ServicioBaseSchema, ServicioUpdateSchema, QueryParamsConsultorioSchema } from "./consultorio.schema.js"
import { ServicioNoEncontrado, ServicioNombreDuplicado, ServicioEnUso } from "../domain/consultorio.errors.js"
import { paginate } from "../../../core/query-params.js"
import { requireRol } from "../../../core/hono-context.js"

export const servicioMedicoRouter = new Hono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() { return new ServicioMedicoPrismaRepository(db) }

async function getConsultorioId(tenantId: string): Promise<string | null> {
  const r = await db.consultorio.findUnique({ where: { tenantId }, select: { id: true } })
  return r?.id ?? null
}

servicioMedicoRouter.get("/servicios", async (c) => {
  const cId = await getConsultorioId(c.get("tenantId"))
  if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
  const params = QueryParamsConsultorioSchema.parse(c.req.query())
  const resultado = await new ListarServiciosUseCase(makeRepo()).ejecutar(cId, params)
  return c.json(paginate(resultado.data.map((s) => s.toJSON()), resultado.total, params))
})

servicioMedicoRouter.post("/servicios", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const session = c.get("session")
  const cId = await getConsultorioId(c.get("tenantId"))
  if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
  const body = await c.req.json()
  const parsed = ServicioBaseSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const servicio = await new CrearServicioUseCase(makeRepo()).ejecutar(parsed.data, cId, session.user.id)
    return c.json(servicio.toJSON(), 201)
  } catch (err) {
    if (err instanceof ServicioNombreDuplicado) return c.json({ error: err.code, message: err.message }, 409)
    throw err
  }
})

servicioMedicoRouter.get("/servicios/:id", async (c) => {
  const cId = await getConsultorioId(c.get("tenantId"))
  if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
  try {
    const s = await new ObtenerServicioUseCase(makeRepo()).ejecutar(c.req.param("id"), cId)
    return c.json(s.toJSON())
  } catch (err) {
    if (err instanceof ServicioNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

servicioMedicoRouter.put("/servicios/:id", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const session = c.get("session")
  const cId = await getConsultorioId(c.get("tenantId"))
  if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
  const body = await c.req.json()
  const parsed = ServicioUpdateSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const s = await new ActualizarServicioUseCase(makeRepo()).ejecutar(c.req.param("id"), parsed.data, session.user.id, cId)
    return c.json(s.toJSON())
  } catch (err) {
    if (err instanceof ServicioNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof ServicioEnUso) return c.json({ error: err.code, message: err.message }, 409)
    throw err
  }
})
