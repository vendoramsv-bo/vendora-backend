import "dotenv/config"
import { serve } from "@hono/node-server"
import { Server } from "socket.io"
import { createAdapter } from "@socket.io/redis-adapter"
import { Redis } from "ioredis"
import { crearApp } from "./hono.js"
import { authRouter } from "../modules/autenticacion/adapters/auth.rest.js"
import { tenantRouter } from "../modules/tenant/adapters/tenant.rest.js"
import { auth, prisma } from "../modules/autenticacion/infrastructure/better-auth.setup.js"
import { TenantSocketNotificador } from "../modules/tenant/infrastructure/tenant.socket.notificador.js"
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
import { tiendaStaffRouter } from "../modules/tienda/adapters/tienda-staff.rest.js"
import { tiendaPublicaRouter } from "../modules/tienda/adapters/tienda-publica.rest.js"
import { ConsultorioPublicoSocketNotificador } from "../modules/consultorio/infrastructure/consultorio-publico.socket.notificador.js"
import { setConsultorioPublicoNotificador } from "../modules/consultorio/infrastructure/consultorio-publico.notificador.provider.js"
import { ConsultorioSocialSocketNotificador } from "../modules/social/infrastructure/consultorio-social.socket.notificador.js"
import { setConsultorioSocialNotificador } from "../modules/social/infrastructure/consultorio-social.notificador.provider.js"
import { consultorioPublicaRouter } from "../modules/consultorio/adapters/consultorio-publica.rest.js"
import { consultorioConsumerCitasRouter } from "../modules/consultorio/adapters/consultorio-consumer-citas.rest.js"
import { consultorioStaffPublicoRouter } from "../modules/consultorio/adapters/consultorio-staff-publico.rest.js"
import "../workers/recordatorio-cita.worker.js"
import "../workers/expirar-recetas.worker.js"
import "../modules/restaurante/infrastructure/publicacion-rrss.bullmq.worker.js"
import { expirarRecetasQueue } from "../core/recordatorios.queue.js"
import pino from "pino"

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" })

// ─── Hono app ─────────────────────────────────────────────────────────────────

const app = crearApp()

// T016 — router de autenticación (Better-Auth + DELETE /api/user)
app.route("/api", authRouter)

// T029 — router de tenant (endpoints de lectura scoped)
app.route("/api/tenant", tenantRouter)

// TuTienda — staff (configuración, destacados) y directorio público
app.route("/api/tenant", tiendaStaffRouter)
app.route("/api/public/tiendas", tiendaPublicaRouter)

// TuConsultorio — perfil público, directorio y citas online
app.route("/api/public/consultorios", consultorioPublicaRouter)
app.route("/api/consumer/consultorios", consultorioConsumerCitasRouter)
app.route("/api/consultorio", consultorioStaffPublicoRouter)

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
  ...(redisUrl.startsWith("rediss://") ? { tls: {} } : {}),
})
const subClient = pubClient.duplicate({ enableReadyCheck: false })

// Conectar Redis en background (no bloqueante al arranque)
Promise.all([pubClient.connect(), subClient.connect()]).catch((err) => {
  logger.warn({ err }, "[redis] No se pudo conectar — Socket.IO funcionará sin adaptador Redis")
})

export const io = new Server(httpServer as never, {
  cors: { origin: process.env.APP_URL, credentials: true },
})

pubClient.on("connect", () => {
  io.adapter(createAdapter(pubClient, subClient))
  logger.info("[redis] Socket.IO Redis adapter conectado")
})

// T047 — TenantSocketNotificador (reemplaza NullTenantNotificador de US2-US4)
export const socketNotificador = new TenantSocketNotificador(io)

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

// VentasSocketNotificador — emite eventos ventas:* al room tenant:{id}
export const ventasNotificador = new VentasSocketNotificador(io)
setVentasNotificador(ventasNotificador)

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

  logger.info(
    { userId: session.user.id, rooms: membresías.length },
    "[socket] cliente conectado y suscrito a rooms de tenant",
  )
})

export { app }
