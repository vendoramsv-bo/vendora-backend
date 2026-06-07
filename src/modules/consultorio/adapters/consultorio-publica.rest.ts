import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { ConsultorioPublicoPrismaRepository } from "../infrastructure/consultorio-publico.prisma.repository.js"
import { ObtenerPerfilPublicoConsultorioUseCase } from "../application/perfil-publico/obtener-perfil-publico.usecase.js"
import { ListarDirectorioConsultorioUseCase } from "../application/directorio-publico/listar-directorio.usecase.js"
import { ListarServiciosPublicosUseCase } from "../application/servicios-publicos/listar-servicios-publicos.usecase.js"
import { ConsultarDisponibilidadUseCase } from "../application/cita-online/consultar-disponibilidad.usecase.js"
import { DirectorioConsultorioQuerySchema, DisponibilidadQuerySchema, ServiciosPublicosQuerySchema } from "./consultorio.schema.js"
import { ConsultorioNoEncontradoError } from "../domain/consultorio-publico.errors.js"
import { errorResponses, okResponse } from "../../../core/openapi-responses.js"

export const consultorioPublicaRouter = new OpenAPIHono<HonoEnv>()

function makeRepo() { return new ConsultorioPublicoPrismaRepository() }

consultorioPublicaRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    operationId: "consultorio_publico_listar_directorio",
    tags: ["Consultorio Público"],
    responses: {
      200: okResponse("Directorio de consultorios", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const q = c.req.query()
    const parsed = DirectorioConsultorioQuerySchema.safeParse(q)
    if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    const resultado = await new ListarDirectorioConsultorioUseCase(makeRepo()).ejecutar(parsed.data)
    return c.json(resultado)
  },
)

consultorioPublicaRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}",
    operationId: "consultorio_publico_obtener_perfil",
    tags: ["Consultorio Público"],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      200: okResponse("Perfil público del consultorio", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    try {
      const perfil = await new ObtenerPerfilPublicoConsultorioUseCase(makeRepo()).ejecutar(c.req.param("slug"))
      return c.json(perfil)
    } catch (err) {
      if (err instanceof ConsultorioNoEncontradoError) return c.json({ error: err.code, message: err.message }, 404)
      throw err
    }
  },
)

consultorioPublicaRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/servicios",
    operationId: "consultorio_publico_listar_servicios",
    tags: ["Consultorio Público"],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      200: okResponse("Servicios públicos del consultorio", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
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
  },
)

consultorioPublicaRouter.openapi(
  createRoute({
    method: "get",
    path: "/{slug}/disponibilidad",
    operationId: "consultorio_publico_disponibilidad",
    tags: ["Consultorio Público"],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      200: okResponse("Disponibilidad del consultorio", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
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
  },
)
