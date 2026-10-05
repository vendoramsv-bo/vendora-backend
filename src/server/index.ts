import "dotenv/config"
import { serve } from "@hono/node-server"
import { Server } from "socket.io"
import { createAdapter } from "@socket.io/redis-adapter"
import { Redis } from "ioredis"
import { S3Client } from "@aws-sdk/client-s3"
import { R2AlmacenamientoAdapter } from "../modules/tenant/infrastructure/r2.almacenamiento.adapter.js"
import { setAlmacenamientoPort } from "../modules/tenant/infrastructure/almacenamiento.port.provider.js"
import { auth, prisma } from "../modules/autenticacion/infrastructure/better-auth.setup.js"
import { TenantSocketNotificador } from "../modules/tenant/infrastructure/tenant.socket.notificador.js"
import { setTenantNotificador } from "../modules/tenant/infrastructure/tenant.notificador.provider.js"
import { registrarActivadorVertical } from "../modules/tenant/infrastructure/activador-vertical.provider.js"
import { TiendaActivadorVertical } from "../modules/tienda/infrastructure/tienda.activador-vertical.js"
import { ConsultorioActivadorVertical } from "../modules/consultorio/infrastructure/consultorio.activador-vertical.js"
import { RestauranteActivadorVertical } from "../modules/restaurante/infrastructure/restaurante.activador-vertical.js"
import { ConsultorioSocketNotificador } from "../modules/consultorio/infrastructure/consultorio.socket.notificador.js"
import { setConsultorioNotificador } from "../modules/consultorio/infrastructure/consultorio.notificador.provider.js"
import { CatalogoSocketNotificador } from "../modules/catalogo/infrastructure/catalogo.socket.notificador.js"
import { setCatalogoNotificador } from "../modules/catalogo/infrastructure/catalogo.notificador.provider.js"
import { AlmacenSocketNotificador } from "../modules/almacen/infrastructure/almacen.socket.notificador.js"
import { setAlmacenNotificador } from "../modules/almacen/infrastructure/almacen.notificador.provider.js"
import { AlmacenInventarioPortAdapter } from "../modules/almacen/infrastructure/almacen-inventario.port.adapter.js"
import { InventarioProductoPrismaRepository } from "../modules/almacen/infrastructure/inventario-producto.prisma.repository.js"
import { setAlmacenInventarioPort } from "../modules/almacen/infrastructure/almacen-inventario.port.provider.js"
import { VentasSocketNotificador } from "../modules/ventas/infrastructure/ventas.socket.notificador.js"
import { setVentasNotificador } from "../modules/ventas/infrastructure/ventas.notificador.provider.js"
import { NotificacionSocketNotificador } from "../modules/notificacion/infrastructure/notificacion.socket.notificador.js"
import { setNotificacionNotificador } from "../modules/notificacion/infrastructure/notificacion.notificador.provider.js"
import { RestauranteSocketNotificador } from "../modules/restaurante/infrastructure/restaurante.socket.notificador.js"
import { setRestauranteNotificador } from "../modules/restaurante/infrastructure/restaurante.notificador.provider.js"
import { SocialSocketNotificador } from "../modules/social/infrastructure/social.socket.notificador.js"
import { setSocialNotificador } from "../modules/social/infrastructure/social.notificador.provider.js"
import { TiendaSocketNotificador } from "../modules/tienda/infrastructure/tienda.socket.notificador.js"
import { setTiendaNotificador } from "../modules/tienda/infrastructure/tienda.notificador.provider.js"
import { RestauranteSocialSocketNotificador } from "../modules/social/infrastructure/restaurante-social.socket.notificador.js"
import { setRestauranteSocialNotificador } from "../modules/social/infrastructure/restaurante-social.notificador.provider.js"
import { RestaurantePublicoSocketNotificador } from "../modules/restaurante/infrastructure/restaurante-publico.socket.notificador.js"
import { setRestaurantePublicoNotificador } from "../modules/restaurante/infrastructure/restaurante-publico.notificador.provider.js"
import { ConsultorioPublicoSocketNotificador } from "../modules/consultorio/infrastructure/consultorio-publico.socket.notificador.js"
import { setConsultorioPublicoNotificador } from "../modules/consultorio/infrastructure/consultorio-publico.notificador.provider.js"
import { ConsultorioSocialSocketNotificador } from "../modules/social/infrastructure/consultorio-social.socket.notificador.js"
import { setConsultorioSocialNotificador } from "../modules/social/infrastructure/consultorio-social.notificador.provider.js"
import "../workers/recordatorio-cita.worker.js"
import "../workers/expirar-recetas.worker.js"
import "../modules/restaurante/infrastructure/publicacion-rrss.bullmq.worker.js"
import { expirarRecetasQueue } from "../core/recordatorios.queue.js"
import pino from "pino"
import { crearAppCompleta } from "./app.js"

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" })

// ─── Hono app ─────────────────────────────────────────────────────────────────

const app = crearAppCompleta()

// R2AlmacenamientoAdapter — firma URLs PUT prefirmadas contra el bucket "vendora"
if (process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) {
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  })
  setAlmacenamientoPort(
    new R2AlmacenamientoAdapter({
      s3,
      bucket: process.env.R2_BUCKET_NAME ?? "vendora",
      publicBaseUrl: process.env.R2_PUBLIC_BASE_URL ?? "",
    }),
  )
} else {
  logger.warn("[r2] Variables de entorno de R2 no configuradas — /api/tenant/upload-url responderá 500")
}

// ─── HTTP Server ──────────────────────────────────────────────────────────────

const port = Number(process.env.PORT ?? 3000)

// T043 — @hono/node-server devuelve http.Server; Socket.IO se adjunta a él
export const httpServer = serve({ fetch: app.fetch, port }, (info) => {
  logger.info({ port: info.port }, "[server] Vendora Backend corriendo")
})

// Schedule daily job to expire recetas at 02:00 AM
expirarRecetasQueue
  .add("expirar", {}, { repeat: { pattern: "0 2 * * *" }, jobId: "expirar-recetas-diario" })
  .catch((err) => logger.warn({ err }, "[expirar-recetas] No se pudo registrar job repetible"))

// ─── Socket.IO ────────────────────────────────────────────────────────────────

// T043 — Redis adapter para soporte horizontal
// Upstash usa rediss:// (TLS) — ioredis necesita { tls: {} } explícito para TLS
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379"
const pubClient = new Redis(redisUrl, {
  lazyConnect: true,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
  ...(redisUrl.startsWith("rediss://") ? { tls: {} } : {}),
})
const subClient = pubClient.duplicate({ enableReadyCheck: false, maxRetriesPerRequest: null })

pubClient.on("error", (err) => logger.warn({ err }, "[redis:pub] error"))
subClient.on("error", (err) => logger.warn({ err }, "[redis:sub] error"))

// Conectar Redis en background (no bloqueante al arranque)
Promise.all([pubClient.connect(), subClient.connect()]).catch((err) => {
  logger.warn({ err }, "[redis] No se pudo conectar — Socket.IO funcionará sin adaptador Redis")
})

const allowedOrigins = [
  process.env.APP_URL,
  ...(process.env.FRONTEND_URLS?.split(",").map((u) => u.trim()).filter(Boolean) ?? []),
].filter(Boolean) as string[]

export const io = new Server(httpServer as never, {
  cors: { origin: allowedOrigins, credentials: true },
})

pubClient.on("connect", () => {
  io.adapter(createAdapter(pubClient, subClient))
  logger.info("[redis] Socket.IO Redis adapter conectado")
})

// T047 — TenantSocketNotificador (reemplaza NullTenantNotificador de US2-US4)
export const socketNotificador = new TenantSocketNotificador(io)
setTenantNotificador(socketNotificador)

// ConsultorioSocketNotificador — emite eventos consultorio:* al room tenant:{id}
export const consultorioNotificador = new ConsultorioSocketNotificador(io)
setConsultorioNotificador(consultorioNotificador)

// CatalogoSocketNotificador — emite eventos catalogo:* al room tenant:{id}
export const catalogoNotificador = new CatalogoSocketNotificador(io)
setCatalogoNotificador(catalogoNotificador)

// AlmacenSocketNotificador — emite eventos almacen:* al room tenant:{id}
export const almacenNotificador = new AlmacenSocketNotificador(io)
setAlmacenNotificador(almacenNotificador)

// AlmacenInventarioPortAdapter — integración ventas → almacén (FR-019)
setAlmacenInventarioPort(new AlmacenInventarioPortAdapter(new InventarioProductoPrismaRepository(prisma as any)))

// 026 — cada vertical aporta su activación a /api/tenant/capabilities (el núcleo no las importa)
registrarActivadorVertical("tienda", new TiendaActivadorVertical())
registrarActivadorVertical("consultorio", new ConsultorioActivadorVertical())
registrarActivadorVertical("restaurante", new RestauranteActivadorVertical())

// VentasSocketNotificador — emite eventos ventas:* al room tenant:{id}
export const ventasNotificador = new VentasSocketNotificador(io)
setVentasNotificador(ventasNotificador)

// NotificacionSocketNotificador — emite notifications:unread:count al room user:{id}
export const notificacionNotificador = new NotificacionSocketNotificador(io)
setNotificacionNotificador(notificacionNotificador)

// RestauranteSocketNotificador — emite eventos restaurante:* al room tenant:{id}
export const restauranteNotificador = new RestauranteSocketNotificador(io)
setRestauranteNotificador(restauranteNotificador)

// SocialSocketNotificador — emite eventos social:* al room tenant:{id} y sub-salas
export const socialNotificador = new SocialSocketNotificador(io)
setSocialNotificador(socialNotificador)

// TiendaSocketNotificador — emite eventos tienda:* al room tenant:{id}
export const tiendaNotificador = new TiendaSocketNotificador(io)
setTiendaNotificador(tiendaNotificador)

// RestaurantePublicoSocketNotificador — emite eventos perfil-publico al room tenant:{id}:restaurante
setRestaurantePublicoNotificador(new RestaurantePublicoSocketNotificador(io))

// RestauranteSocialSocketNotificador — emite eventos restaurante:* al room tenant:{id}:restaurante
setRestauranteSocialNotificador(new RestauranteSocialSocketNotificador(io))

// ConsultorioPublicoSocketNotificador — emite eventos consultorio:* al room tenant:{id}:consultorio
setConsultorioPublicoNotificador(new ConsultorioPublicoSocketNotificador(io))

// ConsultorioSocialSocketNotificador — emite eventos consultorio:* al room tenant:{id}:consultorio
setConsultorioSocialNotificador(new ConsultorioSocialSocketNotificador(io))

// T045 — middleware de autenticación Socket.IO
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined

  if (!token) return next(new Error("unauthorized"))

  const session = await auth.api.getSession({
    headers: new Headers({ authorization: `Bearer ${token}` }),
  })

  if (!session) return next(new Error("unauthorized"))

  socket.data.session = session
  next()
})

// T046 — handler de conexión: suscribir socket a rooms de los tenants del usuario
io.on("connection", async (socket) => {
  const session = socket.data.session as { user: { id: string } } | undefined
  if (!session) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const membresías = await (prisma as any).tenantMember.findMany({
    where: { userId: session.user.id },
    select: { organizationId: true },
  })

  for (const { organizationId } of membresías) {
    await socket.join(`tenant:${organizationId}`)
  }

  // Room personal: una notificación le concierne a una persona, no a todo el
  // comercio. Es a donde emite `notifications:unread:count` (spec 019 FR-032).
  await socket.join(`user:${session.user.id}`)

  logger.info(
    { userId: session.user.id, rooms: membresías.length },
    "[socket] cliente conectado y suscrito a rooms de tenant",
  )
})

export { app }
