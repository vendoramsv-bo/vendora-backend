import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { ActividadEconomicaPrismaRepository } from "../infrastructure/actividad-economica.prisma.repository.js"
import { ListarActividadesUseCase } from "../application/actividad-economica/listar-actividades.usecase.js"
import { CrearActividadUseCase } from "../application/actividad-economica/crear-actividad.usecase.js"
import { DesactivarActividadUseCase } from "../application/actividad-economica/desactivar-actividad.usecase.js"
import { ActividadCreateSchema } from "./catalogo.schema.js"
import { ActividadDuplicada, ActividadNoEncontrada, ActividadEnUso } from "../domain/catalogo.errors.js"
import { getCatalogoNotificador } from "../infrastructure/catalogo.notificador.provider.js"

export const actividadEconomicaRouter = new Hono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() {
  return new ActividadEconomicaPrismaRepository(db)
}

actividadEconomicaRouter.get("/cla-actividades", async (c) => {
  const repo = makeRepo()
  const clasificadores = await repo.listarClasificadores()
  return c.json({ data: clasificadores })
})

actividadEconomicaRouter.get("/actividades", async (c) => {
  const tenantId = c.get("tenantId")
  const resultado = await new ListarActividadesUseCase(makeRepo()).ejecutar(tenantId)
  return c.json({ data: resultado.actividades.map((a) => a.toJSON()) })
})

actividadEconomicaRouter.post("/actividades", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = ActividadCreateSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const actividad = await new CrearActividadUseCase(makeRepo(), getCatalogoNotificador()).ejecutar(
      parsed.data.claActividadId,
      tenantId,
      session.user.id,
    )
    return c.json(actividad.toJSON(), 201)
  } catch (err) {
    if (err instanceof ActividadDuplicada) return c.json({ error: err.code, message: err.message }, 409)
    throw err
  }
})

actividadEconomicaRouter.delete("/actividades/:id", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  try {
    await new DesactivarActividadUseCase(makeRepo()).ejecutar(c.req.param("id"), tenantId, session.user.id)
    return c.json({ ok: true })
  } catch (err) {
    if (err instanceof ActividadNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof ActividadEnUso) return c.json({ error: err.code, message: err.message }, 422)
    throw err
  }
})
