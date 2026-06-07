# Research: Migración a OpenAPI — Feature 017

## Codebase State (as of 2026-06-07)

### Lo que YA existe

| Artifact | Estado | Ruta |
|----------|--------|------|
| `OpenAPIHono` en parent app | ✅ Presente | `src/server/hono.ts` |
| `app.doc("/api/openapi.json", {...})` | ✅ Presente | `src/server/hono.ts` |
| `@hono/zod-openapi@0.19.4` | ✅ Instalado | `package.json` |
| Schemas Zod por módulo | ✅ Presentes | `src/modules/*/adapters/*.schema.ts` |
| `@hono/swagger-ui` | ❌ NO instalado | — |
| `src/core/openapi-responses.ts` | ❌ NO existe | — |

### El problema raíz

`hono.ts` ya usa `OpenAPIHono` como host app y tiene `app.doc()` configurado.
Pero todos los sub-routers y sus agregadores usan `new Hono<HonoEnv>()` (plain).
Un router plain montado vía `app.route()` en un `OpenAPIHono` parent NO aporta
rutas al spec — `app.doc()` solo recolecta rutas de sub-apps que también sean
`OpenAPIHono` y usen `.openapi()`.

---

## Decision 1: Propagación de rutas al spec padre

**Decisión**: `OpenAPIHono.route(prefix, subApp)` propaga las rutas del `subApp`
al spec del padre **solo si el `subApp` es también `OpenAPIHono`** y sus rutas
fueron registradas con `.openapi()`.

**Rationale**: Comportamiento documentado de `@hono/zod-openapi`. Una ruta
registrada con `.get()` (Hono plain) en un `OpenAPIHono` no aparece en el spec;
solo las registradas con `.openapi()` lo hacen.

**Implicación**: Todos los archivos `*.rest.ts` y `*-router.ts` deben cambiar
`new Hono<HonoEnv>()` → `new OpenAPIHono<HonoEnv>()` Y convertir sus rutas
de `.get()/.post()` → `.openapi(createRoute(...), ...)`.

---

## Decision 2: Middleware de auth en agregadores vs. per-route

**Decisión**: Mantener los `.use("*", requireAuth, requireTenantActivo)` en los
agregadores tal como están para enforcement en runtime. Adicionalmente, declarar
`security: [{ bearerAuth: [] }]` en cada `createRoute()` de rutas auth-required
para la documentación OpenAPI.

**Rationale**: 
- El `.use()` en el agregador garantiza que el middleware corra en runtime
  independientemente de la ruta — no hay riesgo de "olvidar" el guard.
- La declaración `security` en `createRoute` es solo documentación; el spec
  la necesita para mostrar el candado en Swagger UI y para que AC-4 pase.
- Para `requireRol([...])` que aplica por ruta individual, se coloca como
  arg en `.openapi(createRoute(...), requireRol([...]), handler)` según FR-013.

**Pattern decidido**:

```typescript
// Agregador: auth enforcement en runtime (se mantiene)
catalogoApp.use("*", requireAuth, requireTenantActivo)

// Ruta individual — solo lectura, sin rol específico
catalogoApp.openapi(
  createRoute({ ..., security: [{ bearerAuth: [] }] }),
  handler
)

// Ruta con rol específico
catalogoApp.openapi(
  createRoute({ ..., security: [{ bearerAuth: [] }] }),
  requireRol(["PROPIETARIO", "ADMIN"]),
  handler
)
```

---

## Decision 3: Schemas de respuesta — alcance inicial

**Decisión**: Los schemas de respuesta se implementan en dos pasadas:

- **Pasada 1 (obligatoria)**: Cada ruta declara respuesta `200`/`201` con
  schema explícito para los endpoints más importantes (listados paginados,
  creates, updates). Para endpoints con shapes complejos, se puede usar
  `z.record(z.string(), z.unknown())` como placeholder tipado.
  
- **Pasada 2 (incremental)**: Refinamiento de schemas complejos. No bloquea SC-003
  (TypeScript clean) ni AC-1 (>100 paths).

**Rationale**: El objetivo principal (SC-001, AC-1) requiere paths poblados con
`operationId`, tags y security — no schemas de respuesta perfectos. La completitud
de schemas es refinable de forma incremental sin bloquear la migración.

---

## Decision 4: Instalación de `@hono/swagger-ui`

**Decisión**: Agregar `@hono/swagger-ui` como dependencia de producción.

**Comando**: `npm install @hono/swagger-ui`

**Integración en `hono.ts`**:
```typescript
import { swaggerUI } from "@hono/swagger-ui"
app.get("/api/docs", swaggerUI({ url: "/api/openapi.json" }))
```

---

## Decision 5: Test de operationId únicos

**Decisión**: Test de integración en Vitest que llama `GET /api/openapi.json`
en un servidor de test y verifica unicidad de todos los `operationId`.

**Ubicación**: `tests/integration/openapi.spec.ts`

**Pattern**: Usar `testClient` de Hono o levantar el servidor con `@hono/node-server`
en Testcontainers no es necesario — se puede importar `crearApp()` directamente
y llamar `app.doc()` en memoria.

---

## Decision 6: Inventario de archivos a migrar

### Grupo A — Agregadores (cambiar `Hono` → `OpenAPIHono`, mantener `.use()`)
- `src/modules/catalogo/adapters/catalogo-router.ts`
- `src/modules/almacen/adapters/almacen-router.ts`
- `src/modules/ventas/adapters/ventas-router.ts`
- `src/modules/consultorio/adapters/consultorio-router.ts`
- `src/modules/restaurante/adapters/restaurante.router.ts` (5 apps internas)
- `src/modules/social/adapters/social.router.ts` (2 apps internas)

### Grupo B — Rutas standalone en `index.ts` (no pasan por agregador)
- `src/modules/autenticacion/adapters/auth.rest.ts` → stub catch-all
- `src/modules/tenant/adapters/tenant.rest.ts` → 4 rutas
- `src/modules/tienda/adapters/tienda-staff.rest.ts`
- `src/modules/tienda/adapters/tienda-publica.rest.ts`
- `src/modules/consultorio/adapters/consultorio-publica.rest.ts`
- `src/modules/consultorio/adapters/consultorio-consumer-citas.rest.ts`
- `src/modules/consultorio/adapters/consultorio-staff-publico.rest.ts`

### Grupo C — Routers de catálogo (4 archivos)
- `actividad-economica.rest.ts`, `unidad-medida.rest.ts`,
  `categoria.rest.ts`, `producto.rest.ts`

### Grupo D — Routers de almacén (3 archivos)
- `almacen-operaciones.rest.ts`, `inventario.rest.ts`, `receta.rest.ts`, `insumo.rest.ts`

### Grupo E — Routers de ventas (8 archivos)
- `cliente.rest.ts`, `proveedor.rest.ts`, `compra.rest.ts`, `punto-venta.rest.ts`,
  `turno-atencion.rest.ts`, `caja.rest.ts`, `gastos.rest.ts`, `pedido.rest.ts`, `venta.rest.ts`

### Grupo F — Routers de consultorio (10 archivos)
- `consultorio.rest.ts`, `medico.rest.ts`, `paciente.rest.ts`, `cita.rest.ts`,
  `historia-clinica.rest.ts`, `atencion-medica.rest.ts`, `receta-medica.rest.ts`,
  `servicio-medico.rest.ts`, `vacunacion.rest.ts`

### Grupo G — Routers de restaurante (8 archivos)
- `restaurante.rest.ts`, `tiempo-comida.rest.ts`, `menu.rest.ts`, `menu-item.rest.ts`,
  `reserva.rest.ts`, `reserva-publica.rest.ts`, `cocina.rest.ts`, `publicacion-rrss.rest.ts`,
  `restaurante-publica.rest.ts`, `restaurante-staff-publico.rest.ts`

### Grupo H — Routers de tienda (2 archivos — standalone, no pasan por router.ts)
- `tienda-staff.rest.ts`, `tienda-publica.rest.ts`

### Grupo I — Routers sociales (8 archivos)
- `producto-social.rest.ts`, `tienda-social.rest.ts`,
  `restaurante-social-consumer.rest.ts`, `restaurante-social-staff.rest.ts`,
  `restaurante-social-publica.rest.ts`, `publicacion-staff.rest.ts`,
  `publicacion-publica.rest.ts`,
  `consultorio-social-consumer.rest.ts`, `consultorio-social-staff.rest.ts`,
  `consultorio-social-publica.rest.ts`

**Total estimado**: ~55 archivos a migrar

---

## Alternatives Considered

| Alternative | Decisión | Razón de rechazo |
|-------------|----------|------------------|
| Documentar rutas con `app.use()` + stub vacío | Rechazada | No agrega paths al spec; requeriría un mecanismo custom |
| Migrar todo en un solo commit | Rechazada | Alto riesgo de romper TypeScript; migración modular es más segura |
| Crear router paralelo `openapi-*.rest.ts` | Rechazada | Duplicación innecesaria; el patrón de reemplazo in-place es más limpio |
| Usar `Hono.route()` propagation hack | No existe | OpenAPIHono no tiene este mecanismo; la sub-app debe ser OpenAPIHono |
