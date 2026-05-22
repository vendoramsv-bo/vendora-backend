import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { UnidadMedidaPrismaRepository } from "../infrastructure/unidad-medida.prisma.repository.js"
import { ListarUnidadesUseCase } from "../application/unidad-medida/listar-unidades.usecase.js"
import { CrearUnidadUseCase } from "../application/unidad-medida/crear-unidad.usecase.js"
import { ActualizarUnidadUseCase } from "../application/unidad-medida/actualizar-unidad.usecase.js"
import { UnidadCreateSchema, UnidadUpdateSchema } from "./catalogo.schema.js"
import { UnidadDuplicada, UnidadNoEncontrada } from "../domain/catalogo.errors.js"

export const unidadMedidaRouter = new Hono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() {
  return new UnidadMedidaPrismaRepository(db)
}

unidadMedidaRouter.get("/cla-unidades", async (c) => {
  const clasificadores = await makeRepo().listarClasificadores()
  return c.json({ data: clasificadores })
})

unidadMedidaRouter.get("/unidades", async (c) => {
  const tenantId = c.get("tenantId")
  const resultado = await new ListarUnidadesUseCase(makeRepo()).ejecutar(tenantId)
  return c.json({ data: resultado.unidades.map((u) => u.toJSON()) })
})

unidadMedidaRouter.post("/unidades", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = UnidadCreateSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const unidad = await new CrearUnidadUseCase(makeRepo()).ejecutar(parsed.data, tenantId, session.user.id)
    return c.json(unidad.toJSON(), 201)
  } catch (err) {
    if (err instanceof UnidadDuplicada) return c.json({ error: err.code, message: err.message }, 409)
    throw err
  }
})

unidadMedidaRouter.put("/unidades/:id", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = UnidadUpdateSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const unidad = await new ActualizarUnidadUseCase(makeRepo()).ejecutar(c.req.param("id"), parsed.data, tenantId, session.user.id)
    return c.json(unidad.toJSON())
  } catch (err) {
    if (err instanceof UnidadNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})
