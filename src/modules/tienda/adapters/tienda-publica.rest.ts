import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { TiendaPrismaRepository } from "../infrastructure/tienda.prisma.repository.js"
import { ObtenerPerfilPublicoUseCase } from "../application/perfil/obtener-perfil-publico.usecase.js"
import { ListarDirectorioUseCase } from "../application/directorio/listar-directorio.usecase.js"
import { ListarCatalogoPublicoUseCase } from "../application/directorio/listar-catalogo-publico.usecase.js"
import { DirectorioQuerySchema, CatalogoPublicoQuerySchema } from "./tienda.schema.js"
import { TiendaNoEncontradaError } from "../domain/tienda.errors.js"
import { makeQueryParamsSchema } from "../../../core/query-params.js"
import { errorResponses, okResponse } from "../../../core/openapi-responses.js"

export const tiendaPublicaRouter = new OpenAPIHono()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any
function makeRepo() { return new TiendaPrismaRepository(db) }

const CatalogoQuerySchema = makeQueryParamsSchema(["nombre", "precio", "createdAt"])

// GET /public/tiendas — directorio sin auth
tiendaPublicaRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    operationId: "tienda_publico_listar_directorio",
    tags: ["Tienda Pública"],
    request: {
      query: DirectorioQuerySchema,
    },
    responses: {
      200: okResponse("Directorio de tiendas", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const query = DirectorioQuerySchema.safeParse(c.req.query())
    if (!query.success) return c.json({ error: "VALIDACION", details: query.error.flatten() }, 400)
    const result = await new ListarDirectorioUseCase(makeRepo()).execute(query.data)
    return c.json(result)
  },
)

// GET /public/tiendas/:slug — perfil completo sin auth
tiendaPublicaRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}",
    operationId: "tienda_publico_get_perfil",
    tags: ["Tienda Pública"],
    request: {
      params: z.object({ slug: z.string() }),
    },
    responses: {
      200: okResponse("Perfil público de la tienda", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    try {
      const result = await new ObtenerPerfilPublicoUseCase(makeRepo()).execute(c.req.param("slug"))
      return c.json(result)
    } catch (err) {
      if (err instanceof TiendaNoEncontradaError) return c.json({ error: "NOT_FOUND" }, 404)
      throw err
    }
  },
)

// GET /public/tiendas/:slug/productos — catálogo público sin auth
tiendaPublicaRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/productos",
    operationId: "tienda_publico_listar_catalogo",
    tags: ["Tienda Pública"],
    request: {
      params: z.object({ slug: z.string() }),
      query: CatalogoPublicoQuerySchema,
    },
    responses: {
      200: okResponse("Catálogo público de la tienda", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const params = CatalogoQuerySchema.parse(c.req.query())
    const result = await new ListarCatalogoPublicoUseCase(makeRepo()).execute(c.req.param("slug"), params)
    return c.json(result)
  },
)
