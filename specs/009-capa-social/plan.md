# Implementation Plan: Capa Social de la Plataforma

**Branch**: `009-capa-social` | **Date**: 2026-05-25 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/009-capa-social/spec.md`

## Summary

Implementar el módulo `src/modules/social/` como módulo núcleo (no vertical) de VENDORA. El schema ya está definido en `prisma/80-social.prisma` (21 modelos, 6 enums, schema PostgreSQL `social`) y migrado. El plan cubre la arquitectura hexagonal completa del módulo: interacciones sobre productos (reacciones, comentarios anidados, valoraciones, preguntas/respuestas, favoritos), interacciones sobre la vitrina de tienda (mismo set + seguimiento), gestión de publicaciones del tenant con flujo de estados (BORRADOR→PUBLICADO→ARCHIVADO) y tiempo real vía Socket.IO para todas las interacciones.

## Technical Context

**Language/Version**: TypeScript strict · Node.js LTS ≥ 20  
**Primary Dependencies**: Hono + `@hono/zod-openapi` · Prisma 7 (multiSchema) · Socket.IO + Redis adapter · Better-Auth · Zod · Vitest · Pino  
**Storage**: PostgreSQL — schema `social` (21 modelos) + cross-schema: `catalogo.Producto`, `tenant.Tienda`, `tenant.Tenant`, `autenticacion.User`  
**Testing**: Vitest — domain/application con repositorios en memoria; infrastructure con `describe.skipIf(!DATABASE_URL)` contra PostgreSQL real  
**Target Platform**: Render (serverful) — Web Service  
**Project Type**: Módulo núcleo del monolito modular hexagonal  
**Performance Goals**: Actualizaciones en tiempo real ≤ 2s (SC-002) · Respuesta de listas ≤ 1s (SC-003) · Interacción completa ≤ 10s (SC-001)  
**Constraints**: Schema `80-social.prisma` sin modificaciones · Tienda-scoped para interacciones de vitrina (requiere esTienda=true) · Eliminación de comentarios en cascada a nivel aplicación · Auth tri-nivel (público/autenticado/staff)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Artículo | Verifica | Estado |
|----------|----------|--------|
| I — Stack | Node.js + TS strict + Hono + Prisma 7 + Socket.IO + BullMQ + Redis + Better-Auth + Zod + Vitest | ✅ Pass |
| II.1 — Monolito modular | Módulo `social` en `src/modules/social/` como módulo núcleo (listado en Art. II.1) | ✅ Pass |
| II.2 — Hexagonal | `domain/` sin imports de infra · `application/` solo conoce puertos · `infrastructure/` implementa puertos · `adapters/` delgados | ✅ Pass — a implementar |
| II.3 — Agnóstico transporte | Use cases ejecutables desde REST y tests sin cambios | ✅ Pass — diseñado así |
| III.1 — Aislamiento tenant | Todas las queries incluyen tenantId o tiendaId (que pertenece a un tenant); ninguna query escapa de su tenant | ✅ Pass |
| III.3 — Prisma scopeado | Tablas sociales están exentas de auditoría por Art. V.3 ("tablas de detalle, logs y sociales NO se auditan") | ✅ Pass — exención formal |
| III.4 — Guard capability | No se requiere guard de capability específico — social es universal para todos los tenants | ✅ Pass |
| IV — Queries parametrizables | Listados de comentarios, valoraciones, preguntas y publicaciones usan `makeQueryParamsSchema` + `toPrismaArgs` | ✅ Pass — a implementar |
| V.1 — Schema modularizado | Schema en `prisma/80-social.prisma` ya existe y está migrado | ✅ Pass |
| V.2 — Nomenclatura | Schema `social` en español; modelos y campos en español | ✅ Pass |
| V.3 — Auditoría | Art. V.3 exime explícitamente tablas "sociales" de `createdById`/`updatedById` | ✅ Pass — exención formal |
| VI.1 — Broadcast tenant | Eventos emitidos a `tenant:${tenantId}` y sub-salas por elemento | ✅ Pass |
| VI.2 — Eventos desde application | Todos los eventos emitidos dentro del use case vía puerto `ISocialNotificador` | ✅ Pass — diseñado así |
| VI.4 — Salas por módulo | Sub-salas `tenant:${id}:producto:${productoId}` y `tenant:${id}:publicacion:${publicacionId}` | ✅ Pass |
| VII.1 — Better-Auth | Auth via sesión de Better-Auth; userId = `session.user.id`; tenantId = derivado del recurso | ✅ Pass |
| VII.2 — Roles | Solo PROPIETARIO|ADMIN gestionan publicaciones; cualquier usuario autenticado puede interactuar | ✅ Pass |
| VIII.1 — Domain tests sin infra | Entidades y use cases testeados con repositorios en memoria | ✅ Pass — a implementar |
| VIII.2 — Integration tests | Repositorios Prisma testeados contra BD real con `skipIf(!DATABASE_URL)` | ✅ Pass — a implementar |
| VIII.3 — Validación en borde | Zod en adapters REST antes de llegar a use case | ✅ Pass |
| IX.1 — Idioma español | Código de dominio en español | ✅ Pass |
| IX.4 — Sin lógica en adapters | Controllers: validar → use case → formatear | ✅ Pass |

**Sin violaciones.** El módulo es nuevo (0% implementado).

**Gap documentado (no es violación)**: `ProductoReaccion` usa `emoji String` + unique(productoId, userId, emoji), permitiendo múltiples emojis por usuario en el mismo producto — a diferencia de `TiendaReaccion`/`PublicacionReaccion` que usan `TipoReaccion` con unique(elementId, userId). Este comportamiento diferenciado está aceptado e implementado según el schema existente (Decision 3 de research.md).

## Project Structure

### Documentation (this feature)

```text
specs/009-capa-social/
├── plan.md              ← este archivo
├── research.md          ← 5 decisiones de arquitectura resueltas
├── data-model.md        ← 21 modelos + 6 enums documentados con restricciones
├── quickstart.md        ← 9 escenarios de integración
├── contracts/
│   └── rest-api.md      ← endpoints REST + eventos Socket.IO + errores de dominio
└── tasks.md             ← generado por /speckit-tasks (pendiente)
```

### Source Code (repository root)

```text
prisma/
└── 80-social.prisma     ← schema existente, SIN MODIFICACIONES

src/modules/social/
├── domain/
│   ├── publicacion.entity.ts                    ❌ NUEVO
│   ├── producto-comentario.entity.ts            ❌ NUEVO
│   ├── tienda-comentario.entity.ts              ❌ NUEVO
│   ├── publicacion-comentario.entity.ts         ❌ NUEVO
│   ├── producto-valoracion.entity.ts            ❌ NUEVO
│   ├── tienda-valoracion.entity.ts              ❌ NUEVO
│   ├── social.errors.ts                         ❌ NUEVO (10 errores de dominio)
│   └── ports/
│       ├── IProductoSocialRepository.ts         ❌ NUEVO
│       ├── ITiendaSocialRepository.ts           ❌ NUEVO
│       ├── IPublicacionRepository.ts            ❌ NUEVO
│       └── ISocialNotificador.ts                ❌ NUEVO
│
├── application/
│   ├── producto/
│   │   ├── reaccionar-producto.usecase.ts       ❌ NUEVO
│   │   ├── comentar-producto.usecase.ts         ❌ NUEVO
│   │   ├── editar-comentario-producto.usecase.ts       ❌ NUEVO
│   │   ├── eliminar-comentario-producto.usecase.ts     ❌ NUEVO
│   │   ├── valorar-producto.usecase.ts          ❌ NUEVO
│   │   ├── preguntar-producto.usecase.ts        ❌ NUEVO
│   │   ├── responder-pregunta-producto.usecase.ts      ❌ NUEVO
│   │   ├── toggle-favorito-producto.usecase.ts  ❌ NUEVO
│   │   ├── listar-comentarios-producto.usecase.ts      ❌ NUEVO
│   │   ├── listar-valoraciones-producto.usecase.ts     ❌ NUEVO
│   │   └── listar-preguntas-producto.usecase.ts        ❌ NUEVO
│   ├── tienda/
│   │   ├── reaccionar-tienda.usecase.ts         ❌ NUEVO
│   │   ├── comentar-tienda.usecase.ts           ❌ NUEVO
│   │   ├── editar-comentario-tienda.usecase.ts  ❌ NUEVO
│   │   ├── eliminar-comentario-tienda.usecase.ts       ❌ NUEVO
│   │   ├── valorar-tienda.usecase.ts            ❌ NUEVO
│   │   ├── preguntar-tienda.usecase.ts          ❌ NUEVO
│   │   ├── responder-pregunta-tienda.usecase.ts        ❌ NUEVO
│   │   ├── toggle-favorito-tienda.usecase.ts    ❌ NUEVO
│   │   ├── toggle-seguir-tienda.usecase.ts      ❌ NUEVO
│   │   ├── listar-comentarios-tienda.usecase.ts        ❌ NUEVO
│   │   ├── listar-valoraciones-tienda.usecase.ts       ❌ NUEVO
│   │   └── listar-preguntas-tienda.usecase.ts   ❌ NUEVO
│   └── publicacion/
│       ├── crear-publicacion.usecase.ts         ❌ NUEVO
│       ├── actualizar-publicacion.usecase.ts    ❌ NUEVO
│       ├── cambiar-estado-publicacion.usecase.ts       ❌ NUEVO
│       ├── listar-publicaciones.usecase.ts      ❌ NUEVO
│       ├── obtener-publicacion.usecase.ts       ❌ NUEVO
│       ├── reaccionar-publicacion.usecase.ts    ❌ NUEVO
│       ├── comentar-publicacion.usecase.ts      ❌ NUEVO
│       ├── editar-comentario-publicacion.usecase.ts    ❌ NUEVO
│       ├── eliminar-comentario-publicacion.usecase.ts  ❌ NUEVO
│       └── compartir-publicacion.usecase.ts     ❌ NUEVO
│
├── infrastructure/
│   ├── producto-social.prisma.repository.ts    ❌ NUEVO
│   ├── tienda-social.prisma.repository.ts      ❌ NUEVO
│   ├── publicacion.prisma.repository.ts        ❌ NUEVO
│   ├── social.socket.notificador.ts            ❌ NUEVO
│   ├── social.null.notificador.ts              ❌ NUEVO (para tests)
│   └── social.notificador.provider.ts          ❌ NUEVO
│
└── adapters/
    ├── social.schema.ts                         ❌ NUEVO (Zod schemas)
    ├── producto-social.rest.ts                  ❌ NUEVO (routes de producto — auth mixto)
    ├── tienda-social.rest.ts                    ❌ NUEVO (routes de tienda — auth mixto)
    ├── publicacion-staff.rest.ts                ❌ NUEVO (routes staff PROPIETARIO|ADMIN)
    ├── publicacion-publica.rest.ts              ❌ NUEVO (routes public, no auth)
    └── social.router.ts                         ❌ NUEVO (monta todos los sub-routers)

tests/social/
├── unit/
│   ├── domain/
│   │   └── publicacion.entity.test.ts           ❌ NUEVO
│   └── application/
│       ├── eliminar-comentario-producto.usecase.test.ts   ❌ NUEVO
│       ├── valorar-producto.usecase.test.ts               ❌ NUEVO
│       └── cambiar-estado-publicacion.usecase.test.ts     ❌ NUEVO
└── integration/
    ├── producto-social.prisma.repository.test.ts          ❌ NUEVO
    ├── tienda-social.prisma.repository.test.ts            ❌ NUEVO
    └── publicacion.prisma.repository.test.ts              ❌ NUEVO
```

**Structure Decision**: Módulo único `src/modules/social/` con arquitectura hexagonal completa (Art. II.2). Tres repositorios (producto, tienda, publicación) para mantener cohesión por subdominio sin crear repositorios por entidad que resultarían en ficheros de 2–3 métodos. Los adaptadores REST se separan por auth-level: rutas de lectura pública en `*-publica.rest.ts`, staff en `publicacion-staff.rest.ts`, escritura de cualquier usuario autenticado en `producto-social.rest.ts` / `tienda-social.rest.ts`.

## Complexity Tracking

| Elemento | Justificación |
|----------|---------------|
| Auth tri-nivel en mismo módulo | La capa social es transversal y sus escrituras son accesibles a cualquier usuario autenticado, no solo miembros del tenant. Requiere resolver tenantId desde el recurso en lugar de la sesión. Alternativa (exigir membership) excluiría a todos los clientes externos. |
| ProductoReaccion vs TiendaReaccion comportamiento diferente | Herencia del schema existente (emoji libre vs TipoReaccion enum). Sin modificación del schema, ambos modelos conviven con semánticas distintas. Documentado en Decision 3 de research.md. |
| Cascada de comentarios a nivel aplicación | El schema no define `onDelete: Cascade` en la auto-referencia. Decision 4 de research.md. |
