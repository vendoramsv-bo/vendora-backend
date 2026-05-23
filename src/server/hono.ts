import { OpenAPIHono } from "@hono/zod-openapi"
import pino from "pino"
import type { Variables } from "../core/hono-context.js"
import { consultorioApp } from "../modules/consultorio/adapters/consultorio-router.js"
import { catalogoApp } from "../modules/catalogo/adapters/catalogo-router.js"
import { almacenApp } from "../modules/almacen/adapters/almacen-router.js"

export const logger = pino({ level: process.env.LOG_LEVEL ?? "info" })

export function crearApp() {
  const app = new OpenAPIHono<{ Variables: Variables }>()

  // Logging HTTP básico con Pino
  app.use("*", async (c, next) => {
    const start = Date.now()
    await next()
    const ms = Date.now() - start
    logger.info(
      { method: c.req.method, path: c.req.path, status: c.res.status, ms },
      "[http] request",
    )
  })

  // Handler de errores JSON estándar
  app.onError((err, c) => {
    logger.error({ err, path: c.req.path }, "[http] error no manejado")
    const status = "status" in err ? (err as { status: number }).status : 500
    return c.json(
      { error: "INTERNAL_ERROR", message: err.message ?? "Error interno del servidor" },
      (status >= 400 && status < 600 ? status : 500) as 400 | 401 | 403 | 404 | 429 | 500,
    )
  })

  app.notFound((c) =>
    c.json({ error: "NOT_FOUND", message: "Ruta no encontrada" }, 404),
  )

  // Módulo consultorio
  app.route("/api/consultorio", consultorioApp)

  // Módulo catálogo comercial
  app.route("/api/catalogo", catalogoApp)

  // Módulo almacén e inventario
  app.route("/api/almacen", almacenApp)

  // Spec OpenAPI (T049)
  app.doc("/api/openapi.json", {
    openapi: "3.1.0",
    info: { title: "Vendora API", version: "0.1.0" },
  })

  return app
}

export type App = ReturnType<typeof crearApp>
