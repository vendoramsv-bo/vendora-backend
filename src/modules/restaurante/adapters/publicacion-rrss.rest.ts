import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { PublicacionRRSSPrismaRepository } from "../infrastructure/publicacion-rrss.prisma.repository.js"
import { MenuPrismaRepository } from "../infrastructure/menu.prisma.repository.js"
import { ListarPublicacionesUseCase } from "../application/publicacion-rrss/listar-publicaciones.usecase.js"
import { ObtenerPublicacionUseCase } from "../application/publicacion-rrss/obtener-publicacion.usecase.js"
import { ProgramarPublicacionUseCase } from "../application/publicacion-rrss/programar-publicacion.usecase.js"
import { CancelarPublicacionUseCase } from "../application/publicacion-rrss/cancelar-publicacion.usecase.js"
import { PublicacionRRSSCreateSchema } from "./restaurante.schema.js"
import {
  MenuNoEncontrado,
  MenuNoPublicado,
  FechaEnPasado,
  PublicacionNoEncontrada,
  PublicacionYaProcesada,
} from "../domain/restaurante.errors.js"
import { resolverRestauranteId } from "./restaurante.rest.js"

export const publicacionRRSSRouter = new Hono<HonoEnv>()

function makePubRepo() {
  return new PublicacionRRSSPrismaRepository()
}

publicacionRRSSRouter.get("/publicaciones", async (c) => {
  const tenantId = c.get("tenantId")
  const restauranteId = await resolverRestauranteId(tenantId)
  if (!restauranteId) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)

  const q = c.req.query()
  const pubs = await new ListarPublicacionesUseCase(makePubRepo()).ejecutar(restauranteId, {
    redSocial: q.redSocial,
    estado: q.estado,
    page: q.page ? Number(q.page) : undefined,
    limit: q.limit ? Number(q.limit) : undefined,
  })
  return c.json({ data: pubs.map((p) => p.toJSON()), meta: { total: pubs.length } })
})

publicacionRRSSRouter.post("/publicaciones", requireRol(["PROPIETARIO", "ADMIN", "ENCARGADO"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = PublicacionRRSSCreateSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

  const restauranteId = await resolverRestauranteId(tenantId)
  if (!restauranteId) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)

  try {
    const pub = await new ProgramarPublicacionUseCase(makePubRepo(), new MenuPrismaRepository()).ejecutar({
      restauranteId,
      tenantId,
      menuId: parsed.data.menuId,
      redSocial: parsed.data.redSocial,
      fechaProgramada: new Date(parsed.data.fechaProgramada),
      userId: session.user.id,
    })
    return c.json(pub.toJSON(), 201)
  } catch (err) {
    if (err instanceof MenuNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof MenuNoPublicado) return c.json({ error: err.code, message: err.message }, 422)
    if (err instanceof FechaEnPasado) return c.json({ error: err.code, message: err.message }, 422)
    throw err
  }
})

publicacionRRSSRouter.get("/publicaciones/:id", async (c) => {
  const tenantId = c.get("tenantId")
  const restauranteId = await resolverRestauranteId(tenantId)
  if (!restauranteId) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)

  try {
    const pub = await new ObtenerPublicacionUseCase(makePubRepo()).ejecutar(c.req.param("id"), restauranteId)
    return c.json(pub.toJSON())
  } catch (err) {
    if (err instanceof PublicacionNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

publicacionRRSSRouter.delete("/publicaciones/:id", requireRol(["PROPIETARIO", "ADMIN", "ENCARGADO"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const restauranteId = await resolverRestauranteId(tenantId)
  if (!restauranteId) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)

  try {
    await new CancelarPublicacionUseCase(makePubRepo()).ejecutar(c.req.param("id"), restauranteId, session.user.id)
    return c.body(null, 204)
  } catch (err) {
    if (err instanceof PublicacionNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof PublicacionYaProcesada) return c.json({ error: err.code, message: err.message }, 409)
    throw err
  }
})
