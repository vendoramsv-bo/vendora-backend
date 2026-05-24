import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireAuth, requireTenantActivo } from "../../../core/hono-context.js"
import { clienteRouter } from "./cliente.rest.js"
import { proveedorRouter } from "./proveedor.rest.js"
import { compraRouter } from "./compra.rest.js"

const ventasApp = new Hono<HonoEnv>()
ventasApp.use("*", requireAuth, requireTenantActivo)
ventasApp.route("/clientes", clienteRouter)
ventasApp.route("/proveedores", proveedorRouter)
ventasApp.route("/compras", compraRouter)

export { ventasApp }
