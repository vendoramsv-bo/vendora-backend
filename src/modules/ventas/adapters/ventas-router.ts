import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireAuth, requireTenantActivo } from "../../../core/hono-context.js"
import { clienteRouter } from "./cliente.rest.js"
import { proveedorRouter } from "./proveedor.rest.js"
import { compraRouter } from "./compra.rest.js"
import { puntoVentaRouter } from "./punto-venta.rest.js"
import { turnoAtencionRouter } from "./turno-atencion.rest.js"
import { cajaRouter } from "./caja.rest.js"
import { ventaRouter } from "./venta.rest.js"
import { pedidoRouter } from "./pedido.rest.js"
import { gastosRouter } from "./gastos.rest.js"

const ventasApp = new Hono<HonoEnv>()
ventasApp.use("*", requireAuth, requireTenantActivo)
ventasApp.route("/clientes", clienteRouter)
ventasApp.route("/proveedores", proveedorRouter)
ventasApp.route("/compras", compraRouter)
ventasApp.route("/puntos-venta", puntoVentaRouter)
ventasApp.route("/turnos-atencion", turnoAtencionRouter)
ventasApp.route("/cajas", cajaRouter)
ventasApp.route("/ventas", ventaRouter)
ventasApp.route("/pedidos", pedidoRouter)
ventasApp.route("/gastos", gastosRouter)

export { ventasApp }
