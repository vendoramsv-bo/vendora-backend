import { Hono } from "hono"
import { requireAuth, requireTenantActivo, type HonoEnv } from "../../../core/hono-context.js"
import { RestaurantePublicoPrismaRepository } from "../infrastructure/restaurante-publico.prisma.repository.js"
import { getRestaurantePublicoNotificador } from "../infrastructure/restaurante-publico.notificador.provider.js"
import { ActivarPerfilPublicoUseCase } from "../application/perfil-publico/activar-perfil-publico.usecase.js"
import { DesactivarPerfilPublicoUseCase } from "../application/perfil-publico/desactivar-perfil-publico.usecase.js"
import { ActualizarConfiguracionPublicaUseCase } from "../application/perfil-publico/actualizar-configuracion-publica.usecase.js"
import { ObtenerPerfilPublicoUseCase } from "../application/perfil-publico/obtener-perfil-publico.usecase.js"
import { ActualizarConfiguracionPublicaSchema } from "./restaurante.schema.js"
import { PerfilNoEncontradoError } from "../domain/restaurante-publico.errors.js"

export const restauranteStaffPublicoRouter = new Hono<HonoEnv>()
restauranteStaffPublicoRouter.use("*", requireAuth, requireTenantActivo)

function makeRepo() { return new RestaurantePublicoPrismaRepository() }

// POST /api/staff/restaurante/perfil/activar
restauranteStaffPublicoRouter.post("/activar", async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const resultado = await new ActivarPerfilPublicoUseCase(makeRepo(), getRestaurantePublicoNotificador()).ejecutar(tenantId, session.user.id)
  return c.json(resultado)
})

// POST /api/staff/restaurante/perfil/desactivar
restauranteStaffPublicoRouter.post("/desactivar", async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  // Get current slug before desactivating
  try {
    const repo = makeRepo()
    const config = await repo.obtenerConfiguracion(tenantId)
    const perfil = await repo.obtenerPerfilPublico(config.restauranteId)
    const slug = perfil?.slug ?? tenantId
    const resultado = await new DesactivarPerfilPublicoUseCase(makeRepo(), getRestaurantePublicoNotificador()).ejecutar(tenantId, slug)
    return c.json(resultado)
  } catch (err) {
    // If no profile yet, just desactivate
    if (err instanceof PerfilNoEncontradoError) {
      await new DesactivarPerfilPublicoUseCase(makeRepo(), getRestaurantePublicoNotificador()).ejecutar(tenantId, tenantId)
      return c.json({ esRestaurante: false })
    }
    throw err
  }
  void session
})

// PATCH /api/staff/restaurante/perfil/configuracion
restauranteStaffPublicoRouter.patch("/configuracion", async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = ActualizarConfiguracionPublicaSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

  try {
    const config = await new ActualizarConfiguracionPublicaUseCase(makeRepo(), getRestaurantePublicoNotificador()).ejecutar(tenantId, parsed.data, session.user.id)
    return c.json(config)
  } catch (err) {
    if (err instanceof PerfilNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

// GET /api/staff/restaurante/perfil/configuracion
restauranteStaffPublicoRouter.get("/configuracion", async (c) => {
  const tenantId = c.get("tenantId")
  try {
    const config = await new ObtenerPerfilPublicoUseCase(makeRepo()).ejecutar(tenantId)
    return c.json(config)
  } catch (err) {
    if (err instanceof PerfilNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})
