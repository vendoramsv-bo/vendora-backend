import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { TiempoComidaPrismaRepository } from "../infrastructure/tiempo-comida.prisma.repository.js"
import { ListarTiemposComidaUseCase } from "../application/tiempo-comida/listar-tiempos-comida.usecase.js"
import { CrearTiempoComidaUseCase } from "../application/tiempo-comida/crear-tiempo-comida.usecase.js"
import { ActualizarTiempoComidaUseCase } from "../application/tiempo-comida/actualizar-tiempo-comida.usecase.js"
import { EliminarTiempoComidaUseCase } from "../application/tiempo-comida/eliminar-tiempo-comida.usecase.js"
import { TiempoComidaCreateSchema, TiempoComidaUpdateSchema } from "./restaurante.schema.js"
import { TiempoComidaNoEncontrado, TiempoComidaDuplicado, TiempoComidaEnUso } from "../domain/restaurante.errors.js"
import { resolverRestauranteId } from "./restaurante.rest.js"

export const tiempoComidaRouter = new Hono<HonoEnv>()

function makeRepo() {
  return new TiempoComidaPrismaRepository()
}

tiempoComidaRouter.get("/tiempos-comida", async (c) => {
  const tenantId = c.get("tenantId")
  const restauranteId = await resolverRestauranteId(tenantId)
  if (!restauranteId) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)
  const soloActivos = c.req.query("estado") !== "INACTIVO"
  const tiempos = await new ListarTiemposComidaUseCase(makeRepo()).ejecutar(restauranteId, soloActivos)
  return c.json({ data: tiempos.map((t) => t.toJSON()), meta: { total: tiempos.length } })
})

tiempoComidaRouter.post("/tiempos-comida", requireRol(["PROPIETARIO", "ADMIN", "ENCARGADO"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = TiempoComidaCreateSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  const restauranteId = await resolverRestauranteId(tenantId)
  if (!restauranteId) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)
  try {
    const tc = await new CrearTiempoComidaUseCase(makeRepo()).ejecutar({ ...parsed.data, restauranteId }, session.user.id)
    return c.json(tc.toJSON(), 201)
  } catch (err) {
    if (err instanceof TiempoComidaDuplicado) return c.json({ error: err.code, message: err.message }, 409)
    throw err
  }
})

tiempoComidaRouter.get("/tiempos-comida/:id", async (c) => {
  const tenantId = c.get("tenantId")
  const restauranteId = await resolverRestauranteId(tenantId)
  if (!restauranteId) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)
  const repo = makeRepo()
  const tc = await repo.findById(c.req.param("id"), restauranteId)
  if (!tc) return c.json({ error: "TIEMPO_COMIDA_NO_ENCONTRADO" }, 404)
  return c.json(tc.toJSON())
})

tiempoComidaRouter.put("/tiempos-comida/:id", requireRol(["PROPIETARIO", "ADMIN", "ENCARGADO"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = TiempoComidaUpdateSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  const restauranteId = await resolverRestauranteId(tenantId)
  if (!restauranteId) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)
  try {
    const tc = await new ActualizarTiempoComidaUseCase(makeRepo()).ejecutar(c.req.param("id"), restauranteId, parsed.data, session.user.id)
    return c.json(tc.toJSON())
  } catch (err) {
    if (err instanceof TiempoComidaNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof TiempoComidaDuplicado) return c.json({ error: err.code, message: err.message }, 409)
    throw err
  }
})

tiempoComidaRouter.delete("/tiempos-comida/:id", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const restauranteId = await resolverRestauranteId(tenantId)
  if (!restauranteId) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)
  try {
    await new EliminarTiempoComidaUseCase(makeRepo()).ejecutar(c.req.param("id"), restauranteId, session.user.id)
    return c.body(null, 204)
  } catch (err) {
    if (err instanceof TiempoComidaNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof TiempoComidaEnUso) return c.json({ error: err.code, message: err.message }, 409)
    throw err
  }
})
