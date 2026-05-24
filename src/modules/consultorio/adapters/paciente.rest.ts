import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { PacientePrismaRepository } from "../infrastructure/paciente.prisma.repository.js"
import { CrearPacienteUseCase } from "../application/paciente/crear-paciente.usecase.js"
import { ListarPacientesUseCase } from "../application/paciente/listar-pacientes.usecase.js"
import { ObtenerPacienteUseCase } from "../application/paciente/obtener-paciente.usecase.js"
import { ActualizarPacienteUseCase } from "../application/paciente/actualizar-paciente.usecase.js"
import { PacienteCreateSchema, PacienteUpdateWithDniSchema, VacunacionSchema, QueryParamsConsultorioSchema } from "./consultorio.schema.js"
import { PacienteNoEncontrado, PacienteEmailDuplicado, DNIYaRegistrado } from "../domain/consultorio.errors.js"
import { paginate } from "../../../core/query-params.js"

export const pacienteRouter = new Hono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() { return new PacientePrismaRepository(db) }

async function getConsultorioId(tenantId: string): Promise<string | null> {
  const r = await db.consultorio.findUnique({ where: { tenantId }, select: { id: true } })
  return r?.id ?? null
}

pacienteRouter.get("/pacientes", async (c) => {
  const cId = await getConsultorioId(c.get("tenantId"))
  if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
  const params = QueryParamsConsultorioSchema.parse(c.req.query())
  const resultado = await new ListarPacientesUseCase(makeRepo()).ejecutar(cId, params)
  return c.json(paginate(resultado.data.map((p) => p.toJSON()), resultado.total, params))
})

pacienteRouter.post("/pacientes", async (c) => {
  const session = c.get("session")
  const cId = await getConsultorioId(c.get("tenantId"))
  if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
  const body = await c.req.json()
  const parsed = PacienteCreateSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const paciente = await new CrearPacienteUseCase(makeRepo()).ejecutar(parsed.data, cId, session.user.id)
    return c.json(paciente.toJSON(), 201)
  } catch (err) {
    if (err instanceof PacienteEmailDuplicado) return c.json({ error: err.code, message: err.message }, 409)
    if (err instanceof DNIYaRegistrado) return c.json({ error: err.code, message: err.message, statusCode: 409 }, 409)
    throw err
  }
})

pacienteRouter.get("/pacientes/:id", async (c) => {
  const cId = await getConsultorioId(c.get("tenantId"))
  if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
  try {
    const p = await new ObtenerPacienteUseCase(makeRepo()).ejecutar(c.req.param("id"), cId)
    return c.json(p.toJSON())
  } catch (err) {
    if (err instanceof PacienteNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

pacienteRouter.put("/pacientes/:id", async (c) => {
  const session = c.get("session")
  const cId = await getConsultorioId(c.get("tenantId"))
  if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
  const body = await c.req.json()
  const parsed = PacienteUpdateWithDniSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const { fechaNacimiento, ...rest } = parsed.data
    const data = { ...rest, ...(fechaNacimiento ? { fechaNacimiento: new Date(fechaNacimiento) } : {}) }
    const p = await new ActualizarPacienteUseCase(makeRepo()).ejecutar(c.req.param("id"), data, session.user.id, cId)
    return c.json(p.toJSON())
  } catch (err) {
    if (err instanceof PacienteNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof DNIYaRegistrado) return c.json({ error: err.code, message: err.message, statusCode: 409 }, 409)
    throw err
  }
})

pacienteRouter.get("/pacientes/:id/vacunaciones", async (c) => {
  const cId = await getConsultorioId(c.get("tenantId"))
  if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
  try {
    await new ObtenerPacienteUseCase(makeRepo()).ejecutar(c.req.param("id"), cId)
    const vacunas = await makeRepo().listarVacunaciones(c.req.param("id"))
    return c.json({ data: vacunas })
  } catch (err) {
    if (err instanceof PacienteNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

pacienteRouter.post("/pacientes/:id/vacunaciones", async (c) => {
  const cId = await getConsultorioId(c.get("tenantId"))
  if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
  const body = await c.req.json()
  const parsed = VacunacionSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    await new ObtenerPacienteUseCase(makeRepo()).ejecutar(c.req.param("id"), cId)
    const vac = await makeRepo().registrarVacunacion(c.req.param("id"), parsed.data)
    return c.json(vac, 201)
  } catch (err) {
    if (err instanceof PacienteNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})
