import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { TiendaPrismaRepository } from "../infrastructure/tienda.prisma.repository.js"
import { ObtenerPerfilPublicoUseCase } from "../application/perfil/obtener-perfil-publico.usecase.js"
import { ListarDirectorioUseCase } from "../application/directorio/listar-directorio.usecase.js"
import { ListarCatalogoPublicoUseCase } from "../application/directorio/listar-catalogo-publico.usecase.js"
import { ListarCategoriasPublicasUseCase } from "../application/directorio/listar-categorias-publicas.usecase.js"
import { ListarFavoritosComunidadUseCase } from "../application/directorio/listar-favoritos-comunidad.usecase.js"
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
    // `CatalogoPublicoQuerySchema` declaraba `categoriaId` pero `CatalogoQuerySchema`
    // (makeQueryParamsSchema) no lo incluye, asi que el parametro se documentaba y
    // se descartaba en silencio. Se lee aparte y se propaga (spec 019 FR-003).
    const categoriaId = c.req.query("categoriaId") || undefined
    const result = await new ListarCatalogoPublicoUseCase(makeRepo()).execute(c.req.param("slug"), params, categoriaId)
    return c.json(result)
  },
)

// GET /public/tiendas/:slug/categorias — categorías del catálogo público sin auth
tiendaPublicaRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/categorias",
    operationId: "tienda_publico_listar_categorias",
    tags: ["Tienda Pública"],
    request: {
      params: z.object({ slug: z.string() }),
    },
    responses: {
      200: okResponse("Categorías del catálogo público", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const data = await new ListarCategoriasPublicasUseCase(makeRepo()).execute(c.req.param("slug"))
    return c.json({ data })
  },
)

// GET /public/tiendas/:slug/productos/favoritos — más guardados por la comunidad
tiendaPublicaRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/productos/favoritos",
    operationId: "tienda_publico_listar_favoritos_comunidad",
    tags: ["Tienda Pública"],
    request: {
      params: z.object({ slug: z.string() }),
    },
    responses: {
      200: okResponse("Productos favoritos de la comunidad", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const data = await new ListarFavoritosComunidadUseCase(makeRepo()).execute(c.req.param("slug"))
    return c.json({ data })
  },
)
