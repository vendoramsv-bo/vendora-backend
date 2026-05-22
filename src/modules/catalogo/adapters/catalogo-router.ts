import { Hono } from "hono"
import { requireAuth, requireTenantActivo, type HonoEnv } from "../../../core/hono-context.js"
import { actividadEconomicaRouter } from "./actividad-economica.rest.js"
import { unidadMedidaRouter } from "./unidad-medida.rest.js"
import { categoriaRouter } from "./categoria.rest.js"
import { productoRouter } from "./producto.rest.js"

const catalogoApp = new Hono<HonoEnv>()

catalogoApp.use("*", requireAuth, requireTenantActivo)

catalogoApp.route("/", actividadEconomicaRouter)
catalogoApp.route("/", unidadMedidaRouter)
catalogoApp.route("/", categoriaRouter)
catalogoApp.route("/", productoRouter)

export { catalogoApp }
