# Data Model: Migración a OpenAPI — Feature 017

## Cambios en Prisma

**Ninguno.** Esta migración es cosmética en la capa de routing. No se agregan,
modifican ni eliminan tablas, columnas, relaciones ni enums de Prisma.

---

## Nuevas estructuras TypeScript

### `src/core/openapi-responses.ts` (nuevo archivo)

Helpers compartidos para declarar responses en todos los routers.

```typescript
import { z } from "@hono/zod-openapi"

// Error shapes comunes
export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
})

// Respuesta paginada genérica
export const PaginatedMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  take: z.number(),
  totalPaginas: z.number(),
  hayPaginaSiguiente: z.boolean(),
  hayPaginaAnterior: z.boolean(),
})

// Helpers de factory
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

// Responses de error reutilizables (se pasan como spread en `responses`)
export const errorResponses = {
  401: { description: "No autenticado" },
  403: { description: "Sin permiso" },
  404: { description: "No encontrado" },
  422: { description: "Validación fallida" },
  409: { description: "Conflicto de unicidad" },
}
```

---

### Patrón de `createRoute` por tipo de ruta

#### Ruta auth-required (sin rol específico)
```typescript
createRoute({
  method: "get",
  path: "/categorias",
  operationId: "catalogo_listar_categorias",
  tags: ["Catálogo"],
  security: [{ bearerAuth: [] }],
  request: {
    query: CategoriaListQuerySchema,
  },
  responses: {
    200: okResponse("Lista de categorías", z.array(CategoriaItemSchema)),
    ...errorResponses,
  },
})
```

#### Ruta auth-required con rol
```typescript
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
})
```

#### Ruta pública (sin auth)
```typescript
createRoute({
  method: "get",
  path: "/",
  operationId: "restaurante_publico_listar_restaurantes",
  tags: ["Restaurante Público"],
  // sin `security`
  responses: {
    200: okResponse("Directorio de restaurantes", z.array(RestaurantePublicoItemSchema)),
  },
})
```

---

### Convención de `operationId`

Patrón: `{módulo}_{verbo}_{recurso}` en camelCase.

| Módulo | Verbo | Recurso | operationId resultante |
|--------|-------|---------|----------------------|
| `catalogo` | `listar` | `categorias` | `catalogo_listar_categorias` |
| `ventas` | `crear` | `venta` | `ventas_crear_venta` |
| `consultorio_publico` | `obtener` | `perfil` | `consultorio_publico_obtener_perfil` |
| `restaurante_staff` | `actualizar` | `configuracion` | `restaurante_staff_actualizar_configuracion` |
| `social_consumer` | `reaccionar` | `consultorio` | `social_consumer_reaccionar_consultorio` |
| `auth` | `catch_all` | `better_auth` | `auth_catch_all_better_auth` |

---

### Tags por módulo

| Tag | Cubre |
|-----|-------|
| `Autenticación` | `/api/auth/**`, `DELETE /api/user` |
| `Tenant` | `/api/tenant/**` |
| `Catálogo` | `/api/catalogo/**` |
| `Almacén` | `/api/almacen/**` |
| `Ventas` | `/api/ventas/**` |
| `Consultorio` | `/api/consultorio/**` (staff interno) |
| `Consultorio Público` | `/api/public/consultorios/**`, `/api/consumer/**`, `/api/consultorio/citas-online` |
| `Restaurante` | `/api/restaurante/**` (staff interno) |
| `Restaurante Público` | `/api/public/restaurantes/**`, `/api/public/restaurante/**`, `/api/staff/restaurante/**`, `/api/consumer/**` |
| `Tienda` | `/api/tenant/tienda/**` |
| `Tienda Pública` | `/api/public/tiendas/**` |
| `Social` | `/api/social/**`, `/api/public/social/**` |

---

## Cambios en archivos existentes

| Archivo | Tipo de cambio |
|---------|---------------|
| `src/server/hono.ts` | Agregar import `swaggerUI`, agregar `app.get("/api/docs", swaggerUI(...))` |
| `src/modules/*/adapters/*-router.ts` | `Hono` → `OpenAPIHono` (6 agregadores) |
| `src/modules/*/adapters/*.rest.ts` | `Hono` → `OpenAPIHono`, `.get()` → `.openapi()` (~52 archivos) |
| `src/modules/autenticacion/adapters/auth.rest.ts` | Agregar stub catch-all con `createRoute` |
| `package.json` | Agregar `@hono/swagger-ui` |
| `tests/integration/openapi.spec.ts` | Nuevo test de unicidad de `operationId` |
| `src/core/openapi-responses.ts` | Nuevo archivo de helpers |
