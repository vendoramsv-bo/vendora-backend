import { Hono } from "hono"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { TiendaPrismaRepository } from "../infrastructure/tienda.prisma.repository.js"
import { ObtenerPerfilPublicoUseCase } from "../application/perfil/obtener-perfil-publico.usecase.js"
import { ListarDirectorioUseCase } from "../application/directorio/listar-directorio.usecase.js"
import { ListarCatalogoPublicoUseCase } from "../application/directorio/listar-catalogo-publico.usecase.js"
import { DirectorioQuerySchema, CatalogoPublicoQuerySchema } from "./tienda.schema.js"
import { TiendaNoEncontradaError } from "../domain/tienda.errors.js"
import { makeQueryParamsSchema } from "../../../core/query-params.js"

export const tiendaPublicaRouter = new Hono()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any
function makeRepo() { return new TiendaPrismaRepository(db) }

const CatalogoQuerySchema = makeQueryParamsSchema(["nombre", "precio", "createdAt"])

// GET /public/tiendas — directorio sin auth
tiendaPublicaRouter.get("/", async (c) => {
  const query = DirectorioQuerySchema.safeParse(c.req.query())
  if (!query.success) return c.json({ error: "VALIDACION", details: query.error.flatten() }, 400)
  const result = await new ListarDirectorioUseCase(makeRepo()).execute(query.data)
  return c.json(result)
})

// GET /public/tiendas/:slug — perfil completo sin auth
tiendaPublicaRouter.get("/:slug", async (c) => {
  try {
    const result = await new ObtenerPerfilPublicoUseCase(makeRepo()).execute(c.req.param("slug"))
    return c.json(result)
  } catch (err) {
    if (err instanceof TiendaNoEncontradaError) return c.json({ error: "NOT_FOUND" }, 404)
    throw err
  }
})

// GET /public/tiendas/:slug/productos — catálogo público sin auth
tiendaPublicaRouter.get("/:slug/productos", async (c) => {
  const params = CatalogoQuerySchema.parse(c.req.query())
  const result = await new ListarCatalogoPublicoUseCase(makeRepo()).execute(c.req.param("slug"), params)
  return c.json(result)
})
