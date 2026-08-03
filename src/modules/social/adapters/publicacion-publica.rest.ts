import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { PublicacionPrismaRepository } from "../infrastructure/publicacion.prisma.repository.js"
import { ListarPublicacionesUseCase } from "../application/publicacion/listar-publicaciones.usecase.js"
import { ObtenerPublicacionUseCase } from "../application/publicacion/obtener-publicacion.usecase.js"
import { PublicacionNoEncontrada } from "../domain/social.errors.js"
import { prismaBase } from "../../../core/prisma-scoped.js"
import { errorResponses, okResponse } from "../../../core/openapi-responses.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prismaBase as any

function makeRepo() { return new PublicacionPrismaRepository() }

async function resolveSlugTenantId(slug: string): Promise<string | null> {
  // Un comercio con la creacion incompleta no resuelve: sus publicaciones no son
  // publicas hasta que el wizard llega a FINALIZADO (FR-049).
  const t = await db.tenant.findFirst({ where: { slug, estado: "FINALIZADO" }, select: { id: true } })
  return t?.id ?? null
}

export const publicacionPublicaRouter = new OpenAPIHono<HonoEnv>()

publicacionPublicaRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/publicaciones",
    operationId: "social_publica_listar_publicaciones",
    tags: ["Social"],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      200: okResponse("Publicaciones públicas", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = await resolveSlugTenantId(c.req.param("slug"))
    if (!tenantId) return c.json({ error: "TIENDA_NO_ENCONTRADA" }, 404)

    const q = c.req.query()
    const take = Math.min(Number(q.take ?? 20), 100)
    const page = Number(q.page ?? 1)
    const order = (q.order === "asc" ? "asc" : "desc") as "asc" | "desc"

    const result = await new ListarPublicacionesUseCase(makeRepo()).ejecutar(
      tenantId,
      { take, page, order, etiqueta: q.etiqueta },
      true,
    )
    return c.json(result)
  },
)

publicacionPublicaRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/publicaciones/{id}",
    operationId: "social_publica_obtener_publicacion",
    tags: ["Social"],
    request: { params: z.object({ slug: z.string(), id: z.string() }) },
    responses: {
      200: okResponse("Publicación pública", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = await resolveSlugTenantId(c.req.param("slug"))
    if (!tenantId) return c.json({ error: "TIENDA_NO_ENCONTRADA" }, 404)

    try {
      const result = await new ObtenerPublicacionUseCase(makeRepo()).ejecutar(c.req.param("id"), true)
      return c.json(result)
    } catch (err) {
      if (err instanceof PublicacionNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)
