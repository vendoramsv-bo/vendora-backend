import { OpenAPIHono } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireAuth, requireTenantActivo, resolverMiembroActivo } from "../../../core/hono-context.js"
import { clienteRouter } from "./cliente.rest.js"
import { proveedorRouter } from "./proveedor.rest.js"
import { compraRouter } from "./compra.rest.js"
import { puntoVentaRouter } from "./punto-venta.rest.js"
import { turnoAtencionRouter } from "./turno-atencion.rest.js"
import { cajaRouter } from "./caja.rest.js"
import { ventaRouter } from "./venta.rest.js"
import { pedidoRouter } from "./pedido.rest.js"
import { gastosRouter } from "./gastos.rest.js"

const ventasApp = new OpenAPIHono<HonoEnv>()
// `resolverMiembroActivo` se monta en toda la app y no ruta por ruta: deja en el
// contexto el `TenantMember.id` que firma la autoría y el alcance de los datos
// (023 contracts §A.5). No agrega consultas — **reemplaza** la que `requireRol`
// hacía en cada endpoint guardado.
ventasApp.use("*", requireAuth, requireTenantActivo, resolverMiembroActivo)
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
