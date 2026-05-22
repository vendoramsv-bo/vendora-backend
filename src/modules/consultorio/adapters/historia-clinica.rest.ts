import { Hono } from "hono"
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
import { HistoriaCreateSchema, HistoriaUpdateSchema, QueryParamsConsultorioSchema } from "./consultorio.schema.js"
import { HistoriaNoEncontrada } from "../domain/consultorio.errors.js"
import { paginate } from "../../../core/query-params.js"
import type { ExtensionTipo } from "../domain/ports/IHistoriaClinicaRepository.js"

export const historiaClinicaRouter = new Hono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() { return new HistoriaClinicaPrismaRepository(db) }

async function getConsultorioId(tenantId: string): Promise<string | null> {
  const r = await db.consultorio.findUnique({ where: { tenantId }, select: { id: true } })
  return r?.id ?? null
}

historiaClinicaRouter.get("/historias", async (c) => {
  const cId = await getConsultorioId(c.get("tenantId"))
  if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
  const params = QueryParamsConsultorioSchema.parse(c.req.query())
  const resultado = await new ListarHistoriasUseCase(makeRepo()).ejecutar(cId, params)
  return c.json(paginate(resultado.data.map((h) => h.toJSON()), resultado.total, params))
})

historiaClinicaRouter.post("/historias", async (c) => {
  const session = c.get("session")
  const cId = await getConsultorioId(c.get("tenantId"))
  if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
  const body = await c.req.json()
  const parsed = HistoriaCreateSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  const { fecha, ...restData } = parsed.data
  const historia = await new CrearHistoriaUseCase(makeRepo()).ejecutar(
    { ...restData, ...(fecha ? { fecha: new Date(fecha) } : {}) }, cId, session.user.id,
  )
  return c.json(historia.toJSON(), 201)
})

historiaClinicaRouter.get("/historias/:id", async (c) => {
  const cId = await getConsultorioId(c.get("tenantId"))
  if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
  try {
    const h = await new ObtenerHistoriaUseCase(makeRepo()).ejecutar(c.req.param("id"), cId)
    return c.json(h.toJSON())
  } catch (err) {
    if (err instanceof HistoriaNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

historiaClinicaRouter.put("/historias/:id", async (c) => {
  const session = c.get("session")
  const cId = await getConsultorioId(c.get("tenantId"))
  if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
  const body = await c.req.json()
  const parsed = HistoriaUpdateSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const { fecha: fechaStr, ...restUpdate } = parsed.data
    const updateData = { ...restUpdate, ...(fechaStr ? { fecha: new Date(fechaStr) } : {}) }
    const h = await new ActualizarHistoriaUseCase(makeRepo()).ejecutar(c.req.param("id"), updateData, session.user.id, cId)
    return c.json(h.toJSON())
  } catch (err) {
    if (err instanceof HistoriaNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

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

historiaClinicaRouter.put("/historias/:id/odontologia", extensionHandler("odontologia"))
historiaClinicaRouter.put("/historias/:id/pediatria", extensionHandler("pediatria"))
historiaClinicaRouter.put("/historias/:id/general", extensionHandler("general"))
historiaClinicaRouter.put("/historias/:id/perinatal", extensionHandler("perinatal"))

historiaClinicaRouter.post("/historias/:id/perinatal/controles", async (c) => {
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
})

historiaClinicaRouter.post("/historias/:id/adjuntos", async (c) => {
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
})
