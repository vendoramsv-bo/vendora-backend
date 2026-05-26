import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { PublicacionPrismaRepository } from "../infrastructure/publicacion.prisma.repository.js"
import { ListarPublicacionesUseCase } from "../application/publicacion/listar-publicaciones.usecase.js"
import { ObtenerPublicacionUseCase } from "../application/publicacion/obtener-publicacion.usecase.js"
import { PublicacionNoEncontrada } from "../domain/social.errors.js"
import { prismaBase } from "../../../core/prisma-scoped.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prismaBase as any

function makeRepo() { return new PublicacionPrismaRepository() }

async function resolveSlugTenantId(slug: string): Promise<string | null> {
  const t = await db.tenant.findUnique({ where: { slug }, select: { id: true } })
  return t?.id ?? null
}

export const publicacionPublicaRouter = new Hono<HonoEnv>()

publicacionPublicaRouter.get("/:slug/publicaciones", async (c) => {
  const tenantId = await resolveSlugTenantId(c.req.param("slug"))
  if (!tenantId) return c.json({ error: "TIENDA_NO_ENCONTRADA" }, 404)

  const q = c.req.query()
  const take = Math.min(Number(q.take ?? 20), 100)
  const skip = Number(q.skip ?? 0)
  const order = (q.order === "asc" ? "asc" : "desc") as "asc" | "desc"

  const result = await new ListarPublicacionesUseCase(makeRepo()).ejecutar(
    tenantId,
    { take, skip, order, etiqueta: q.etiqueta },
    true,
  )
  return c.json({ data: result.data, meta: { total: result.total, hasMore: skip + result.data.length < result.total } })
})

publicacionPublicaRouter.get("/:slug/publicaciones/:id", async (c) => {
  const tenantId = await resolveSlugTenantId(c.req.param("slug"))
  if (!tenantId) return c.json({ error: "TIENDA_NO_ENCONTRADA" }, 404)

  try {
    const result = await new ObtenerPublicacionUseCase(makeRepo()).ejecutar(c.req.param("id"), true)
    return c.json(result)
  } catch (err) {
    if (err instanceof PublicacionNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})
