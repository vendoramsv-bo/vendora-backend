import { Hono } from "hono"
import { requireAuth, type HonoEnv } from "../../../core/hono-context.js"
import { productoSocialRouter, publicProductoSocialRouter } from "./producto-social.rest.js"
import { tiendaSocialRouter, publicTiendaSocialRouter } from "./tienda-social.rest.js"
import { publicacionStaffRouter } from "./publicacion-staff.rest.js"
import { publicacionPublicaRouter } from "./publicacion-publica.rest.js"

// ─── Rutas autenticadas (/api/social) ─────────────────────────────────────────

export const socialApp = new Hono<HonoEnv>()

socialApp.use("*", requireAuth)

socialApp.route("/", productoSocialRouter)
socialApp.route("/", tiendaSocialRouter)
socialApp.route("/", publicacionStaffRouter)

// ─── Rutas públicas (/api/public/social) ──────────────────────────────────────

export const publicSocialApp = new Hono<HonoEnv>()

publicSocialApp.route("/", publicProductoSocialRouter)
publicSocialApp.route("/", publicTiendaSocialRouter)
publicSocialApp.route("/", publicacionPublicaRouter)
