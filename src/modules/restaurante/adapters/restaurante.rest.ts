import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { prismaBase } from "../../../core/prisma-scoped.js"
import { RestaurantePrismaRepository } from "../infrastructure/restaurante.prisma.repository.js"
import { ObtenerRestauranteUseCase } from "../application/restaurante/obtener-restaurante.usecase.js"
import { ActualizarRestauranteUseCase } from "../application/restaurante/actualizar-restaurante.usecase.js"
import { RestaurantePerfilSchema } from "./restaurante.schema.js"
import { RestauranteNoEncontrado } from "../domain/restaurante.errors.js"

export const restaurantePerfilRouter = new Hono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prismaBase as any

function makeRepo() {
  return new RestaurantePrismaRepository()
}

async function resolverRestauranteId(tenantId: string): Promise<string | null> {
  const r = await db.restaurante.findUnique({ where: { tenantId }, select: { id: true } })
  return r?.id ?? null
}

restaurantePerfilRouter.get("/perfil", async (c) => {
  const tenantId = c.get("tenantId")
  try {
    const restaurante = await new ObtenerRestauranteUseCase(makeRepo()).ejecutar(tenantId)
    return c.json(restaurante.toJSON())
  } catch (err) {
    if (err instanceof RestauranteNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

restaurantePerfilRouter.put("/perfil", requireRol(["PROPIETARIO", "ADMIN", "ENCARGADO"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = RestaurantePerfilSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  const restaurante = await new ActualizarRestauranteUseCase(makeRepo()).ejecutar(tenantId, parsed.data, session.user.id)
  return c.json(restaurante.toJSON())
})

export { resolverRestauranteId }
