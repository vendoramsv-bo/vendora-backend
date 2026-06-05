import { Hono } from "hono"
import { requireAuth, type HonoEnv } from "../../../core/hono-context.js"
import { RestaurantePublicoPrismaRepository } from "../infrastructure/restaurante-publico.prisma.repository.js"
import { getRestaurantePublicoNotificador } from "../infrastructure/restaurante-publico.notificador.provider.js"
import { ListarDirectorioUseCase } from "../application/directorio-publico/listar-directorio.usecase.js"
import { ListarMenusPublicosUseCase } from "../application/menu-publico/listar-menus-publicos.usecase.js"
import { CrearReservaConsumerUseCase } from "../application/reserva-publica/crear-reserva-consumer.usecase.js"
import { ListarMisReservasUseCase } from "../application/reserva-publica/listar-mis-reservas.usecase.js"
import { CancelarReservaConsumerUseCase } from "../application/reserva-publica/cancelar-reserva-consumer.usecase.js"
import { DirectorioQuerySchema, MenuPublicoQuerySchema, CrearReservaConsumerSchema, MisReservasQuerySchema } from "./restaurante.schema.js"
import {
  PerfilNoEncontradoError,
  TipoServicioSinReservasError,
  ReservaFechaInvalidaError,
  ReservaNoModificableError,
  ReservaNoEncontradaError,
} from "../domain/restaurante-publico.errors.js"

// ─── Rutas públicas (sin auth) ────────────────────────────────────────────────

export const publicoRestauranteRouter = new Hono<HonoEnv>()

function makeRepo() { return new RestaurantePublicoPrismaRepository() }

// GET /api/public/restaurantes
publicoRestauranteRouter.get("/", async (c) => {
  const q = c.req.query()
  const parsed = DirectorioQuerySchema.safeParse(q)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  const resultado = await new ListarDirectorioUseCase(makeRepo()).ejecutar(parsed.data)
  return c.json(resultado)
})

// GET /api/public/restaurantes/:slug
publicoRestauranteRouter.get("/:slug", async (c) => {
  const slug = c.req.param("slug")
  const repo = makeRepo()
  const perfil = await repo.obtenerPerfilPublico(slug)
  if (!perfil) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO", message: "Restaurante no encontrado" }, 404)
  return c.json(perfil)
})

// GET /api/public/restaurantes/:slug/menus
publicoRestauranteRouter.get("/:slug/menus", async (c) => {
  const slug = c.req.param("slug")
  const q = c.req.query()
  const parsed = MenuPublicoQuerySchema.safeParse(q)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

  const repo = makeRepo()
  const perfil = await repo.obtenerPerfilPublico(slug)
  if (!perfil) return c.json({ error: "RESTAURANTE_NO_ENCONTRADO" }, 404)

  const resultado = await new ListarMenusPublicosUseCase(repo).ejecutar(perfil.slug, parsed.data)
  return c.json(resultado)
})

// ─── Rutas de consumidor autenticado (/api/consumer/restaurantes/:slug/...) ────

export const consumerRestauranteRouter = new Hono<HonoEnv>()
consumerRestauranteRouter.use("*", requireAuth)

// POST /api/consumer/restaurantes/:slug/reservas
consumerRestauranteRouter.post("/:slug/reservas", async (c) => {
  const slug = c.req.param("slug")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = CrearReservaConsumerSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

  try {
    const resultado = await new CrearReservaConsumerUseCase(makeRepo(), getRestaurantePublicoNotificador()).ejecutar({
      slug,
      userId: session.user.id,
      fechaLlegada: new Date(parsed.data.fechaLlegada),
      numeroComensales: parsed.data.numeroComensales,
      observaciones: parsed.data.observaciones,
    })
    return c.json(resultado, 201)
  } catch (err) {
    if (err instanceof PerfilNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof TipoServicioSinReservasError) return c.json({ error: err.code, message: err.message }, 422)
    if (err instanceof ReservaFechaInvalidaError) return c.json({ error: err.code, message: err.message }, 422)
    throw err
  }
})

// ─── Rutas de consumidor sin slug (/api/consumer/mis-reservas) ────────────────

export const consumerMisReservasRouter = new Hono<HonoEnv>()
consumerMisReservasRouter.use("*", requireAuth)

// GET /api/consumer/mis-reservas
consumerMisReservasRouter.get("/", async (c) => {
  const session = c.get("session")
  const q = c.req.query()
  const parsed = MisReservasQuerySchema.safeParse(q)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  const resultado = await new ListarMisReservasUseCase(makeRepo()).ejecutar({ userId: session.user.id, ...parsed.data })
  return c.json(resultado)
})

// DELETE /api/consumer/mis-reservas/:reservaId
consumerMisReservasRouter.delete("/:reservaId", async (c) => {
  const reservaId = c.req.param("reservaId")
  const session = c.get("session")
  try {
    const resultado = await new CancelarReservaConsumerUseCase(makeRepo(), getRestaurantePublicoNotificador()).ejecutar(reservaId, session.user.id)
    return c.json(resultado)
  } catch (err) {
    if (err instanceof ReservaNoEncontradaError) return c.json({ error: err.code, message: err.message }, 404)
    if (err instanceof ReservaNoModificableError) return c.json({ error: err.code, message: err.message }, 422)
    throw err
  }
})
