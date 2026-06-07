# Quickstart: Migración a OpenAPI — Feature 017

## Prerequisito: instalar @hono/swagger-ui

```powershell
npm install @hono/swagger-ui
```

## Orden de implementación (módulo a módulo)

El proyecto DEBE compilar sin errores de TypeScript en cada paso intermedio.
Ejecutar `npx tsc --noEmit` al final de cada grupo.

### Paso 0 — Infraestructura compartida (NO rompe nada)

1. Crear `src/core/openapi-responses.ts` (ver contrato en `contracts/migration-pattern.md`)
2. Agregar `swaggerUI` en `src/server/hono.ts` → `GET /api/docs`
3. Crear `tests/integration/openapi.spec.ts` (test de unicidad de operationId)
4. Verificar: `npx tsc --noEmit` → 0 errores

### Paso 1 — Módulo `tenant` (pocos endpoints, validación del patrón)

1. Convertir `src/modules/tenant/adapters/tenant.rest.ts`:
   - `new Hono` → `new OpenAPIHono`
   - 4 rutas: `GET /`, `GET /actual`, `GET /miembros`, `GET /invitaciones`
2. Verificar: `npx tsc --noEmit` → 0 errores
3. Test manual: `GET /api/openapi.json` → paths de tenant visibles

### Paso 2 — Módulo `autenticacion` (stub catch-all)

1. Convertir `src/modules/autenticacion/adapters/auth.rest.ts`:
   - Stub catch-all para `/auth/{...path}`
   - `DELETE /api/user` con schema explícito
2. Verificar: `npx tsc --noEmit` → 0 errores

### Paso 3 — Módulo `catalogo` (4 routers + agregador)

1. Convertir agregador: `catalogo-router.ts` → `OpenAPIHono`
2. Convertir routers:
   - `actividad-economica.rest.ts`
   - `unidad-medida.rest.ts`
   - `categoria.rest.ts`
   - `producto.rest.ts`
3. Verificar: `npx tsc --noEmit` → 0 errores

### Paso 4 — Módulo `almacen` (4 routers + agregador)

1. Convertir agregador: `almacen-router.ts` → `OpenAPIHono`
2. Convertir routers:
   - `almacen-operaciones.rest.ts`
   - `inventario.rest.ts`
   - `receta.rest.ts`
   - `insumo.rest.ts`
3. Verificar: `npx tsc --noEmit` → 0 errores

### Paso 5 — Módulo `ventas` (9 routers + agregador)

1. Convertir agregador: `ventas-router.ts` → `OpenAPIHono`
2. Convertir routers:
   - `cliente.rest.ts`, `proveedor.rest.ts`, `compra.rest.ts`
   - `punto-venta.rest.ts`, `turno-atencion.rest.ts`, `caja.rest.ts`
   - `gastos.rest.ts`, `pedido.rest.ts`, `venta.rest.ts`
3. Verificar: `npx tsc --noEmit` → 0 errores

### Paso 6 — Módulo `consultorio` (10 routers + agregador + 3 standalone)

1. Convertir agregador: `consultorio-router.ts` → `OpenAPIHono`
2. Convertir routers internos (9 archivos)
3. Convertir standalone:
   - `consultorio-publica.rest.ts`
   - `consultorio-consumer-citas.rest.ts`
   - `consultorio-staff-publico.rest.ts`
4. Verificar: `npx tsc --noEmit` → 0 errores

### Paso 7 — Módulo `restaurante` (10 routers + router.ts con 5 apps)

1. Convertir `restaurante.router.ts` → todas las apps a `OpenAPIHono`
2. Convertir todos los routers de restaurante
3. Verificar: `npx tsc --noEmit` → 0 errores

### Paso 8 — Módulo `tienda` (2 standalone)

1. Convertir `tienda-staff.rest.ts`, `tienda-publica.rest.ts`
2. Verificar: `npx tsc --noEmit` → 0 errores

### Paso 9 — Módulo `social` (10 routers + social.router.ts)

1. Convertir `social.router.ts` → `OpenAPIHono`
2. Convertir todos los routers sociales (10 archivos)
3. Verificar: `npx tsc --noEmit` → 0 errores

### Paso 10 — Verificación final

```powershell
# 1. TypeScript limpio
npx tsc --noEmit

# 2. Tests de integración
npm run test:integration

# 3. Verificación manual del spec
# Iniciar servidor y llamar:
# GET http://localhost:3000/api/openapi.json  → > 100 paths
# GET http://localhost:3000/api/docs           → Swagger UI carga

# 4. Criterios de aceptación
# AC-1: paths > 100 ✓
# AC-2: /api/docs carga ✓
# AC-3: tsc → 0 errores ✓
# AC-4: endpoints auth tienen security: bearerAuth ✓
# AC-5: endpoints /public/ no tienen security ✓
# AC-6: comportamiento de API sin cambios ✓
# AC-7: schemas Zod existentes reutilizados ✓
```

## Comandos útiles

```powershell
# Compilar TypeScript
npx tsc --noEmit

# Correr tests
npm run test:integration

# Iniciar servidor de desarrollo
npm run dev

# Verificar spec en terminal
curl http://localhost:3000/api/openapi.json | jq '.paths | keys | length'
```

## Errores comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `Type 'Hono' is not assignable to 'OpenAPIHono'` | Router importado es plain Hono | Convertir el sub-router primero |
| `operationId` duplicado en spec | Dos rutas con mismo ID | Seguir patrón `{módulo}_{verbo}_{recurso}` |
| `c.req.valid("json")` retorna unknown | Schema no declarado en `request.body` | Agregar schema en `createRoute({ request: { body: ... } })` |
| Paths no aparecen en spec | Sub-router es plain Hono o usa `.get()` | Convertir a `OpenAPIHono` + `.openapi()` |
