import { OpenAPIHono } from "@hono/zod-openapi"
import { requireAuth, type HonoEnv } from "../../../core/hono-context.js"
import { productoSocialRouter, publicProductoSocialRouter } from "./producto-social.rest.js"
import { tiendaSocialRouter, publicTiendaSocialRouter } from "./tienda-social.rest.js"
import { publicacionStaffRouter } from "./publicacion-staff.rest.js"
import { publicacionPublicaRouter } from "./publicacion-publica.rest.js"
import { restauranteSocialConsumerRouter } from "./restaurante-social-consumer.rest.js"
import { restauranteSocialStaffRouter } from "./restaurante-social-staff.rest.js"
import { publicRestauranteSocialRouter } from "./restaurante-social-publica.rest.js"
import { consultorioSocialConsumerRouter } from "./consultorio-social-consumer.rest.js"
import { consultorioSocialStaffRouter } from "./consultorio-social-staff.rest.js"
import { consultorioSocialPublicaRouter } from "./consultorio-social-publica.rest.js"

// ─── Rutas autenticadas (/api/social) ─────────────────────────────────────────

export const socialApp = new OpenAPIHono<HonoEnv>()

socialApp.use("*", requireAuth)

socialApp.route("/", productoSocialRouter)
socialApp.route("/", tiendaSocialRouter)
socialApp.route("/", publicacionStaffRouter)
socialApp.route("/restaurantes", restauranteSocialConsumerRouter)
socialApp.route("/staff/restaurantes", restauranteSocialStaffRouter)
socialApp.route("/consultorios", consultorioSocialConsumerRouter)
socialApp.route("/staff/consultorios", consultorioSocialStaffRouter)

// ─── Rutas públicas (/api/public/social) ──────────────────────────────────────

export const publicSocialApp = new OpenAPIHono<HonoEnv>()

publicSocialApp.route("/", publicProductoSocialRouter)
publicSocialApp.route("/", publicTiendaSocialRouter)
publicSocialApp.route("/", publicacionPublicaRouter)
publicSocialApp.route("/restaurantes", publicRestauranteSocialRouter)
publicSocialApp.route("/consultorios", consultorioSocialPublicaRouter)
