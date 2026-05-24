import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { ClientePrismaRepository } from "../infrastructure/cliente.prisma.repository.js"
import { CrearClienteUseCase } from "../application/cliente/crear-cliente.usecase.js"
import { ObtenerClienteUseCase } from "../application/cliente/obtener-cliente.usecase.js"
import { ActualizarClienteUseCase } from "../application/cliente/actualizar-cliente.usecase.js"
import { CambiarEstadoClienteUseCase } from "../application/cliente/cambiar-estado-cliente.usecase.js"
import { ListarClientesUseCase } from "../application/cliente/listar-clientes.usecase.js"
import {
  CrearClienteSchema,
  ActualizarClienteSchema,
  CambiarEstadoSchema,
  QueryParamsClienteSchema,
} from "./ventas.schema.js"
import {
  ClienteNoEncontradoError,
  ClienteNombreDuplicadoError,
  ClienteEmailDuplicadoError,
} from "../domain/ventas.errors.js"
import { getVentasNotificador } from "../infrastructure/ventas.notificador.provider.js"

export const clienteRouter = new Hono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() {
  return new ClientePrismaRepository(db)
}

// GET /clientes
clienteRouter.get("/", async (c) => {
  const tenantId = c.get("tenantId")
  const params = QueryParamsClienteSchema.parse(c.req.query())
  const estado = c.req.query("estado")
  const result = await new ListarClientesUseCase(makeRepo()).execute(tenantId, params, estado)
  return c.json(result)
})

// POST /clientes
clienteRouter.post("/", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = CrearClienteSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const result = await new CrearClienteUseCase(makeRepo(), getVentasNotificador()).execute({
      tenantId,
      nombre: parsed.data.nombre,
      email: parsed.data.email,
      telefono: parsed.data.telefono,
      direccion: parsed.data.direccion,
      diaNacimiento: parsed.data.diaNacimiento,
      mesNacimiento: parsed.data.mesNacimiento,
      createdById: session.user.id,
    })
    return c.json(result, 201)
  } catch (err) {
    if (err instanceof ClienteNombreDuplicadoError) return c.json({ error: err.code, message: err.message }, 409)
    if (err instanceof ClienteEmailDuplicadoError) return c.json({ error: err.code, message: err.message }, 409)
    throw err
  }
})

// GET /clientes/:id
clienteRouter.get("/:id", async (c) => {
  const tenantId = c.get("tenantId")
  try {
    const result = await new ObtenerClienteUseCase(makeRepo()).execute(c.req.param("id"), tenantId)
    return c.json(result)
  } catch (err) {
    if (err instanceof ClienteNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

// PATCH /clientes/:id
clienteRouter.patch("/:id", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = ActualizarClienteSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const result = await new ActualizarClienteUseCase(makeRepo(), getVentasNotificador()).execute({
      id: c.req.param("id"),
      tenantId,
      ...parsed.data,
      updatedById: session.user.id,
    })
    return c.json(result)
  } catch (err) {
    if (err instanceof ClienteNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof ClienteNombreDuplicadoError) return c.json({ error: err.code, message: err.message }, 409)
    if (err instanceof ClienteEmailDuplicadoError) return c.json({ error: err.code, message: err.message }, 409)
    throw err
  }
})

// PATCH /clientes/:id/estado
clienteRouter.patch("/:id/estado", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = CambiarEstadoSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const result = await new CambiarEstadoClienteUseCase(makeRepo()).execute(
      c.req.param("id"),
      tenantId,
      parsed.data.estado,
      session.user.id,
    )
    return c.json(result)
  } catch (err) {
    if (err instanceof ClienteNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})
