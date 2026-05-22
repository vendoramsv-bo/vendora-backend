import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { RecetaMedicaPrismaRepository } from "../infrastructure/receta-medica.prisma.repository.js"
import { getConsultorioNotificador } from "../infrastructure/consultorio.notificador.provider.js"
import { CrearRecetaUseCase } from "../application/receta-medica/crear-receta.usecase.js"
import { ListarRecetasUseCase } from "../application/receta-medica/listar-recetas.usecase.js"
import { ObtenerRecetaUseCase } from "../application/receta-medica/obtener-receta.usecase.js"
import { AnularRecetaUseCase } from "../application/receta-medica/anular-receta.usecase.js"
import { RecetaCreateSchema, QueryParamsConsultorioSchema } from "./consultorio.schema.js"
import { RecetaNoEncontrada, RecetaDespachada } from "../domain/consultorio.errors.js"
import { paginate } from "../../../core/query-params.js"

export const recetaMedicaRouter = new Hono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() { return new RecetaMedicaPrismaRepository(db) }

async function getConsultorioId(tenantId: string): Promise<string | null> {
  const r = await db.consultorio.findUnique({ where: { tenantId }, select: { id: true } })
  return r?.id ?? null
}

recetaMedicaRouter.get("/recetas", async (c) => {
  const cId = await getConsultorioId(c.get("tenantId"))
  if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
  const params = QueryParamsConsultorioSchema.parse(c.req.query())
  const resultado = await new ListarRecetasUseCase(makeRepo()).ejecutar(cId, params)
  return c.json(paginate(resultado.data.map((r) => r.toJSON()), resultado.total, params))
})

recetaMedicaRouter.post("/recetas", async (c) => {
  const session = c.get("session")
  const tenantId = c.get("tenantId")
  const cId = await getConsultorioId(tenantId)
  if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
  const body = await c.req.json()
  const parsed = RecetaCreateSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  const atencion = await db.atencionMedica.findFirst({ where: { id: parsed.data.atencionId, consultorioId: cId }, select: { pacienteId: true, medicoId: true } })
  if (!atencion) return c.json({ error: "ATENCION_NO_ENCONTRADA" }, 404)
  const { fechaVencimiento: fvStr, ...restParsed } = parsed.data
  const recetaData = { ...restParsed, pacienteId: atencion.pacienteId, medicoId: atencion.medicoId, ...(fvStr ? { fechaVencimiento: new Date(fvStr) } : {}) }
  const receta = await new CrearRecetaUseCase(makeRepo(), getConsultorioNotificador()).ejecutar(recetaData, cId, session.user.id, tenantId)
  return c.json(receta.toJSON(), 201)
})

recetaMedicaRouter.get("/recetas/:id", async (c) => {
  const cId = await getConsultorioId(c.get("tenantId"))
  if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
  try {
    const r = await new ObtenerRecetaUseCase(makeRepo()).ejecutar(c.req.param("id"), cId)
    return c.json(r.toJSON())
  } catch (err) {
    if (err instanceof RecetaNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

recetaMedicaRouter.post("/recetas/:id/anular", async (c) => {
  const session = c.get("session")
  const tenantId = c.get("tenantId")
  const cId = await getConsultorioId(tenantId)
  if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
  try {
    const r = await new AnularRecetaUseCase(makeRepo(), getConsultorioNotificador()).ejecutar(c.req.param("id"), session.user.id, cId, tenantId)
    return c.json(r.toJSON())
  } catch (err) {
    if (err instanceof RecetaNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof RecetaDespachada) return c.json({ error: err.code, message: err.message }, 422)
    throw err
  }
})
