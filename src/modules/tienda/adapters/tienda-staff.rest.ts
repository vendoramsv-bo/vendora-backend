import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { TiendaPrismaRepository } from "../infrastructure/tienda.prisma.repository.js"
import { getTiendaNotificador } from "../infrastructure/tienda.notificador.provider.js"
import { ActivarTiendaUseCase } from "../application/perfil/activar-tienda.usecase.js"
import { DesactivarTiendaUseCase } from "../application/perfil/desactivar-tienda.usecase.js"
import { ObtenerConfiguracionUseCase } from "../application/perfil/obtener-configuracion.usecase.js"
import { ActualizarConfiguracionUseCase } from "../application/perfil/actualizar-configuracion.usecase.js"
import { AgregarProductoDestacadoUseCase } from "../application/destacados/agregar-producto-destacado.usecase.js"
import { QuitarProductoDestacadoUseCase } from "../application/destacados/quitar-producto-destacado.usecase.js"
import { ReordenarDestacadosUseCase } from "../application/destacados/reordenar-destacados.usecase.js"
import { ListarDestacadosUseCase } from "../application/destacados/listar-destacados.usecase.js"
import {
  ActualizarConfiguracionSchema,
  AgregarDestacadoSchema,
  ReordenarDestacadosSchema,
} from "./tienda.schema.js"
import {
  TiendaNoEncontradaError,
  ConfiguracionNoEncontradaError,
  ProductoDestacadoLimiteError,
  ProductoNoVisibleParaDestacadoError,
  ProductoDestacadoYaExisteError,
} from "../domain/tienda.errors.js"

export const tiendaStaffRouter = new Hono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any
function makeRepo() { return new TiendaPrismaRepository(db) }

// ─── Activar perfil de tienda ─────────────────────────────────────────────────

tiendaStaffRouter.patch("/tienda/activar", requireRol(["PROPIETARIO"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const result = await new ActivarTiendaUseCase(makeRepo(), getTiendaNotificador()).execute(tenantId, session.user.id)
  return c.json(result)
})

// ─── Desactivar perfil de tienda ──────────────────────────────────────────────

tiendaStaffRouter.patch("/tienda/desactivar", requireRol(["PROPIETARIO"]), async (c) => {
  const tenantId = c.get("tenantId")
  const result = await new DesactivarTiendaUseCase(makeRepo()).execute(tenantId)
  return c.json(result)
})

// ─── Configuración visual ─────────────────────────────────────────────────────

tiendaStaffRouter.get("/tienda/configuracion", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  try {
    const result = await new ObtenerConfiguracionUseCase(makeRepo()).execute(tenantId)
    return c.json(result)
  } catch (err) {
    if (err instanceof ConfiguracionNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

tiendaStaffRouter.patch("/tienda/configuracion", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = ActualizarConfiguracionSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const result = await new ActualizarConfiguracionUseCase(makeRepo(), getTiendaNotificador()).execute(
      tenantId, parsed.data, session.user.id,
    )
    return c.json(result)
  } catch (err) {
    if (err instanceof ConfiguracionNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof TiendaNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

// ─── Productos destacados ─────────────────────────────────────────────────────

tiendaStaffRouter.get("/tienda/destacados", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  const data = await new ListarDestacadosUseCase(makeRepo()).execute(tenantId)
  return c.json({ data, total: data.length })
})

tiendaStaffRouter.post("/tienda/destacados", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = AgregarDestacadoSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const result = await new AgregarProductoDestacadoUseCase(makeRepo(), getTiendaNotificador()).execute(
      tenantId, parsed.data.productoId, parsed.data.orden, session.user.id,
    )
    return c.json(result, 201)
  } catch (err) {
    if (err instanceof ProductoDestacadoLimiteError) return c.json({ error: err.code, message: err.message }, 422)
    if (err instanceof ProductoNoVisibleParaDestacadoError) return c.json({ error: err.code, message: err.message }, 422)
    if (err instanceof ProductoDestacadoYaExisteError) return c.json({ error: err.code, message: err.message }, 409)
    if (err instanceof TiendaNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

tiendaStaffRouter.delete("/tienda/destacados/:productoId", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  await new QuitarProductoDestacadoUseCase(makeRepo(), getTiendaNotificador()).execute(tenantId, c.req.param("productoId"))
  return c.json({ ok: true })
})

tiendaStaffRouter.patch("/tienda/destacados/reordenar", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const tenantId = c.get("tenantId")
  const body = await c.req.json()
  const parsed = ReordenarDestacadosSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  await new ReordenarDestacadosUseCase(makeRepo(), getTiendaNotificador()).execute(tenantId, parsed.data.orden)
  return c.json({ ok: true })
})
