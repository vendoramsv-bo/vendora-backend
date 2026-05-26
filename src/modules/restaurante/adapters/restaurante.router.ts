import { Hono } from "hono"
import { requireAuth, requireTenantActivo, requireRestaurante, type HonoEnv } from "../../../core/hono-context.js"
import { restaurantePerfilRouter } from "./restaurante.rest.js"
import { tiempoComidaRouter } from "./tiempo-comida.rest.js"
import { menuRouter, publicMenuRouter } from "./menu.rest.js"
import { menuItemRouter } from "./menu-item.rest.js"
import { reservaRouter } from "./reserva.rest.js"
import { reservaPublicaRouter } from "./reserva-publica.rest.js"
import { cocinaRouter } from "./cocina.rest.js"
import { publicacionRRSSRouter } from "./publicacion-rrss.rest.js"

// ─── Staff router (auth required) ────────────────────────────────────────────

const restauranteApp = new Hono<HonoEnv>()

restauranteApp.use("*", requireAuth, requireTenantActivo, requireRestaurante)

restauranteApp.route("/", restaurantePerfilRouter)
restauranteApp.route("/", tiempoComidaRouter)
restauranteApp.route("/", menuRouter)
restauranteApp.route("/", menuItemRouter)
restauranteApp.route("/", reservaRouter)
restauranteApp.route("/", cocinaRouter)
restauranteApp.route("/", publicacionRRSSRouter)

// ─── Public router (no auth) ──────────────────────────────────────────────────

const publicRestauranteApp = new Hono<HonoEnv>()

publicRestauranteApp.route("/", publicMenuRouter)
publicRestauranteApp.route("/", reservaPublicaRouter)

export { restauranteApp, publicRestauranteApp }
