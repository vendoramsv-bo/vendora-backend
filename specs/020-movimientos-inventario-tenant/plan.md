# Implementation Plan: Movimientos de inventario — listado a nivel tenant y contrato completo

**Branch**: `020-movimientos-inventario-tenant` | **Date**: 2026-10-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/020-movimientos-inventario-tenant/spec.md`

## Summary

Dos entregas independientes sobre el módulo `almacen`:

- **US1 (P1)** — `GET /api/almacen/movimientos`: listado paginado de los movimientos
  del tenant, uniendo las dos tablas de histórico (`MovimientoAlmacen` para insumos,
  `MovimientoInventario` para variantes) con un `UNION ALL` en SQL parametrizado.
  Cada fila dice de qué origen viene (`INSUMO` | `VARIANTE`) y qué entidad es.
- **US2 (P2)** — `/insumos/{id}/movimientos` y `/variantes/{varianteId}/movimientos`
  declaran en `createRoute` la query que ya procesan y la forma paginada que ya
  devuelven. Mismo patrón que el commit `11c2ac4` (specs 024/025), más un esquema de
  respuesta tipado en lugar de `z.record`.

Paginación: **offset** (`take`/`skip` + `paginate()`), igual que el resto del backend.
Decisión del usuario del 2026-10-01; ver [research.md](./research.md) §1 y la enmienda
a SC-006 en la spec.

## Technical Context

**Language/Version**: TypeScript 5.8 strict · Node.js ≥ 20
**Primary Dependencies**: Hono + `@hono/zod-openapi` 0.19, Zod 3, Prisma 7 (`prisma-client`, adapter-pg)
**Storage**: PostgreSQL — schema `almacen` (tablas existentes; solo se agregan índices)
**Testing**: Vitest — unit con fakes; contrato vía `crearApp()` + `/api/openapi.json` (sin DB)
**Target Platform**: Render, Web Service
**Project Type**: web-service (REST)
**Performance Goals**: listado tenant < 300 ms p95 con 100k movimientos por tenant y `take=100`
**Constraints**: `take ≤ 100` (Art. IV); SQL 100 % parametrizado; `tenantId` explícito en cada rama del `UNION`
**Scale/Scope**: 1 endpoint nuevo, 2 endpoints con contrato corregido, 1 migración de índices

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Artículo | Evaluación | Estado |
|---|---|---|
| I — Stack | Hono + zod-openapi, Prisma, Zod. Sin dependencias nuevas | ✅ |
| II — Hexagonal | Puerto `IMovimientoTenantRepository` en `domain/ports`, caso de uso en `application/movimiento/`, SQL en `infrastructure/`, router delgado en `adapters/` | ✅ |
| III.1 — Aislamiento | `tenantId` como parámetro en **ambas** ramas del `UNION` (no en el `WHERE` externo); test unitario del builder lo verifica | ✅ |
| III.3 — Prisma scoped | `crearPrismaScoped` hoy no filtra (`query: {}`); todos los repos filtran a mano. `$queryRaw` con `tenantId` explícito queda al mismo nivel. Brecha preexistente, fuera de alcance — ver research §6 | ⚠️ preexistente |
| IV — Consultas | `makeQueryParamsSchema` + `paginate()` reutilizados. `filterField` acotado a una lista (hoy es `z.string()` libre). Orden por defecto `createdAt desc`, desempate por `id` | ✅ |
| IV — Cursor "preferido" | Se usa offset por consistencia con todo el backend (decisión explícita) | ✅ justificado |
| V — Datos | Solo `@@index([tenantId, createdAt])` en dos modelos; sin cambios de columnas | ✅ |
| VI — Tiempo real | Feature de solo lectura; no emite eventos | N/A |
| VII — Auth | `almacenApp` ya aplica `requireAuth` + `requireTenantActivo` + `resolverMiembroActivo` | ✅ |
| VIII.1 — Dominio sin infra | Caso de uso y builder SQL testeados con fakes / como funciones puras | ✅ |
| VIII.2 — Testcontainers | El repo no tiene infraestructura de Testcontainers (ningún test la usa). El SQL se valida con quickstart contra la DB de desarrollo | ⚠️ ver Complexity Tracking |
| VIII.4 — OpenAPI | Objetivo central de US2; test de contrato sobre `/api/openapi.json` | ✅ |
| IX — Convenciones | Español en dominio; errores de dominio no aplican (solo lectura, validación Zod → 400) | ✅ |

**Resultado**: sin violaciones nuevas. Dos brechas preexistentes registradas.

**Re-check post-diseño**: sin cambios. El diseño de [data-model.md](./data-model.md) y
[contracts/movimientos.md](./contracts/movimientos.md) no introduce dependencias ni capas nuevas.

## Project Structure

### Documentation (this feature)

```text
specs/020-movimientos-inventario-tenant/
├── spec.md
├── plan.md              # este archivo
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── movimientos.md   # Phase 1 — contrato de las 3 operaciones
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
prisma/
├── 40-almacen.prisma                                  # + @@index([tenantId, createdAt]) ×2
└── migrations/<ts>_movimientos_indice_tenant_fecha/   # NUEVO

src/core/
└── openapi-responses.ts                               # + paginadoSchema(item)

src/modules/almacen/
├── domain/
│   ├── movimiento-tenant.ts                           # NUEVO — tipos + normalización de tipo
│   └── ports/IMovimientoTenantRepository.ts           # NUEVO
├── application/movimiento/
│   └── listar-movimientos-tenant.usecase.ts           # NUEVO
├── infrastructure/
│   ├── movimiento-tenant.sql.ts                       # NUEVO — builder puro (QueryParams → Prisma.Sql)
│   └── movimiento-tenant.prisma.repository.ts         # NUEVO — $queryRaw
└── adapters/
    ├── almacen.schema.ts                              # filterField acotado + schemas de respuesta
    ├── movimiento.rest.ts                             # NUEVO — GET /movimientos
    ├── almacen-router.ts                              # monta /movimientos
    ├── insumo.rest.ts                                 # US2: request.query + respuesta tipada
    └── inventario.rest.ts                             # US2: ídem

tests/
├── unit/modules/almacen/
│   ├── movimiento-tenant.sql.test.ts                  # NUEVO
│   └── listar-movimientos-tenant.usecase.test.ts      # NUEVO
└── integration/
    └── almacen-movimientos-contrato.test.ts           # NUEVO — sobre /api/openapi.json
```

**Structure Decision**: todo dentro del módulo `almacen` existente. El builder SQL se
separa del repositorio para poder testear como función pura lo que más riesgo tiene
(aislamiento por tenant, lista de campos permitidos, parametrización).

## Complexity Tracking

| Desvío | Por qué | Alternativa descartada |
|---|---|---|
| `$queryRaw` en lugar de la API de Prisma | Paginar y ordenar sobre la unión de dos tablas exige que la base haga el `ORDER BY … LIMIT/OFFSET` sobre el conjunto unido | Fusionar en memoria: hay que traer `skip + take` filas de cada tabla y el costo crece con la página. Vista SQL + `views` de Prisma: preview feature y cambio global del generador |
| Sin test de integración con DB real (VIII.2) | El repositorio no tiene Testcontainers configurado; armarlo excede esta feature | Se cubre con test unitario del builder (forma del SQL y parámetros) + quickstart §2–§4 contra la DB de desarrollo con dos tenants |
