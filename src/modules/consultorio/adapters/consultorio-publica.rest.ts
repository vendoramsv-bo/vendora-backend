import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { ConsultorioPublicoPrismaRepository } from "../infrastructure/consultorio-publico.prisma.repository.js"
import { ObtenerPerfilPublicoConsultorioUseCase } from "../application/perfil-publico/obtener-perfil-publico.usecase.js"
import { ListarDirectorioConsultorioUseCase } from "../application/directorio-publico/listar-directorio.usecase.js"
import { ListarServiciosPublicosUseCase } from "../application/servicios-publicos/listar-servicios-publicos.usecase.js"
import { ConsultarDisponibilidadUseCase } from "../application/cita-online/consultar-disponibilidad.usecase.js"
import { DirectorioConsultorioQuerySchema, DisponibilidadQuerySchema, ServiciosPublicosQuerySchema } from "./consultorio.schema.js"
import { ConsultorioNoEncontradoError } from "../domain/consultorio-publico.errors.js"

export const consultorioPublicaRouter = new Hono<HonoEnv>()

function makeRepo() { return new ConsultorioPublicoPrismaRepository() }

// GET /api/public/consultorios
consultorioPublicaRouter.get("/", async (c) => {
  const q = c.req.query()
  const parsed = DirectorioConsultorioQuerySchema.safeParse(q)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  const resultado = await new ListarDirectorioConsultorioUseCase(makeRepo()).ejecutar(parsed.data)
  return c.json(resultado)
})

// GET /api/public/consultorios/:slug
consultorioPublicaRouter.get("/:slug", async (c) => {
  try {
    const perfil = await new ObtenerPerfilPublicoConsultorioUseCase(makeRepo()).ejecutar(c.req.param("slug"))
    return c.json(perfil)
  } catch (err) {
    if (err instanceof ConsultorioNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

// GET /api/public/consultorios/:slug/servicios
consultorioPublicaRouter.get("/:slug/servicios", async (c) => {
  const q = c.req.query()
  const parsed = ServiciosPublicosQuerySchema.safeParse(q)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const resultado = await new ListarServiciosPublicosUseCase(makeRepo()).ejecutar(c.req.param("slug"), parsed.data)
    return c.json(resultado)
  } catch (err) {
    if (err instanceof ConsultorioNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})

// GET /api/public/consultorios/:slug/disponibilidad
consultorioPublicaRouter.get("/:slug/disponibilidad", async (c) => {
  const q = c.req.query()
  const parsed = DisponibilidadQuerySchema.safeParse(q)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
  try {
    const resultado = await new ConsultarDisponibilidadUseCase(makeRepo()).ejecutar(
      c.req.param("slug"),
      parsed.data.medicoId,
      parsed.data.servicioId,
      new Date(parsed.data.fechaDesde),
      new Date(parsed.data.fechaHasta),
    )
    return c.json(resultado)
  } catch (err) {
    if (err instanceof ConsultorioNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
    throw err
  }
})
