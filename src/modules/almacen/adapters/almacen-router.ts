import { OpenAPIHono } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireAuth, requireTenantActivo, resolverMiembroActivo } from "../../../core/hono-context.js"
import { inventarioRouter } from "./inventario.rest.js"
import { insumoRouter } from "./insumo.rest.js"
import { almacenOperacionesRouter } from "./almacen-operaciones.rest.js"
import { recetaRouter } from "./receta.rest.js"

const almacenApp = new OpenAPIHono<HonoEnv>()
// `resolverMiembroActivo` se monta en toda la app y no ruta por ruta: deja en el
// contexto el `TenantMember.id` que firma la autoría y el alcance de los datos
// (023 contracts §A.5). No agrega consultas — **reemplaza** la que `requireRol`
// hacía en cada endpoint guardado.
almacenApp.use("*", requireAuth, requireTenantActivo, resolverMiembroActivo)
almacenApp.route("/", inventarioRouter)
almacenApp.route("/insumos", insumoRouter)
almacenApp.route("/", almacenOperacionesRouter)
almacenApp.route("/", recetaRouter)

export { almacenApp }
