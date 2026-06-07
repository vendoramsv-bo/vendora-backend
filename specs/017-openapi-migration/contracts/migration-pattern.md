# Contrato de Migración — Patrón Canónico

Este documento define el patrón exacto de migración de un router `Hono` a `OpenAPIHono`.
Todos los routers del proyecto DEBEN seguir este patrón sin variaciones.

---

## Patrón: Router individual (`*.rest.ts`)

### ANTES

```typescript
import { Hono } from "hono"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { CategoriaCreateSchema } from "./catalogo.schema.js"

export const categoriaRouter = new Hono<HonoEnv>()

categoriaRouter.get("/categorias", async (c) => {
  const tenantId = c.get("tenantId")
  // ... handler
  return c.json({ data: categorias })
})

categoriaRouter.post("/categorias", requireRol(["PROPIETARIO", "ADMIN"]), async (c) => {
  const body = await c.req.json()
  const parsed = CategoriaCreateSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "VALIDACION" }, 400)
  // ... handler
  return c.json(result, 201)
})
```

### DESPUÉS

```typescript
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import type { HonoEnv } from "../../../core/hono-context.js"
import { requireRol } from "../../../core/hono-context.js"
import { CategoriaCreateSchema, CategoriaItemSchema } from "./catalogo.schema.js"
import { okResponse, createdResponse, errorResponses } from "../../../core/openapi-responses.js"

export const categoriaRouter = new OpenAPIHono<HonoEnv>()

categoriaRouter.openapi(
  createRoute({
    method: "get",
    path: "/categorias",
    operationId: "catalogo_listar_categorias",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    responses: {
      200: okResponse("Lista de categorías", z.array(CategoriaItemSchema)),
      ...errorResponses,
    },
  }),
  async (c) => {
    const tenantId = c.get("tenantId")
    // ... handler sin cambios
    return c.json({ data: categorias })
  },
)

categoriaRouter.openapi(
  createRoute({
    method: "post",
    path: "/categorias",
    operationId: "catalogo_crear_categoria",
    tags: ["Catálogo"],
    security: [{ bearerAuth: [] }],
    request: {
      body: { content: { "application/json": { schema: CategoriaCreateSchema } } },
    },
    responses: {
      201: createdResponse("Categoría creada", CategoriaItemSchema),
      ...errorResponses,
    },
  }),
  requireRol(["PROPIETARIO", "ADMIN"]),
  async (c) => {
    // El body ya fue validado por OpenAPIHono antes de llegar aquí
    const body = c.req.valid("json")
    // ... handler sin cambios sustanciales
    return c.json(result, 201)
  },
)
```

**Nota importante**: Con `OpenAPIHono`, el body validado se obtiene con
`c.req.valid("json")` en lugar de `await c.req.json()` + `Schema.safeParse()`.
El framework ya ejecutó la validación Zod antes de invocar el handler.

---

## Patrón: Agregador (`*-router.ts`)

### ANTES

```typescript
import { Hono } from "hono"
import { requireAuth, requireTenantActivo, type HonoEnv } from "../../../core/hono-context.js"
import { categoriaRouter } from "./categoria.rest.js"

const catalogoApp = new Hono<HonoEnv>()
catalogoApp.use("*", requireAuth, requireTenantActivo)
catalogoApp.route("/", categoriaRouter)

export { catalogoApp }
```

### DESPUÉS

```typescript
import { OpenAPIHono } from "@hono/zod-openapi"
import { requireAuth, requireTenantActivo, type HonoEnv } from "../../../core/hono-context.js"
import { categoriaRouter } from "./categoria.rest.js"

const catalogoApp = new OpenAPIHono<HonoEnv>()
catalogoApp.use("*", requireAuth, requireTenantActivo)  // Se mantiene igual
catalogoApp.route("/", categoriaRouter)                  // Se mantiene igual

export { catalogoApp }
```

Solo cambia `new Hono<HonoEnv>()` → `new OpenAPIHono<HonoEnv>()`.
El `.use()` y los `.route()` se mantienen idénticos.

---

## Patrón: Better-Auth catch-all

```typescript
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import { auth } from "../infrastructure/better-auth.setup.js"
import { requireAuth, type HonoEnv } from "../../../core/hono-context.js"

export const authRouter = new OpenAPIHono<HonoEnv>()

// Stub documentativo — el handler real sigue siendo el catch-all de Better-Auth
authRouter.openapi(
  createRoute({
    method: "get",
    path: "/auth/{...path}",
    operationId: "auth_catch_all_better_auth",
    tags: ["Autenticación"],
    description:
      "Endpoints nativos de Better-Auth (sign-in, sign-up, sign-out, session, etc.). " +
      "Ver documentación en https://www.better-auth.com/docs",
    request: {
      params: z.object({ path: z.string() }),
    },
    responses: {
      200: { description: "Respuesta de Better-Auth (varía por ruta)" },
    },
  }),
  (c) => auth.handler(c.req.raw),
)

// DELETE /api/user — con schema explícito
authRouter.openapi(
  createRoute({
    method: "delete",
    path: "/user",
    operationId: "auth_eliminar_usuario",
    tags: ["Autenticación"],
    security: [{ bearerAuth: [] }],
    responses: {
      204: { description: "Usuario eliminado correctamente" },
      ...errorResponses,
    },
  }),
  requireAuth,
  async (c) => {
    // ... handler sin cambios
  },
)
```

---

## Patrón: `openapi-responses.ts`

```typescript
// src/core/openapi-responses.ts
import { z } from "@hono/zod-openapi"

export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
})

export function okResponse(description: string, schema: z.ZodTypeAny) {
  return {
    description,
    content: { "application/json": { schema } },
  }
}

export function createdResponse(description: string, schema: z.ZodTypeAny) {
  return {
    description,
    content: { "application/json": { schema } },
  }
}

export const errorResponses = {
  400: { description: "Solicitud inválida" },
  401: { description: "No autenticado" },
  403: { description: "Sin permiso" },
  404: { description: "No encontrado" },
  409: { description: "Conflicto de unicidad" },
  422: { description: "Validación fallida" },
} as const
```

---

## Patrón: Swagger UI en `hono.ts`

```typescript
import { swaggerUI } from "@hono/swagger-ui"

// En crearApp(), DESPUÉS de app.doc(...)
app.get("/api/docs", swaggerUI({ url: "/api/openapi.json" }))
```

---

## Patrón: Test de unicidad de operationId

```typescript
// tests/integration/openapi.spec.ts
import { describe, it, expect } from "vitest"
import { crearApp } from "../../src/server/hono.js"

describe("OpenAPI spec", () => {
  it("GET /api/openapi.json tiene más de 100 paths", async () => {
    const app = crearApp()
    const res = await app.request("/api/openapi.json")
    const spec = await res.json()
    expect(Object.keys(spec.paths).length).toBeGreaterThan(100)
  })

  it("todos los operationId son únicos", async () => {
    const app = crearApp()
    const res = await app.request("/api/openapi.json")
    const spec = await res.json()

    const operationIds: string[] = []
    for (const pathItem of Object.values(spec.paths)) {
      for (const operation of Object.values(pathItem as object)) {
        if ((operation as any).operationId) {
          operationIds.push((operation as any).operationId)
        }
      }
    }

    const uniqueIds = new Set(operationIds)
    expect(uniqueIds.size).toBe(operationIds.length)
  })
})
```

---

## Reglas de naming de operationId

| Caso | Patrón | Ejemplo |
|------|--------|---------|
| Listar recursos | `{módulo}_listar_{recurso}` | `catalogo_listar_categorias` |
| Crear recurso | `{módulo}_crear_{recurso}` | `ventas_crear_venta` |
| Obtener por ID | `{módulo}_obtener_{recurso}` | `consultorio_obtener_paciente` |
| Actualizar | `{módulo}_actualizar_{recurso}` | `almacen_actualizar_insumo` |
| Eliminar | `{módulo}_eliminar_{recurso}` | `catalogo_eliminar_producto` |
| Acción | `{módulo}_{accion}_{recurso}` | `ventas_confirmar_venta` |
| Sub-recurso | `{módulo}_{accion}_{padre}_{hijo}` | `catalogo_listar_producto_variantes` |
| Módulo prefijado | `{scope}_{módulo}_{accion}_{recurso}` | `consultorio_publico_listar_consultorios` |
