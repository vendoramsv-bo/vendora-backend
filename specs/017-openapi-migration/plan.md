# Implementation Plan: Migración a OpenAPI Documentado

**Branch**: `017-openapi-migration` | **Date**: 2026-06-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/017-openapi-migration/spec.md`

## Summary

Migrar todos los routers del backend de `new Hono()` con rutas plain (`.get`, `.post`) a
`OpenAPIHono` con `createRoute` + `app.openapi()`, de modo que `GET /api/openapi.json`
retorne un documento OpenAPI 3.1 completo con más de 100 paths. El parent app en `hono.ts`
ya es `OpenAPIHono` y ya tiene `app.doc()` configurado; el problema es que los ~55 sub-routers
usan `Hono` plain y sus rutas no aparecen en el spec. La migración es modular (un grupo por
paso), TypeScript debe compilar sin errores tras cada paso, y no se modifica ningún handler,
use-case, repositorio ni dominio.

## Technical Context

**Language/Version**: TypeScript (strict mode) · Node.js LTS ≥ 20
**Primary Dependencies**: Hono 4.7, `@hono/zod-openapi` 0.19.4, `@hono/swagger-ui` (a instalar), Zod 3.24
**Storage**: N/A (no cambios de DB)
**Testing**: Vitest 3.1 · nuevo test de integración `tests/integration/openapi.spec.ts`
**Target Platform**: Servidor Render (serverful) · Node.js
**Project Type**: Web service (API REST)
**Performance Goals**: `GET /api/openapi.json` < 500 ms (es un endpoint de documentación, no critico)
**Constraints**: `npx tsc --noEmit` → 0 errores; migración in-place sin cambios de comportamiento
**Scale/Scope**: ~55 archivos `.rest.ts` + 6 agregadores + 1 nuevo helper + 1 nuevo test

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Artículo | Criterio | Estado |
|----------|----------|--------|
| **I — Stack** | Hono + `@hono/zod-openapi` como única capa HTTP REST | ✅ Esta migración ES la implementación de este artículo |
| **II.2 — Hexagonal** | Cambios solo en `adapters/` (routers), sin tocar `domain/`, `application/`, `infrastructure/` | ✅ Cumple |
| **II.3 — Transport-agnostic** | Casos de uso no cambian | ✅ Cumple |
| **VIII.3 — Validación en el borde** | Con `OpenAPIHono`, la validación Zod del body ocurre ANTES del handler via `c.req.valid()` | ✅ Mejora |
| **VIII.4 — Type-safety e2e** | El spec OpenAPI generado desde Zod habilita generación de tipos para frontend | ✅ Objetivo explícito |
| **IX.4 — Sin lógica en adaptadores** | Pattern validar → delegar → formatear se mantiene; `createRoute` es solo metadata | ✅ Cumple |

**Resultado**: Sin violaciones. Sin entradas en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/017-openapi-migration/
├── plan.md              # Este archivo
├── research.md          # Inventario de archivos, decisiones de implementación
├── data-model.md        # Nuevas estructuras TypeScript (no hay cambios Prisma)
├── quickstart.md        # Guía paso a paso de implementación
├── contracts/
│   └── migration-pattern.md  # Patrón canónico antes/después para cada tipo de router
└── tasks.md             # (generado por /speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── core/
│   └── openapi-responses.ts     # NUEVO — helpers compartidos (okResponse, errorResponses)
├── server/
│   └── hono.ts                  # MODIFICAR — agregar swaggerUI, ya es OpenAPIHono
└── modules/
    ├── autenticacion/adapters/
    │   └── auth.rest.ts          # MODIFICAR — stub catch-all Better-Auth
    ├── tenant/adapters/
    │   └── tenant.rest.ts        # MODIFICAR — 4 rutas
    ├── catalogo/adapters/
    │   ├── catalogo-router.ts    # MODIFICAR — Hono → OpenAPIHono
    │   ├── actividad-economica.rest.ts
    │   ├── unidad-medida.rest.ts
    │   ├── categoria.rest.ts
    │   └── producto.rest.ts
    ├── almacen/adapters/
    │   ├── almacen-router.ts
    │   ├── almacen-operaciones.rest.ts
    │   ├── inventario.rest.ts
    │   ├── receta.rest.ts
    │   └── insumo.rest.ts
    ├── ventas/adapters/
    │   ├── ventas-router.ts
    │   ├── cliente.rest.ts       # y 8 más
    │   └── ...
    ├── consultorio/adapters/
    │   ├── consultorio-router.ts
    │   ├── consultorio.rest.ts   # y 11 más
    │   └── ...
    ├── restaurante/adapters/
    │   ├── restaurante.router.ts # 5 sub-apps internas
    │   ├── restaurante.rest.ts   # y 9 más
    │   └── ...
    ├── tienda/adapters/
    │   ├── tienda-staff.rest.ts
    │   └── tienda-publica.rest.ts
    └── social/adapters/
        ├── social.router.ts      # 2 sub-apps internas
        ├── producto-social.rest.ts # y 9 más
        └── ...

tests/
└── integration/
    └── openapi.spec.ts           # NUEVO — test de unicidad de operationId
```

**Structure Decision**: Monolito modular existente. Todos los cambios son aditivos o
in-place en la capa `adapters/`. Ningún módulo nuevo. El árbol de código fuente no cambia
estructuralmente.

## Complexity Tracking

> No hay violaciones constitucionales. Esta sección queda vacía.
