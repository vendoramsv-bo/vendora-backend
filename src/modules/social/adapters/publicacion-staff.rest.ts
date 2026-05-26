import { Hono } from "hono"
import { requireAuth, requireTenantActivo, type HonoEnv } from "../../../core/hono-context.js"
import { PublicacionPrismaRepository } from "../infrastructure/publicacion.prisma.repository.js"
import { getSocialNotificador } from "../infrastructure/social.notificador.provider.js"
import { CrearPublicacionUseCase } from "../application/publicacion/crear-publicacion.usecase.js"
import { ActualizarPublicacionUseCase } from "../application/publicacion/actualizar-publicacion.usecase.js"
import { CambiarEstadoPublicacionUseCase } from "../application/publicacion/cambiar-estado-publicacion.usecase.js"
import { ListarPublicacionesUseCase } from "../application/publicacion/listar-publicaciones.usecase.js"
import { ObtenerPublicacionUseCase } from "../application/publicacion/obtener-publicacion.usecase.js"
import { ReaccionarPublicacionUseCase } from "../application/publicacion/reaccionar-publicacion.usecase.js"
import { ComentarPublicacionUseCase } from "../application/publicacion/comentar-publicacion.usecase.js"
import { EditarComentarioPublicacionUseCase } from "../application/publicacion/editar-comentario-publicacion.usecase.js"
import { EliminarComentarioPublicacionUseCase } from "../application/publicacion/eliminar-comentario-publicacion.usecase.js"
import { CompartirPublicacionUseCase } from "../application/publicacion/compartir-publicacion.usecase.js"
import { CrearPublicacionSchema, ActualizarPublicacionSchema, EstadoPublicacionSchema, ReaccionTipoSchema, ComentarioSchema, CompartirSchema } from "./social.schema.js"
import {
  PublicacionNoEncontrada,
  ComentarioNoEncontrado,
  NoAutorizado,
  ComentarioEsRespuesta,
  SoloPropietarioAdmin,
  EstadoPublicacionInvalido,
} from "../domain/social.errors.js"

function makeRepo() { return new PublicacionPrismaRepository() }

function getRol(c: Parameters<typeof requireAuth>[0]): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (c.get("session") as any)?.session?.activeOrganizationRole ?? "ENCARGADO"
}

function handleError(err: unknown, c: { json: (v: unknown, s: number) => Response }) {
  if (err instanceof PublicacionNoEncontrada) return c.json({ error: err.code, message: err.message }, 404)
  if (err instanceof ComentarioNoEncontrado) return c.json({ error: err.code, message: err.message }, 404)
  if (err instanceof SoloPropietarioAdmin) return c.json({ error: err.code, message: err.message }, 403)
  if (err instanceof NoAutorizado) return c.json({ error: err.code, message: err.message }, 403)
  if (err instanceof ComentarioEsRespuesta) return c.json({ error: err.code, message: err.message }, 422)
  if (err instanceof EstadoPublicacionInvalido) return c.json({ error: err.code, message: err.message }, 422)
  throw err
}

export const publicacionStaffRouter = new Hono<HonoEnv>()
publicacionStaffRouter.use("*", requireAuth, requireTenantActivo)

publicacionStaffRouter.get("/publicaciones", async (c) => {
  const tenantId = c.get("tenantId")
  const q = c.req.query()
  const take = Math.min(Number(q.take ?? 20), 100)
  const skip = Number(q.skip ?? 0)
  const order = (q.order === "asc" ? "asc" : "desc") as "asc" | "desc"

  const result = await new ListarPublicacionesUseCase(makeRepo()).ejecutar(tenantId, { take, skip, order, estado: q.estado, etiqueta: q.etiqueta })
  return c.json({ data: result.data, meta: { total: result.total, hasMore: skip + result.data.length < result.total } })
})

publicacionStaffRouter.post("/publicaciones", async (c) => {
  const tenantId = c.get("tenantId")
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = CrearPublicacionSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

  try {
    const pub = await new CrearPublicacionUseCase(makeRepo()).ejecutar(tenantId, session.user.id, getRol(c), {
      titulo: parsed.data.titulo,
      contenido: parsed.data.contenido,
      tipo: parsed.data.tipo,
      etiquetas: parsed.data.etiquetas ?? [],
      medios: parsed.data.medios ?? [],
    })
    return c.json(pub, 201)
  } catch (err) { return handleError(err, c) as Response }
})

publicacionStaffRouter.put("/publicaciones/:id", async (c) => {
  const tenantId = c.get("tenantId")
  const body = await c.req.json()
  const parsed = ActualizarPublicacionSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

  try {
    const pub = await new ActualizarPublicacionUseCase(makeRepo()).ejecutar(c.req.param("id"), tenantId, getRol(c), parsed.data)
    return c.json(pub)
  } catch (err) { return handleError(err, c) as Response }
})

publicacionStaffRouter.patch("/publicaciones/:id/estado", async (c) => {
  const tenantId = c.get("tenantId")
  const body = await c.req.json()
  const parsed = EstadoPublicacionSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

  try {
    const pub = await new CambiarEstadoPublicacionUseCase(makeRepo(), getSocialNotificador()).ejecutar(
      c.req.param("id"),
      tenantId,
      getRol(c),
      parsed.data.estado,
    )
    return c.json(pub)
  } catch (err) { return handleError(err, c) as Response }
})

publicacionStaffRouter.delete("/publicaciones/:id", async (c) => {
  const tenantId = c.get("tenantId")
  try {
    const raw = await makeRepo().findById(c.req.param("id"), tenantId)
    if (!raw) return c.json({ error: "PUBLICACION_NO_ENCONTRADA" }, 404)
    if (raw.estado === "PUBLICADO") return c.json({ error: "ESTADO_PUBLICACION_INVALIDO", message: "No se puede eliminar una publicación publicada" }, 422)
    await makeRepo().delete(c.req.param("id"), tenantId)
    return c.json({ deleted: true })
  } catch (err) { return handleError(err, c) as Response }
})

// Interacciones sobre publicaciones (cualquier usuario autenticado)

publicacionStaffRouter.post("/publicaciones/:id/reaccionar", async (c) => {
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = ReaccionTipoSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

  try {
    const result = await new ReaccionarPublicacionUseCase(makeRepo(), getSocialNotificador()).ejecutar(
      c.req.param("id"),
      session.user.id,
      parsed.data.tipo,
    )
    return c.json(result)
  } catch (err) { return handleError(err, c) as Response }
})

publicacionStaffRouter.post("/publicaciones/:id/comentarios", async (c) => {
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = ComentarioSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

  try {
    const comentario = await new ComentarPublicacionUseCase(makeRepo(), getSocialNotificador()).ejecutar(
      c.req.param("id"),
      session.user.id,
      parsed.data.contenido,
      parsed.data.padreId,
    )
    return c.json(comentario, 201)
  } catch (err) { return handleError(err, c) as Response }
})

publicacionStaffRouter.put("/comentarios/publicacion/:comentarioId", async (c) => {
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = ComentarioSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

  try {
    const comentario = await new EditarComentarioPublicacionUseCase(makeRepo()).ejecutar(
      c.req.param("comentarioId"),
      session.user.id,
      parsed.data.contenido,
      getRol(c),
    )
    return c.json(comentario)
  } catch (err) { return handleError(err, c) as Response }
})

publicacionStaffRouter.delete("/comentarios/publicacion/:comentarioId", async (c) => {
  const session = c.get("session")
  try {
    const result = await new EliminarComentarioPublicacionUseCase(makeRepo()).ejecutar(
      c.req.param("comentarioId"),
      session.user.id,
      getRol(c),
    )
    return c.json(result)
  } catch (err) { return handleError(err, c) as Response }
})

publicacionStaffRouter.post("/publicaciones/:id/compartir", async (c) => {
  const session = c.get("session")
  const body = await c.req.json()
  const parsed = CompartirSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)

  try {
    const compartido = await new CompartirPublicacionUseCase(makeRepo()).ejecutar(
      c.req.param("id"),
      session.user.id,
      parsed.data.plataforma,
    )
    return c.json(compartido, 201)
  } catch (err) { return handleError(err, c) as Response }
})
