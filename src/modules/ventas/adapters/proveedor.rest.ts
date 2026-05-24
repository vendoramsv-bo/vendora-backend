import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { ProveedorPrismaRepository } from "../infrastructure/proveedor.prisma.repository.js"
import { CrearProveedorUseCase } from "../application/proveedor/crear-proveedor.usecase.js"
import { ObtenerProveedorUseCase } from "../application/proveedor/obtener-proveedor.usecase.js"
import { ActualizarProveedorUseCase } from "../application/proveedor/actualizar-proveedor.usecase.js"
import { CambiarEstadoProveedorUseCase } from "../application/proveedor/cambiar-estado-proveedor.usecase.js"
import { EliminarProveedorUseCase } from "../application/proveedor/eliminar-proveedor.usecase.js"
import { ListarProveedoresUseCase } from "../application/proveedor/listar-proveedores.usecase.js"
import {
  CrearProveedorSchema,
  ActualizarProveedorSchema,
  CambiarEstadoSchema,
  QueryParamsProveedorSchema,
} from "./ventas.schema.js"
import {
  ProveedorNoEncontradoError,
  ProveedorNombreDuplicadoError,
  ProveedorNITDuplicadoError,
  ProveedorEnUsoError,
} from "../domain/ventas.errors.js"
import { getVentasNotificador } from "../infrastructure/ventas.notificador.provider.js"

export const proveedorRouter = new Hono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() {
  return new ProveedorPrismaRepository(db)
}

// GET /proveedores
proveedorRouter.get("/", async (c) => {
  const tenantId = c.get("tenantId")
  const params = QueryParamsProveedorSchema.parse(c.req.query())
  const estado = c.req.query("estado")
  const result = await new ListarProveedoresUseCase(makeRepo()).execute(tenantId, params, estado)
  return c.json(result)
})

// POST /proveedores
proveedorRouter.post("/", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = CrearProveedorSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const result = await new CrearProveedorUseCase(makeRepo(), getVentasNotificador()).execute({
      tenantId,
      ...parsed.data,
      createdById: session.user.id,
    })
    return c.json(result, 201)
  } catch (err) {
    if (err instanceof ProveedorNombreDuplicadoError) return c.json({ error: err.code, message: err.message }, 409)
    if (err instanceof ProveedorNITDuplicadoError) return c.json({ error: err.code, message: err.message }, 409)
    throw err
  }
})

// GET /proveedores/:id
proveedorRouter.get("/:id", async (c) => {
  const tenantId = c.get("tenantId")
  try {
    const result = await new ObtenerProveedorUseCase(makeRepo()).execute(c.req.param("id"), tenantId)
    return c.json(result)
  } catch (err) {
    if (err instanceof ProveedorNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

// PATCH /proveedores/:id
proveedorRouter.patch("/:id", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = ActualizarProveedorSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const result = await new ActualizarProveedorUseCase(makeRepo(), getVentasNotificador()).execute({
      id: c.req.param("id"),
      tenantId,
      ...parsed.data,
      updatedById: session.user.id,
    })
    return c.json(result)
  } catch (err) {
    if (err instanceof ProveedorNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof ProveedorNombreDuplicadoError) return c.json({ error: err.code, message: err.message }, 409)
    if (err instanceof ProveedorNITDuplicadoError) return c.json({ error: err.code, message: err.message }, 409)
    throw err
  }
})

// PATCH /proveedores/:id/estado
proveedorRouter.patch("/:id/estado", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = CambiarEstadoSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const result = await new CambiarEstadoProveedorUseCase(makeRepo()).execute(
      c.req.param("id"),
      tenantId,
      parsed.data.estado,
      session.user.id,
    )
    return c.json(result)
  } catch (err) {
    if (err instanceof ProveedorNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

// DELETE /proveedores/:id
proveedorRouter.delete("/:id", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  try {
    await new EliminarProveedorUseCase(makeRepo()).execute(c.req.param("id"), tenantId)
    return c.body(null, 204)
  } catch (err) {
    if (err instanceof ProveedorNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof ProveedorEnUsoError) return c.json({ error: err.code, message: err.message }, 422)
    throw err
  }
})
