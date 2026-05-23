import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireAuth, requireTenantActivo } from "../../../core/hono-context.js"
import { inventarioRouter } from "./inventario.rest.js"
import { insumoRouter } from "./insumo.rest.js"
import { almacenOperacionesRouter } from "./almacen-operaciones.rest.js"
import { recetaRouter } from "./receta.rest.js"

const almacenApp = new Hono<HonoEnv>()
almacenApp.use("*", requireAuth, requireTenantActivo)
almacenApp.route("/", inventarioRouter)
almacenApp.route("/insumos", insumoRouter)
almacenApp.route("/", almacenOperacionesRouter)
almacenApp.route("/", recetaRouter)

export { almacenApp }
