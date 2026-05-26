# Implementation Plan: Módulo de Restaurante

**Branch**: `008-restaurante` | **Date**: 2026-05-25 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/008-restaurante/spec.md`

## Summary

Implementar el módulo `src/modules/restaurante/` para la vertical TuRestaurant de VENDORA. El modelo de datos ya está definido en `prisma/70-restaurante.prisma` (Prisma 7, schema `restaurante`) y la migración de BD está aplicada. El plan cubre la arquitectura hexagonal completa del módulo: perfil del restaurante, tiempos de comida, gestión de menús, reservas con flujo de estados, panel de cocina en tiempo real (Socket.IO), y publicación automática en Instagram/Facebook vía BullMQ + Graph API.

## Technical Context

**Language/Version**: TypeScript strict · Node.js LTS ≥ 20  
**Primary Dependencies**: Hono + `@hono/zod-openapi` · Prisma 7 (multiSchema) · Socket.IO + Redis adapter · BullMQ · Better-Auth · Zod · Vitest · Pino · Cloudflare R2 · `satori` + `@resvg/resvg-js`  
**Storage**: PostgreSQL — schemas `tenant` (Restaurante model) + `restaurante` (7 modelos) + cross-schema: `ventas` (Cliente), `catalogo` (Producto)  
**Testing**: Vitest — domain/application con repositorios en memoria; infrastructure con `describe.skipIf(!DATABASE_URL)` contra PostgreSQL real  
**Target Platform**: Render (serverful) — Web Service + Background Worker  
**Project Type**: Módulo vertical de monolito modular hexagonal  
**Performance Goals**: Cambios en tiempo real ≤ 2s (SC-003) · Configuración inicial < 10 min (SC-001) · Creación de reserva < 3 min (SC-002)  
**Constraints**: Aislamiento por tenant (Artículo III) · Solo Instagram + Facebook para publicación en v1 · Schema restaurante sin modificaciones (instrucción del usuario)  
**Scale/Scope**: Un restaurante por tenant · N tiempos de comida · N menús concurrentes · N reservas/día

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Artículo | Verifica | Estado |
|----------|----------|--------|
| I — Stack | Node.js + TS strict + Hono + Prisma 7 + Socket.IO + BullMQ + Redis + Better-Auth + Zod + Vitest + satori/resvg | ✅ Pass |
| II.1 — Monolito modular | Módulo `restaurante` en `src/modules/restaurante/` con estructura hexagonal, sin microservicios | ✅ Pass |
| II.2 — Hexagonal | `domain/` sin imports de infra · `application/` solo conoce puertos · `infrastructure/` implementa puertos · `adapters/` delgados | ✅ Pass — a implementar |
| II.3 — Agnóstico transporte | Use cases ejecutables desde REST y BullMQ sin cambios (publicación RRSS) | ✅ Pass — diseñado así |
| III.1 — Aislamiento tenant | Todas las queries filtran por `restauranteId` (que pertenece a un tenant) | ✅ Pass |
| III.4 — Guard capability | Middleware `requireRestaurante` verifica `tenant.esRestaurante === true` | ✅ Pass — a implementar |
| IV — Queries parametrizables | Listas (menús, reservas, publicaciones) usan `makeQueryParamsSchema` + `toPrismaArgs` de `core/query-params.ts` | ✅ Pass — a implementar |
| V.1 — Schema modularizado | Schema en `prisma/70-restaurante.prisma` ya existe y está migrado | ✅ Pass |
| V.2 — Nomenclatura | Schema `restaurante` en español; modelos y campos en español | ✅ Pass |
| V.3 — Auditoría | `createdById`/`updatedById` en Menu, Reserva, PublicacionMenuRRSS (Prisma extension scoped) | ✅ Pass |
| VI.1 — Broadcast tenant | Eventos emitidos a `tenant:${tenantId}:restaurante` y sub-sala `cocina` | ✅ Pass |
| VI.2 — Eventos desde application | Todos los eventos emitidos dentro del use case vía puerto `IRestauranteNotificador` | ✅ Pass — diseñado así |
| VI.4 — Salas por módulo | `tenant:${id}:restaurante` + `tenant:${id}:cocina` | ✅ Pass |
| VII.2 — Roles restaurante | `PROPIETARIO|ADMIN|ENCARGADO|VENDEDOR|CHEF|MESERO` (ya en Constitution) | ✅ Pass |
| VIII.1 — Domain tests sin infra | Entidades y use cases testeados con repositorios en memoria | ✅ Pass — a implementar |
| VIII.2 — Integration tests | Repositorios Prisma testeados contra BD real con `skipIf(!DATABASE_URL)` | ✅ Pass — a implementar |
| VIII.3 — Validación en borde | Zod en adapters REST antes de llegar a use case | ✅ Pass |
| IX.1 — Idioma español | Código de dominio en español | ✅ Pass |
| IX.4 — Sin lógica en adapters | Controllers: validar → use case → formatear | ✅ Pass |

**Sin violaciones**. El módulo es nuevo (0% implementado), por lo que todos los artículos se cumplen por diseño.

**Nota — Gap conocido (no es violación)**: El schema no tiene tabla de log por ítem de cocina (`ReservaDetalleEstadoLog`). La trazabilidad de kitchen state changes (FR-017) se implementa con anotación en `PedidoEstadoLog.nota`. Detallar en v1.1 con tabla dedicada.

## Project Structure

### Documentation (this feature)

```text
specs/008-restaurante/
├── plan.md              ← este archivo
├── research.md          ← 10 decisiones de arquitectura resueltas
├── data-model.md        ← 7 modelos + 6 enums + gaps documentados
├── quickstart.md        ← 8 escenarios de integración
├── contracts/
│   └── rest-api.md      ← endpoints REST + eventos Socket.IO + errores
└── tasks.md             ← generado por /speckit-tasks (pendiente)
```

### Source Code (repository root)

```text
prisma/
└── 70-restaurante.prisma    ← schema existente, SIN MODIFICACIONES

src/modules/restaurante/
├── domain/
│   ├── restaurante.entity.ts         ❌ NUEVO
│   ├── tiempo-comida.entity.ts       ❌ NUEVO
│   ├── menu.entity.ts                ❌ NUEVO
│   ├── menu-item.entity.ts           ❌ NUEVO
│   ├── reserva.entity.ts             ❌ NUEVO
│   ├── reserva-detalle.entity.ts     ❌ NUEVO
│   ├── publicacion-rrss.entity.ts    ❌ NUEVO
│   ├── restaurante.errors.ts         ❌ NUEVO (14 errores de dominio)
│   └── ports/
│       ├── IRestauranteRepository.ts       ❌ NUEVO
│       ├── ITiempoComidaRepository.ts      ❌ NUEVO
│       ├── IMenuRepository.ts              ❌ NUEVO
│       ├── IMenuItemRepository.ts          ❌ NUEVO
│       ├── IReservaRepository.ts           ❌ NUEVO
│       ├── IReservaDetalleRepository.ts    ❌ NUEVO
│       ├── IPublicacionRRSSRepository.ts   ❌ NUEVO
│       ├── IRestauranteNotificador.ts      ❌ NUEVO (reserva:creada/actualizada, cocina:plato-actualizado)
│       ├── IRestauranteVentaService.ts     ❌ NUEVO (cross-module: crear venta al pagar)
│       └── IImagenGeneradorService.ts      ❌ NUEVO (generar PNG para RRSS)
│
├── application/
│   ├── restaurante/
│   │   ├── obtener-restaurante.usecase.ts          ❌ NUEVO
│   │   └── actualizar-restaurante.usecase.ts       ❌ NUEVO
│   ├── tiempo-comida/
│   │   ├── listar-tiempos-comida.usecase.ts        ❌ NUEVO
│   │   ├── crear-tiempo-comida.usecase.ts          ❌ NUEVO
│   │   ├── actualizar-tiempo-comida.usecase.ts     ❌ NUEVO
│   │   └── eliminar-tiempo-comida.usecase.ts       ❌ NUEVO
│   ├── menu/
│   │   ├── listar-menus.usecase.ts                 ❌ NUEVO
│   │   ├── crear-menu.usecase.ts                   ❌ NUEVO
│   │   ├── obtener-menu.usecase.ts                 ❌ NUEVO
│   │   ├── actualizar-menu.usecase.ts              ❌ NUEVO
│   │   ├── cambiar-estado-menu.usecase.ts          ❌ NUEVO
│   │   ├── agregar-item-menu.usecase.ts            ❌ NUEVO
│   │   ├── actualizar-item-menu.usecase.ts         ❌ NUEVO
│   │   └── eliminar-item-menu.usecase.ts           ❌ NUEVO
│   ├── reserva/
│   │   ├── listar-reservas.usecase.ts              ❌ NUEVO
│   │   ├── crear-reserva-publica.usecase.ts        ❌ NUEVO (cliente público)
│   │   ├── obtener-reserva.usecase.ts              ❌ NUEVO
│   │   ├── cambiar-estado-reserva.usecase.ts       ❌ NUEVO
│   │   ├── pagar-reserva.usecase.ts                ❌ NUEVO (crea venta caja)
│   │   └── listar-reservas-cliente.usecase.ts      ❌ NUEVO (historial público)
│   ├── cocina/
│   │   ├── listar-panel-cocina.usecase.ts          ❌ NUEVO
│   │   └── actualizar-estado-cocina.usecase.ts     ❌ NUEVO
│   └── publicacion-rrss/
│       ├── listar-publicaciones.usecase.ts         ❌ NUEVO
│       ├── programar-publicacion.usecase.ts        ❌ NUEVO
│       ├── obtener-publicacion.usecase.ts          ❌ NUEVO
│       ├── cancelar-publicacion.usecase.ts         ❌ NUEVO
│       └── ejecutar-publicacion.usecase.ts         ❌ NUEVO (invocado por BullMQ worker)
│
├── infrastructure/
│   ├── restaurante.prisma.repository.ts            ❌ NUEVO
│   ├── tiempo-comida.prisma.repository.ts          ❌ NUEVO
│   ├── menu.prisma.repository.ts                   ❌ NUEVO
│   ├── menu-item.prisma.repository.ts              ❌ NUEVO
│   ├── reserva.prisma.repository.ts                ❌ NUEVO
│   ├── reserva-detalle.prisma.repository.ts        ❌ NUEVO
│   ├── publicacion-rrss.prisma.repository.ts       ❌ NUEVO
│   ├── restaurante.socket.notificador.ts           ❌ NUEVO
│   ├── restaurante.null.notificador.ts             ❌ NUEVO (para tests)
│   ├── restaurante.notificador.provider.ts         ❌ NUEVO
│   ├── venta.restaurante.service.ts                ❌ NUEVO (implementa IRestauranteVentaService)
│   ├── imagen.satori.generador.ts                  ❌ NUEVO (satori + @resvg/resvg-js)
│   └── publicacion-rrss.bullmq.worker.ts           ❌ NUEVO (Background Worker)
│
└── adapters/
    ├── restaurante.schema.ts           ❌ NUEVO (Zod schemas)
    ├── restaurante.rest.ts             ❌ NUEVO (perfil)
    ├── tiempo-comida.rest.ts           ❌ NUEVO
    ├── menu.rest.ts                    ❌ NUEVO
    ├── menu-item.rest.ts               ❌ NUEVO
    ├── reserva.rest.ts                 ❌ NUEVO (staff)
    ├── reserva-publica.rest.ts         ❌ NUEVO (public endpoints sin auth)
    ├── cocina.rest.ts                  ❌ NUEVO
    └── publicacion-rrss.rest.ts        ❌ NUEVO

tests/restaurante/
├── unit/
│   ├── domain/
│   │   ├── menu.entity.test.ts                     ❌ NUEVO
│   │   └── reserva.entity.test.ts                  ❌ NUEVO
│   └── application/
│       ├── crear-reserva-publica.usecase.test.ts   ❌ NUEVO
│       ├── cambiar-estado-reserva.usecase.test.ts  ❌ NUEVO
│       ├── cambiar-estado-menu.usecase.test.ts     ❌ NUEVO
│       ├── actualizar-estado-cocina.usecase.test.ts ❌ NUEVO
│       └── pagar-reserva.usecase.test.ts           ❌ NUEVO
└── integration/
    ├── reserva.prisma.repository.test.ts           ❌ NUEVO
    └── menu.prisma.repository.test.ts              ❌ NUEVO
```

**Structure Decision**: Módulo único `src/modules/restaurante/` con arquitectura hexagonal completa (Artículo II.2). Background Worker (`publicacion-rrss.bullmq.worker.ts`) se registra en el proceso worker del mismo build (Artículo I, Render Blueprint).

## Complexity Tracking

| Elemento | Justificación |
|----------|---------------|
| `satori` + `@resvg/resvg-js` | Image generation para RRSS — alternativa obligatoria a Puppeteer (demasiado pesado para Worker en Render). Decision 2 en research.md. |
| `IImagenGeneradorService` port | Permite testear `EjecutarPublicacionUseCase` sin generar imágenes reales. Testabilidad del Artículo VIII.1. |
| `IRestauranteVentaService` port | Cross-module (restaurante → ventas) sin acoplar directamente. Mismo patrón que `IVentaService` del módulo consultorio. |
| Endpoints públicos sin auth | FR-011b (cliente ocasional), FR-008/FR-010 (menú público + reserva pública). Rutas bajo `/public/restaurante/:slug/` sin middleware de sesión. |
| `PedidoEstadoLog.nota` codificado | Trazabilidad mínima de kitchen state changes (FR-017) sin nueva tabla. Gap documentado en research.md Decision 6. |
