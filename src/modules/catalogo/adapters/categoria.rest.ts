import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { CategoriaPrismaRepository } from "../infrastructure/categoria.prisma.repository.js"
import { ActividadEconomicaPrismaRepository } from "../infrastructure/actividad-economica.prisma.repository.js"
import { ListarCategoriasUseCase } from "../application/categoria/listar-categorias.usecase.js"
import { CrearCategoriaUseCase } from "../application/categoria/crear-categoria.usecase.js"
import { ObtenerCategoriaUseCase } from "../application/categoria/obtener-categoria.usecase.js"
import { ActualizarCategoriaUseCase } from "../application/categoria/actualizar-categoria.usecase.js"
import { CambiarEstadoCategoriaUseCase } from "../application/categoria/cambiar-estado-categoria.usecase.js"
import { CategoriaCreateSchema, CategoriaUpdateSchema, CambiarEstadoSchema } from "./catalogo.schema.js"
import { CategoriaNombreDuplicado, CategoriaNoEncontrada, CategoriaPadreNoEncontrada, ActividadNoEncontrada } from "../domain/catalogo.errors.js"
import { getCatalogoNotificador } from "../infrastructure/catalogo.notificador.provider.js"

export const categoriaRouter = new Hono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() {
  return new CategoriaPrismaRepository(db)
}

function makeActividadRepo() {
  return new ActividadEconomicaPrismaRepository(db)
}

categoriaRouter.get("/categorias", async (c) => {
  const tenantId = c.get("tenantId")
  const { actividadId, estado } = c.req.query()
  const categorias = await new ListarCategoriasUseCase(makeRepo()).ejecutar(tenantId, actividadId, estado)
  return c.json({ data: categorias.map((c) => c.toJSON()) })
})

categoriaRouter.post("/categorias", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = CategoriaCreateSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const categoria = await new CrearCategoriaUseCase(makeRepo(), makeActividadRepo(), getCatalogoNotificador()).ejecutar(
      parsed.data,
      tenantId,
      session.user.id,
    )
    return c.json(categoria.toJSON(), 201)
  } catch (err) {
    if (err instanceof CategoriaNombreDuplicado) return c.json({ error: err.code, message: err.message }, 409)
    if (err instanceof CategoriaPadreNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof ActividadNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

categoriaRouter.get("/categorias/:id", async (c) => {
  const tenantId = c.get("tenantId")
  try {
    const categoria = await new ObtenerCategoriaUseCase(makeRepo()).ejecutar(c.req.param("id"), tenantId)
    return c.json(categoria.toJSON())
  } catch (err) {
    if (err instanceof CategoriaNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

categoriaRouter.put("/categorias/:id", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = CategoriaUpdateSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const categoria = await new ActualizarCategoriaUseCase(makeRepo(), getCatalogoNotificador()).ejecutar(
      c.req.param("id"),
      parsed.data,
      tenantId,
      session.user.id,
    )
    return c.json(categoria.toJSON())
  } catch (err) {
    if (err instanceof CategoriaNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

categoriaRouter.patch("/categorias/:id/estado", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = CambiarEstadoSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    await new CambiarEstadoCategoriaUseCase(makeRepo(), getCatalogoNotificador()).ejecutar(
      c.req.param("id"),
      parsed.data.estado,
      tenantId,
      session.user.id,
    )
    return c.json({ ok: true })
  } catch (err) {
    if (err instanceof CategoriaNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})
