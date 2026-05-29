# Implementation Plan: TuTienda — Perfil Público de Comercio de Barrio

**Branch**: `012-tu-tienda` | **Date**: 2026-05-28 | **Spec**: [spec.md](spec.md)

## Summary

Implementar el módulo TuTienda que expone el perfil público del comercio, el directorio de búsqueda geoespacial y los productos destacados de la vitrina. La vertical reutiliza casi toda la capa social ya existente (`TiendaXxx` models + 12 use cases sociales) y agrega un nuevo módulo hexagonal `tienda` para la gestión del perfil, directorio y configuración. La única entidad nueva en base de datos es `ProductoDestacado`; el único cambio schema existente es el default de `TiendaPregunta.estado` (PENDIENTE → ACTIVO).

## Technical Context

**Language/Version**: TypeScript 5.x strict mode (Node.js 20 LTS)  
**Primary Dependencies**: Hono, Prisma 7, Socket.IO, Zod, Better-Auth  
**Storage**: PostgreSQL — schemas `tenant` y `social` (existentes)  
**Testing**: Vitest (unit: fakes in-memory; integration: Testcontainers)  
**Target Platform**: Linux/Render (serverful)  
**Project Type**: REST web service — módulo adicional del monolito  
**Performance Goals**: Directorio ≤ 2s p95; notificaciones tiempo real ≤ 3s  
**Constraints**: Sin auth requerida para lectura pública (directorio, perfil, catálogo)  
**Scale/Scope**: ≤ 500 comercios activos iniciales; contrato paginación máx 100/página

## Constitution Check

| Artículo | Evaluación |
|----------|------------|
| **I — Stack Tecnológico** | ✅ Hono + Zod + Prisma 7 + Socket.IO. Sin nuevas dependencias. |
| **II.1 — Monolito Modular** | ✅ Nuevo módulo `tienda` con estructura hexagonal completa. Sigue procedimiento nueva vertical (II.1 paso 1–4). |
| **II.2 — Hexagonal** | ✅ `domain/ports/` → `application/` → `infrastructure/` → `adapters/`. |
| **III — Multi-tenancy** | ✅ Endpoints públicos filtran `esTienda = true`; perfil por slug. Endpoints de staff scoped por tenantId. |
| **IV — Consultas Parametrizables** | ✅ Directorio y catálogo público usan `core/query-params.ts`. |
| **V — Capa de Datos** | ✅ `ProductoDestacado` en `10-tenant.prisma` con `@@schema("tenant")`. |
| **VI — Tiempo Real** | ✅ Eventos emitidos desde use cases vía port `ITiendaNotificador`. |
| **VII — Auth y Roles** | ✅ Endpoints públicos sin guard; staff con `requireRol(["PROPIETARIO", "ADMIN"])`. |
| **VIII — Testing** | ✅ Use cases testeables con fakes. Integration tests para repositorios. |
| **IX — Convenciones** | ✅ Módulo en español (tienda), estructura hexagonal, cero lógica en adapters. |

**Resultado**: ✅ Sin violaciones. Apto para implementación.

## Project Structure

### Documentation (this feature)

```text
specs/012-tu-tienda/
├── plan.md              ← este archivo
├── research.md          ← decisiones de investigación
├── data-model.md        ← modelos Prisma y relaciones
├── contracts/
│   └── rest-api.md      ← contratos de endpoints
├── quickstart.md        ← escenarios de prueba
└── tasks.md             ← generado por /speckit-tasks
```

### Source Code (repository root)

```text
src/modules/tienda/                         ← NUEVO módulo vertical
├── domain/
│   ├── tienda.errors.ts                    ← TiendaNoActivaError, ProductoDestacadoLimiteError, etc.
│   └── ports/
│       ├── ITiendaRepository.ts            ← perfil, directorio, destacados
│       └── ITiendaNotificador.ts           ← eventos tiempo real
├── application/
│   ├── perfil/
│   │   ├── activar-tienda.usecase.ts
│   │   ├── desactivar-tienda.usecase.ts
│   │   ├── obtener-configuracion.usecase.ts
│   │   ├── actualizar-configuracion.usecase.ts
│   │   └── obtener-perfil-publico.usecase.ts
│   ├── destacados/
│   │   ├── agregar-producto-destacado.usecase.ts
│   │   ├── quitar-producto-destacado.usecase.ts
│   │   ├── reordenar-destacados.usecase.ts
│   │   └── listar-destacados.usecase.ts
│   └── directorio/
│       ├── listar-directorio.usecase.ts
│       └── listar-catalogo-publico.usecase.ts
├── infrastructure/
│   ├── tienda.prisma.repository.ts
│   └── tienda.socket.notificador.ts
└── adapters/
    ├── tienda-staff.rest.ts                ← configuración, destacados, preguntas
    ├── tienda-publica.rest.ts              ← directorio, perfil, catálogo
    └── tienda.schema.ts                   ← Zod schemas

prisma/10-tenant.prisma                     ← agregar ProductoDestacado
prisma/migrations/...                       ← ProductoDestacado + TiendaPregunta default

src/modules/social/application/tienda/
    ocultar-pregunta-tienda.usecase.ts      ← NUEVO
    mostrar-pregunta-tienda.usecase.ts      ← NUEVO

src/modules/social/domain/ports/
    ITiendaSocialRepository.ts              ← agregar ocultar/mostrar pregunta

src/modules/social/infrastructure/
    tienda-social.prisma.repository.ts      ← agregar ocultar/mostrar pregunta

src/modules/social/adapters/
    tienda-social.rest.ts                   ← ya existe; extender con ocultar/mostrar
    publicacion-staff.rest.ts               ← fix: restricción PROPIETARIO/ADMIN

src/server/index.ts                         ← registrar router tienda + notificador

tests/tienda/unit/application/
    activar-tienda.usecase.test.ts
    actualizar-configuracion.usecase.test.ts
    agregar-producto-destacado.usecase.test.ts
    listar-directorio.usecase.test.ts
    ocultar-pregunta-tienda.usecase.test.ts
```

## Complexity Tracking

*(No hay violaciones constitucionales que justificar)*

---

## Dependencias entre User Stories

```
US1 (Perfil + Configuración)
  └─► US2 (Directorio Público)       — requiere esTienda activable
        └─► US3 (Interacciones)       — requiere perfil visible
              └─► US4 (Publicaciones) — requiere seguidores
```

## Fases de implementación sugeridas

1. **MVP (US1)**: Prisma migration + módulo tienda + activar/desactivar + configuración + perfil público básico
2. **US2**: Directorio con búsqueda geoespacial + catálogo público + productos destacados
3. **US3**: Ocultar/mostrar pregunta + notificaciones + eventos tiempo real
4. **US4**: Restricción roles en publicaciones (cambio mínimo)
