import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { AtencionMedicaPrismaRepository } from "../infrastructure/atencion-medica.prisma.repository.js"
import { getConsultorioNotificador } from "../infrastructure/consultorio.notificador.provider.js"
import { VentaServiceAdapter } from "../infrastructure/venta.service.adapter.js"
import { CrearAtencionUseCase } from "../application/atencion-medica/crear-atencion.usecase.js"
import { ListarAtencionesUseCase } from "../application/atencion-medica/listar-atenciones.usecase.js"
import { ObtenerAtencionUseCase } from "../application/atencion-medica/obtener-atencion.usecase.js"
import { RegistrarPagoUseCase } from "../application/atencion-medica/registrar-pago.usecase.js"
import { AnularAtencionUseCase } from "../application/atencion-medica/anular-atencion.usecase.js"
import { AtencionCreateSchema, PagoAtencionBodySchema, QueryParamsConsultorioSchema } from "./consultorio.schema.js"
import { AtencionNoEncontrada, PagoExcedeTotalError, AtencionYaPagada } from "../domain/consultorio.errors.js"
import { paginate } from "../../../core/query-params.js"

export const atencionMedicaRouter = new Hono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() { return new AtencionMedicaPrismaRepository(db) }

async function getConsultorioId(tenantId: string): Promise<string | null> {
  const r = await db.consultorio.findUnique({ where: { tenantId }, select: { id: true } })
  return r?.id ?? null
}

atencionMedicaRouter.get("/atenciones", async (c) => {
  const cId = await getConsultorioId(c.get("tenantId"))
  if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
  const params = QueryParamsConsultorioSchema.parse(c.req.query())
  const resultado = await new ListarAtencionesUseCase(makeRepo()).ejecutar(cId, params)
  return c.json(paginate(resultado.data.map((a) => a.toJSON()), resultado.total, params))
})

atencionMedicaRouter.post("/atenciones", async (c) => {
  const session = c.get("session")
  const tenantId = c.get("tenantId")
  const cId = await getConsultorioId(tenantId)
  if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
  const body = await c.req.json()
  const parsed = AtencionCreateSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  const atencion = await new CrearAtencionUseCase(makeRepo(), getConsultorioNotificador()).ejecutar(parsed.data, cId, session.user.id, tenantId)
  return c.json(atencion.toJSON(), 201)
})

atencionMedicaRouter.get("/atenciones/:id", async (c) => {
  const cId = await getConsultorioId(c.get("tenantId"))
  if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
  try {
    const a = await new ObtenerAtencionUseCase(makeRepo()).ejecutar(c.req.param("id"), cId)
    return c.json(a.toJSON())
  } catch (err) {
    if (err instanceof AtencionNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

atencionMedicaRouter.patch("/atenciones/:id", async (c) => {
  const session = c.get("session")
  const cId = await getConsultorioId(c.get("tenantId"))
  if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
  const body = await c.req.json()
  try {
    const repo = makeRepo()
    await repo.obtener(c.req.param("id"), cId)
    const a = await repo.actualizarEstado(c.req.param("id"), body.estado ?? "EN_CURSO", body.estadoPago ?? "PENDIENTE", session.user.id)
    return c.json(a.toJSON())
  } catch (err) {
    if (err instanceof AtencionNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

atencionMedicaRouter.post("/atenciones/:id/pagos", async (c) => {
  const session = c.get("session")
  const tenantId = c.get("tenantId")
  const cId = await getConsultorioId(tenantId)
  if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
  const body = await c.req.json()
  const parsed = PagoAtencionBodySchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const ventaService = new VentaServiceAdapter(db)
    const a = await new RegistrarPagoUseCase(makeRepo(), getConsultorioNotificador(), ventaService).ejecutar(
      c.req.param("id"), parsed.data, session.user.id, cId, tenantId,
    )
    return c.json(a.toJSON())
  } catch (err) {
    if (err instanceof AtencionNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof PagoExcedeTotalError) return c.json({ error: err.code, message: err.message }, 422)
    throw err
  }
})

atencionMedicaRouter.post("/atenciones/:id/anular", async (c) => {
  const session = c.get("session")
  const tenantId = c.get("tenantId")
  const cId = await getConsultorioId(tenantId)
  if (!cId) return c.json({ error: "CONSULTORIO_NO_ENCONTRADO" }, 404)
  try {
    const a = await new AnularAtencionUseCase(makeRepo(), getConsultorioNotificador()).ejecutar(
      c.req.param("id"), session.user.id, cId, tenantId,
    )
    return c.json(a.toJSON())
  } catch (err) {
    if (err instanceof AtencionNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof AtencionYaPagada) return c.json({ error: err.code, message: err.message }, 409)
    throw err
  }
})
