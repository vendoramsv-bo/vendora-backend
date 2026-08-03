import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import { requireAuth, type HonoEnv } from "../../../core/hono-context.js"
import { prisma } from "../../autenticacion/infrastructure/better-auth.setup.js"
import { PedidoPrismaRepository } from "../infrastructure/pedido.prisma.repository.js"
import { CrearPedidoUseCase } from "../application/pedido/crear-pedido.usecase.js"
import { CrearPedidoSchema } from "./ventas.schema.js"
import { getVentasNotificador } from "../infrastructure/ventas.notificador.provider.js"
import { NotificacionPrismaRepository } from "../../notificacion/infrastructure/notificacion.prisma.repository.js"
import { getNotificacionNotificador } from "../../notificacion/infrastructure/notificacion.notificador.provider.js"
import { CrearNotificacionUseCase } from "../../notificacion/application/notificacion.usecases.js"
import { errorResponses, createdResponse } from "../../../core/openapi-responses.js"

/**
 * Pedidos que un visitante hace desde la vitrina pública de un comercio
 * (spec 019 — FR-009 … FR-019).
 *
 * La diferencia con `pedidoRouter` es de una línea y es toda la feature: aquel
 * resuelve el comercio destinatario con `c.get("tenantId")` —el tenant ACTIVO de
 * quien llama—, y este lo resuelve desde el **slug de la ruta**. Un visitante
 * parado en la vitrina de otro comercio no tiene tenant activo, o tiene el suyo:
 * con la ruta de staff su pedido iría al lugar equivocado (SC-004).
 *
 * Sigue el patrón que ya establecieron las reservas de restaurante
 * (`restaurante-publica.rest.ts` → `POST /api/consumer/restaurantes/{slug}/reservas`):
 * `requireAuth` sin `requireTenantActivo`, comercio por slug, persona por sesión.
 *
 * `CrearPedidoUseCase` recibe `tenantId` y `userId` como entradas planas, así que
 * se reutiliza tal cual — no se duplica ni una línea de lógica de pedido.
 */
export const pedidoConsumerRouter = new OpenAPIHono<HonoEnv>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

function makeRepo() { return new PedidoPrismaRepository(db) }

pedidoConsumerRouter.use("*", requireAuth)

/** Un comercio a medio crear no recibe pedidos, igual que no tiene vitrina (FR-018). */
async function resolverTiendaPublicada(slug: string): Promise<string | null> {
  const tenant = await db.tenant.findFirst({
    where: { slug, esTienda: true, estado: "FINALIZADO" },
    select: { id: true },
  })
  return tenant?.id ?? null
}

/**
 * Líneas que ya no se pueden encargar: el producto se retiró, se ocultó, o
 * pertenece a otro comercio (FR-019).
 *
 * La segunda condición es la que evita que alguien arme un pedido con productos
 * ajenos y se los facture a este comercio.
 */
async function detectarLineasCaidas(
  tenantId: string,
  detalles: { productoId: string }[],
): Promise<{ productoId: string; motivo: string }[]> {
  const ids = detalles.map((d) => d.productoId)
  const disponibles = await db.producto.findMany({
    where: { id: { in: ids }, tenantId, estado: "ACTIVO" },
    select: { id: true },
  })
  const idsDisponibles = new Set(disponibles.map((p: { id: string }) => p.id))

  return detalles
    .filter((d) => !idsDisponibles.has(d.productoId))
    .map((d) => ({ productoId: d.productoId, motivo: "NO_DISPONIBLE" }))
}

pedidoConsumerRouter.openapi(
  createRoute({
    method: "post",
    path: "/{slug}/pedidos",
    operationId: "ventas_consumer_crear_pedido",
    tags: ["Ventas"],
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      201: createdResponse("Pedido creado", z.record(z.string(), z.unknown())),
      ...errorResponses,
    },
  }),
  async (c) => {
    const slug = c.req.param("slug")
    const session = c.get("session")

    const tenantId = await resolverTiendaPublicada(slug)
    // Indistinguible de un slug inexistente, igual que la vitrina (SC-012).
    if (!tenantId) return c.json({ error: "TIENDA_NO_ENCONTRADA" }, 404)

    const body = await c.req.json()
    const parsed = CrearPedidoSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: "VALIDACION", details: parsed.error.flatten() }, 400)
    }

    const lineasCaidas = await detectarLineasCaidas(tenantId, parsed.data.detalles)
    if (lineasCaidas.length > 0) {
      // 422 y no 400: el cuerpo es válido, lo que cambió es el mundo. El cliente
      // identifica las líneas, las quita y reenvía el resto (FR-019).
      return c.json({ error: "LINEAS_NO_DISPONIBLES", lineas: lineasCaidas }, 422)
    }

    const pedido = await new CrearPedidoUseCase(makeRepo(), getVentasNotificador()).execute({
      tenantId,
      userId: session.user.id,
      detalles: parsed.data.detalles,
      respuesta: parsed.data.respuesta,
      createdById: session.user.id,
    })

    // Acuse para quien lo hizo: es la novedad que hace subir el contador de la
    // barra superior sin recargar (spec 019 FR-033).
    await new CrearNotificacionUseCase(
      new NotificacionPrismaRepository(),
      getNotificacionNotificador(),
    ).execute({
      tenantId,
      userId: session.user.id,
      actorUserId: session.user.id,
      titulo: "Pedido enviado",
      mensaje: "Tu pedido llegó a la tienda. Te avisamos cuando lo atiendan.",
      referenciaTipo: "PEDIDO",
      referenciaId: pedido.id,
    })

    return c.json(pedido, 201)
  },
)
