import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { GastosPrismaRepository } from "../infrastructure/gastos.prisma.repository.js"
import { CrearGastoUseCase } from "../application/gastos/crear-gasto.usecase.js"
import { ActualizarGastoUseCase } from "../application/gastos/actualizar-gasto.usecase.js"
import { EliminarGastoUseCase } from "../application/gastos/eliminar-gasto.usecase.js"
import { ListarGastosUseCase } from "../application/gastos/listar-gastos.usecase.js"
import {
  CrearGastoSchema,
  ActualizarGastoSchema,
  QueryParamsGastosSchema,
} from "./ventas.schema.js"
import { GastoNoEncontradoError } from "../domain/ventas.errors.js"

export const gastosRouter = new Hono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() { return new GastosPrismaRepository(db) }

// GET /gastos
gastosRouter.get("/", async (c) => {
  const tenantId = c.get("tenantId")
  const params = QueryParamsGastosSchema.parse(c.req.query())
  const incluirEliminados = c.req.query("incluirEliminados") === "true"
  const result = await new ListarGastosUseCase(makeRepo()).execute(tenantId, params, incluirEliminados)
  return c.json(result)
})

// POST /gastos
gastosRouter.post("/", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = CrearGastoSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  const result = await new CrearGastoUseCase(makeRepo()).execute({
    tenantId,
    tenantMemberId: session.user.id,
    fecha: new Date(parsed.data.fecha),
    motivo: parsed.data.motivo,
    totalGasto: parsed.data.totalGasto,
    createdById: session.user.id,
  })
  return c.json(result, 201)
})

// PATCH /gastos/:id
gastosRouter.patch("/:id", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = ActualizarGastoSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const result = await new ActualizarGastoUseCase(makeRepo()).execute({
      id: c.req.param("id"),
      tenantId,
      fecha: parsed.data.fecha ? new Date(parsed.data.fecha) : undefined,
      motivo: parsed.data.motivo,
      totalGasto: parsed.data.totalGasto,
      updatedById: session.user.id,
    })
    return c.json(result)
  } catch (err) {
    if (err instanceof GastoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

// DELETE /gastos/:id
gastosRouter.delete("/:id", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  try {
    await new EliminarGastoUseCase(makeRepo()).execute(c.req.param("id"), tenantId, session.user.id)
    return c.body(null, 204)
  } catch (err) {
    if (err instanceof GastoNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})
