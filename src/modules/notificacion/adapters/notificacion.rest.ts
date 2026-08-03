import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import { requireAuth, type HonoEnv } from "../../../core/hono-context.js"
import { NotificacionPrismaRepository } from "../infrastructure/notificacion.prisma.repository.js"
import { getNotificacionNotificador } from "../infrastructure/notificacion.notificador.provider.js"
import {
  ListarNotificacionesUseCase,
  ContarNoLeidasUseCase,
  MarcarLeidaUseCase,
} from "../application/notificacion.usecases.js"
import { errorResponses, okResponse } from "../../../core/openapi-responses.js"

/**
 * Notificaciones personales (spec 019 FR-032 … FR-034).
 *
 * `requireAuth` sin `requireTenantActivo`: una notificación es de una persona, y
 * quien la lee desde la vitrina de un comercio ajeno no tiene tenant activo.
 *
 * Todas las consultas salen del `userId` de la sesión, nunca de un parámetro:
 * no hay forma de pedir las notificaciones de otra persona.
 */
export const notificacionRouter = new OpenAPIHono<HonoEnv>()

notificacionRouter.use("*", requireAuth)

function makeRepo() { return new NotificacionPrismaRepository() }

notificacionRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    operationId: "notificacion_listar",
    tags: ["Notificaciones"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Notificaciones del usuario", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const q = c.req.query()
    const resultado = await new ListarNotificacionesUseCase(makeRepo()).execute(
      c.get("session").user.id,
      { take: Math.min(Number(q.take ?? 20), 100), page: Number(q.page ?? 1) },
    )
    return c.json(resultado)
  },
)

notificacionRouter.openapi(
  createRoute({
    method: "get",
    path: "/no-leidas/count",
    operationId: "notificacion_contar_no_leidas",
    tags: ["Notificaciones"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Conteo de no leídas", z.object({ count: z.number() })),
      ...errorResponses,
    },
  }),
  async (c) => {
    const count = await new ContarNoLeidasUseCase(makeRepo()).execute(c.get("session").user.id)
    return c.json({ count })
  },
)

notificacionRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{id}/leida",
    operationId: "notificacion_marcar_leida",
    tags: ["Notificaciones"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: okResponse("Notificación marcada como leída", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const notificacion = await new MarcarLeidaUseCase(
      makeRepo(),
      getNotificacionNotificador(),
    ).execute(c.req.param("id"), c.get("session").user.id)

    // Una notificación ajena responde 404, igual que una inexistente: no se
    // filtra que existe pero es de otra persona.
    if (!notificacion) return c.json({ error: "NO_ENCONTRADA" }, 404)
    return c.json(notificacion)
  },
)
