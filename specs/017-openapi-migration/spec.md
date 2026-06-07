# Feature Specification: Migración a OpenAPI Documentado

**Feature Branch**: `017-openapi-migration`
**Created**: 2026-06-07
**Status**: Draft
**Input**: User description: prompts/prompt-openapi-migration.md

## User Scenarios & Testing *(mandatory)*

### User Story 1 — API completamente explorable desde el spec (Priority: P1)

Un desarrollador externo o herramienta cliente (Swagger UI, generador de SDK, Scalar) realiza un `GET /api/openapi.json` y obtiene un documento OpenAPI 3.1 válido con todos los endpoints del backend: paths, parámetros, cuerpo de request y shape de respuesta exitosa.

**Why this priority**: Hoy `GET /api/openapi.json` devuelve `{ "paths": {} }`. Sin paths poblados, ninguna herramienta cliente puede consumir la API de forma autodescubierta. Este es el objetivo central de la migración.

**Independent Test**: Se puede llamar `GET /api/openapi.json` y verificar que el documento contiene más de 100 entries en `paths`, que cada path tiene al menos una operación con `operationId`, `tags`, y respuesta `200`/`201`.

**Acceptance Scenarios**:

1. **Given** que el backend está corriendo, **When** se llama `GET /api/openapi.json`, **Then** el documento contiene paths para todos los módulos: Autenticación, Tenant, Catálogo, Almacén, Ventas, Consultorio, Restaurante, Tienda y Social.
2. **Given** el documento OpenAPI, **When** se inspeccionan los endpoints de módulos internos (tenant-scoped), **Then** todos declaran `security: [{ bearerAuth: [] }]`.
3. **Given** el documento OpenAPI, **When** se inspeccionan los endpoints del directorio público (`/api/public/**`), **Then** no tienen declaración `security` o tienen `security: []`.
4. **Given** el documento OpenAPI, **When** se verifican los `operationId` de todas las operaciones, **Then** cada uno es único globalmente y sigue el patrón `{módulo}_{verbo}_{recurso}`.

---

### User Story 2 — Exploración interactiva en Swagger UI (Priority: P2)

Un desarrollador del equipo abre `GET /api/docs` en el navegador y puede explorar, filtrar por tag y hacer pruebas manuales de cada endpoint directamente desde la interfaz de Swagger UI.

**Why this priority**: Swagger UI agrega descubribilidad inmediata para el equipo y para integradores sin necesidad de leer el código fuente. Depende de P1 (spec poblado) pero es una capa de valor adicional.

**Independent Test**: Se puede navegar a `/api/docs` con un navegador y Swagger UI carga el spec de `/api/openapi.json`, muestra los módulos agrupados por tag, y permite ejecutar un request de prueba.

**Acceptance Scenarios**:

1. **Given** que el backend está corriendo, **When** se abre `/api/docs`, **Then** Swagger UI carga y muestra todos los módulos agrupados por tag sin errores de parseo.
2. **Given** Swagger UI cargado, **When** se busca por tag "Catálogo", **Then** se muestran solo los endpoints de catálogo con sus parámetros documentados.
3. **Given** un endpoint autenticado en Swagger UI, **When** se usa sin token, **Then** Swagger UI indica que el endpoint requiere `bearerAuth` y el server retorna 401.

---

### User Story 3 — Generación de SDK tipado desde el spec (Priority: P3)

Un desarrollador frontend o integrador usa el spec generado (`/api/openapi.json`) con una herramienta de generación de SDK (ej. `openapi-typescript`, `orval`) y obtiene tipos TypeScript coherentes con la API real.

**Why this priority**: El spec tipado habilita generación de clientes automáticos. Es consecuencia directa de P1 pero no es un bloqueador del valor central.

**Independent Test**: Se puede correr `openapi-typescript /api/openapi.json --output types.d.ts` y el archivo generado no contiene tipos `unknown` en los schemas de request de endpoints con schemas Zod explícitos.

**Acceptance Scenarios**:

1. **Given** el spec `/api/openapi.json`, **When** se genera un cliente TypeScript, **Then** los schemas de request para todos los endpoints con schemas Zod explícitos en `*.schema.ts` están tipados (no son `unknown`).
2. **Given** el spec, **When** un endpoint tiene schema de respuesta definido, **Then** el tipo generado refleja el shape real de la respuesta exitosa.

---

### Edge Cases

- ¿Qué pasa si un router file tiene validación Zod inline sin archivo `*.schema.ts` dedicado? → La validación se extrae a un archivo `*.schema.ts` antes de migrar ese router; no se duplica la definición.
- ¿Qué pasa si dos operaciones en módulos distintos generan el mismo `operationId`? → Se usa el módulo completo como prefijo; el patrón `{módulo}_{verbo}_{recurso}` previene colisiones.
- ¿Qué pasa con las rutas catch-all de Better-Auth (`/api/auth/**`)? → Se documenta con un único `createRoute` stub que describe el catch-all con referencia a la documentación de Better-Auth; el handler no se modifica.
- ¿Qué pasa si un router externo a `src/modules/` (workers, BullMQ) no es migrado? → No está en el alcance; solo se migran los routers en `src/modules/`.
- ¿Qué pasa si el schema de respuesta de un endpoint es demasiado complejo para tipar en esta fase? → Se puede usar `z.unknown()` o `z.record(z.unknown())` como placeholder; los schemas de response son refinables de forma incremental.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE exponer un documento OpenAPI 3.1 válido en `GET /api/openapi.json` con `paths` que contienen todos los endpoints de los módulos en `src/modules/`.
- **FR-002**: Cada operación en el spec DEBE declarar: `operationId` único (patrón `{módulo}_{verbo}_{recurso}` en camelCase), al menos un `tag` de módulo, y la respuesta exitosa (`200` o `201`) con su schema Zod.
- **FR-003**: Los endpoints que usan `requireAuth` DEBEN declarar `security: [{ bearerAuth: [] }]` en su `createRoute`.
- **FR-004**: Los endpoints públicos (sin guard de autenticación) NO DEBEN declarar `security` o deben declarar `security: []`.
- **FR-005**: Los schemas Zod existentes en archivos `*.schema.ts` DEBEN reutilizarse en las definiciones `createRoute`; no se permite duplicar schemas.
- **FR-006**: Los shapes de respuesta de error comunes (401, 403, 404, 422) DEBEN declararse una sola vez en `src/core/openapi-responses.ts` y referenciarse desde todos los routers.
- **FR-007**: El sistema DEBE exponer `GET /api/docs` con Swagger UI apuntando al spec en `/api/openapi.json`. Este endpoint es público (sin guard de autenticación); cualquier visitante puede explorar la UI.
- **FR-008**: Cada módulo DEBE estar identificado con al menos un tag: `Autenticación`, `Tenant`, `Catálogo`, `Almacén`, `Ventas`, `Consultorio`, `Consultorio Público`, `Restaurante`, `Restaurante Público`, `Tienda`, `Social`.
- **FR-009**: La migración NO DEBE alterar ningún handler, use-case, repositorio ni lógica de dominio existente. Los cambios se limitan a la capa de routing y documentación.
- **FR-013**: Los guards de autenticación y rol (`requireAuth`, `requireRol`) DEBEN colocarse como argumentos intermedios en la llamada `app.openapi(createRoute(...), requireAuth, requireRol([...]), handler)` — patrón oficial de `@hono/zod-openapi`. Este patrón es uniforme para todos los routers migrados.
- **FR-010**: Los endpoints de Better-Auth (`/api/auth/**`) se documentan con un único `createRoute` stub catch-all (`/api/auth/{...}`) con descripción genérica y referencia a la documentación oficial de Better-Auth. No se documentan rutas individuales de la librería ni se modifica el handler catch-all.
- **FR-011**: Si un endpoint no tiene schema Zod explícito en `*.schema.ts`, se DEBE extraer la validación inline a un archivo schema antes de migrar ese router.
- **FR-012**: `npx tsc --noEmit` DEBE completar con 0 errores tras la migración completa.
- **FR-014**: DEBE existir un test de integración que llame `GET /api/openapi.json` y verifique que ningún `operationId` se repite en el documento; este test DEBE correr en CI y fallar el pipeline si detecta duplicados.

### Key Entities

- **OpenAPI Route Definition**: Declaración `createRoute` por operación. Atributos: `method`, `path`, `operationId`, `tags`, `security`, `request` (query/params/body con schema Zod), `responses` (success + error refs).
- **Shared Response Helpers** (`src/core/openapi-responses.ts`): Funciones `okResponse(description, schema)` y `createdResponse(description, schema)`, más el objeto `errorResponses` con shapes de 401, 403, 404, 422 reutilizables.
- **Router Instance**: Cada router pasa de `new Hono<HonoEnv>()` a `new OpenAPIHono<HonoEnv>()` (drop-in replacement). Los handlers internos no cambian.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `GET /api/openapi.json` retorna un documento con más de 100 entries en `paths`, cubriendo todos los módulos especificados.
- **SC-002**: `GET /api/docs` renderiza Swagger UI con el spec completo sin errores de parseo ni paths faltantes.
- **SC-003**: `npx tsc --noEmit` arroja 0 errores tras la migración completa de todos los módulos.
- **SC-004**: El 100% de los endpoints tenant-scoped (con `requireAuth`) declaran `security: [{ bearerAuth: [] }]` en el spec.
- **SC-005**: El 100% de los endpoints en `/api/public/**` no requieren `bearerAuth` en el spec.
- **SC-006**: Ningún handler, use-case, repositorio ni test existente requiere cambios de comportamiento como consecuencia de la migración.
- **SC-007**: Los `operationId` de todas las operaciones son únicos globalmente y siguen el patrón `{módulo}_{verbo}_{recurso}`.
- **SC-008**: Un test de integración automatizado verifica la unicidad de `operationId` en CI; el pipeline falla si se detecta cualquier duplicado.

## Clarifications

### Session 2026-06-07

- Q: ¿El endpoint `/api/docs` (Swagger UI) es público o requiere autenticación? → A: Público — sin guard de autenticación; cualquier visitante puede explorar la UI (consistente con `/api/openapi.json` que también es público).
- Q: ¿Los guards (`requireAuth`, `requireRol`) se colocan como args en `openapi()` o dentro del handler? → A: Como argumentos intermedios en `app.openapi(createRoute(...), requireAuth, requireRol([...]), handler)` — patrón oficial de la librería, uniforme para todos los routers.
- Q: ¿Las rutas de Better-Auth se documentan con un stub catch-all o con operaciones individuales? → A: Un único stub catch-all `/api/auth/{...}` con descripción genérica y link a docs de Better-Auth; `DELETE /api/user` se documenta por separado con schema explícito.
- Q: ¿Cómo se detectan `operationId` duplicados durante la migración modular? → A: Test de integración automatizado que llama `GET /api/openapi.json` y verifica unicidad global de `operationId`; corre en CI y falla el pipeline si detecta duplicados.

## Assumptions

- `@hono/zod-openapi` y `@hono/swagger-ui` se agregan como dependencias de producción; la migración parte de que el proyecto ya usa Hono y Zod.
- `OpenAPIHono` es un sustituto transparente de `Hono`; el host app en `src/server/hono.ts` que monta los routers con `app.route()` no requiere cambios de comportamiento, solo de tipo de instancia.
- Los guards de rol/auth existentes (`requireAuth`, `requireRol`) se mantienen dentro del handler o se adaptan como middleware en el patrón `OpenAPIHono`; no se eliminan ni se omiten.
- Los schemas de respuesta pueden ser parciales en la primera pasada (`z.unknown()` o `z.record(z.unknown())` para shapes complejos); el refinamiento de responses es incremental y no bloquea AC-3.
- La migración se hace módulo a módulo para mantener el proyecto compilando en todo momento; el orden recomendado es: `core/openapi-responses.ts` → `tenant` → `catalogo` → `almacen` → `ventas` → `consultorio` → `restaurante` → `tienda` → `social` → `autenticacion` → Swagger UI.
- Los routers fuera de `src/modules/` (workers, BullMQ, jobs) quedan fuera del alcance de esta migración.
- La clave de seguridad `bearerAuth` usa el esquema HTTP Bearer estándar; no se documenta OAuth2 ni API key en esta fase.
