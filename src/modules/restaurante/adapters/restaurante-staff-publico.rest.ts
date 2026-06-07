import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import { requireAuth, requireTenantActivo, type HonoEnv } from "../../../core/hono-context.js"
import { RestaurantePublicoPrismaRepository } from "../infrastructure/restaurante-publico.prisma.repository.js"
import { getRestaurantePublicoNotificador } from "../infrastructure/restaurante-publico.notificador.provider.js"
import { ActivarPerfilPublicoUseCase } from "../application/perfil-publico/activar-perfil-publico.usecase.js"
import { DesactivarPerfilPublicoUseCase } from "../application/perfil-publico/desactivar-perfil-publico.usecase.js"
import { ActualizarConfiguracionPublicaUseCase } from "../application/perfil-publico/actualizar-configuracion-publica.usecase.js"
import { ObtenerPerfilPublicoUseCase } from "../application/perfil-publico/obtener-perfil-publico.usecase.js"
import { ActualizarConfiguracionPublicaSchema } from "./restaurante.schema.js"
import { PerfilNoEncontradoError } from "../domain/restaurante-publico.errors.js"
import { errorResponses, okResponse } from "../../../core/openapi-responses.js"

export const restauranteStaffPublicoRouter = new OpenAPIHono<HonoEnv>()
restauranteStaffPublicoRouter.use("*", requireAuth, requireTenantActivo)

function makeRepo() { return new RestaurantePublicoPrismaRepository() }

restauranteStaffPublicoRouter.openapi(
  createRoute({
    method: "post",
    path: "/activar",
    operationId: "restaurante_staff_activar_perfil_publico",
    tags: ["Restaurante Público"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Perfil público activado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    const resultado = await new ActivarPerfilPublicoUseCase(makeRepo(), getRestaurantePublicoNotificador()).ejecutar(tenantId, session.user.id)
    return c.json(resultado)
  },
)

restauranteStaffPublicoRouter.openapi(
  createRoute({
    method: "post",
    path: "/desactivar",
    operationId: "restaurante_staff_desactivar_perfil_publico",
    tags: ["Restaurante Público"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Perfil público desactivado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    const session = c.get("session")
    try {
      const repo = makeRepo()
      const config = await repo.obtenerConfiguracion(tenantId)
      const perfil = await repo.obtenerPerfilPublico(config.restauranteId)
      const slug = perfil?.slug ?? tenantId
      const resultado = await new DesactivarPerfilPublicoUseCase(makeRepo(), getRestaurantePublicoNotificador()).ejecutar(tenantId, slug)
      return c.json(resultado)
    } catch (err) {
      if (err instanceof PerfilNoEncontradoError) {
        await new DesactivarPerfilPublicoUseCase(makeRepo(), getRestaurantePublicoNotificador()).ejecutar(tenantId, tenantId)
        return c.json({ esRestaurante: false })
      }
      throw err
    }
    void session
  },
)

restauranteStaffPublicoRouter.openapi(
  createRoute({
    method: "patch",
    path: "/configuracion",
    operationId: "restaurante_staff_actualizar_configuracion_publica",
    tags: ["Restaurante Público"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Configuración pública actualizada", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
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
  },
)

restauranteStaffPublicoRouter.openapi(
  createRoute({
    method: "get",
    path: "/configuracion",
    operationId: "restaurante_staff_obtener_configuracion_publica",
    tags: ["Restaurante Público"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Configuración pública del restaurante", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    try {
      const config = await new ObtenerPerfilPublicoUseCase(makeRepo()).ejecutar(tenantId)
      return c.json(config)
    } catch (err) {
      if (err instanceof PerfilNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)
