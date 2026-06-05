# Implementation Plan: TuRestaurante — Perfil Público de Restaurante

**Branch**: `013-tu-restaurante` | **Date**: 2026-06-05 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/013-tu-restaurante/spec.md`

## Summary

Exponer el restaurante de un tenant como entidad pública en la plataforma VENDORA. El módulo `restaurante` existente (menus, cocina, reservas internas) se extiende con cuatro nuevos subdominios públicos: perfil público configurable por el staff, directorio búscable por consumidores, menú publicado visible sin autenticación, y reservas online con flujo PENDIENTE → confirmación/rechazo por staff. Además se agrega el tejido social completo (valoraciones, comentarios árbol, preguntas moderables, seguimiento, favoritos, reacciones, publicaciones de novedades), siguiendo el mismo patrón que TuTienda (feature 012). La base de datos requiere extensión de los schemas `restaurante`, `social` y `tenant` con 8 nuevos modelos y 2 nuevos valores de enum.

## Technical Context

**Language/Version**: TypeScript strict (Node.js ≥ 20 LTS)  
**Primary Dependencies**: Hono + @hono/zod-openapi, Prisma 7, Socket.IO, Better-Auth, Zod, BullMQ  
**Storage**: PostgreSQL (schemas: `tenant`, `restaurante`, `social`)  
**Testing**: Vitest + Testcontainers (PostgreSQL real con todos los schemas)  
**Target Platform**: Render (Web Service + Background Worker, mismo build)  
**Performance Goals**: p95 directorio ≤ 2s bajo carga normal; notificaciones ≤ 3s  
**Constraints**: Información operativa interna (costos, cocina, caja, almacén) NUNCA expuesta públicamente  
**Scale/Scope**: ≤ 500 restaurantes activos iniciales; 3 nuevos Prisma schemas afectados

## Constitution Check

| Artículo | Verificación | Estado |
|----------|-------------|--------|
| **I — Stack** | TypeScript strict, Hono + zod-openapi, Prisma 7, Socket.IO, Better-Auth, Zod, Vitest | ✅ |
| **II — Hexagonal** | Nuevos subdominios en módulo `restaurante` con estructura domain/application/infrastructure/adapters | ✅ |
| **III — Multi-tenancy** | `tenantId` en todos los nuevos modelos; guard `esRestaurante` en endpoints de staff | ✅ |
| **IV — Queries** | Directorio y listados usan `makeQueryParamsSchema` + `paginate` de `core/query-params.ts` | ✅ |
| **V — Datos** | Modelos en schemas `restaurante` y `social` con `@@schema()` correcto; auditoría en `Restaurante` | ✅ |
| **VI — Tiempo real** | Eventos emitidos desde `application/` vía puerto `IRestaurantePublicoNotificador` | ✅ |
| **VII — Auth** | Better-Auth para consumidores; guard capability `esRestaurante` para staff | ✅ |
| **VIII — Testing** | Unit con fakes en memoria; integración con Testcontainers | ✅ |
| **IX — Convenciones** | Código de dominio en español; términos hexagonales en inglés (usecase, repository, port) | ✅ |

**No hay violaciones.** Complexity Tracking no requerido.

## Project Structure

### Documentation (this feature)

```text
specs/013-tu-restaurante/
├── plan.md              # Este archivo
├── spec.md              # Especificación funcional
├── research.md          # Decisiones de diseño (8 decisions)
├── data-model.md        # Schema Prisma — 8 modelos nuevos + 3 cambios
├── quickstart.md        # Guía de implementación para el desarrollador
├── contracts/
│   └── api-restaurante-publico.md  # Contratos REST + Socket.IO
├── checklists/
│   └── requirements.md  # Checklist de calidad (todos los items pasan)
└── tasks.md             # (generado por /speckit-tasks — no creado aún)
```

### Source Code (repository root)

```text
prisma/
├── 10-tenant.prisma       ← MODIFICAR: agregar campos a Restaurante + relaciones sociales
├── 70-restaurante.prisma  ← MODIFICAR: EstadoReserva + nuevo enum TipoServicioRestaurante
└── 80-social.prisma       ← MODIFICAR: 8 nuevos modelos Restaurante*

src/modules/restaurante/
├── domain/
│   ├── ports/
│   │   ├── IRestaurantePublicoRepository.ts   (NUEVO)
│   │   └── IRestaurantePublicoNotificador.ts  (NUEVO)
│   └── restaurante-publico.errors.ts          (NUEVO)
├── application/
│   ├── perfil-publico/                        (NUEVO subdomain — 4 use cases)
│   │   ├── activar-perfil-publico.usecase.ts
│   │   ├── desactivar-perfil-publico.usecase.ts
│   │   ├── actualizar-configuracion-publica.usecase.ts
│   │   └── obtener-perfil-publico.usecase.ts
│   ├── directorio-publico/                    (NUEVO subdomain — 1 use case)
│   │   └── listar-directorio.usecase.ts
│   ├── menu-publico/                          (NUEVO subdomain — 1 use case)
│   │   └── listar-menus-publicos.usecase.ts
│   └── reserva-publica/                       (NUEVO subdomain — 3 use cases)
│       ├── crear-reserva-publica.usecase.ts
│       ├── listar-mis-reservas.usecase.ts
│       └── cancelar-reserva-publica.usecase.ts
├── infrastructure/
│   ├── restaurante-publico.prisma.repository.ts  (NUEVO)
│   └── restaurante-publico.socket.notificador.ts (NUEVO)
└── adapters/
    ├── restaurante-publica.rest.ts              (NUEVO — endpoints públicos + consumer)
    ├── restaurante-staff-publico.rest.ts        (NUEVO — endpoints staff perfil)
    └── restaurante.schema.ts                    (MODIFICAR — agregar schemas Zod nuevos)

src/modules/social/
├── domain/
│   ├── ports/
│   │   ├── IRestauranteSocialRepository.ts    (NUEVO)
│   │   └── IRestauranteSocialNotificador.ts   (NUEVO)
│   └── restaurante-social.errors.ts           (NUEVO)
├── application/
│   ├── restaurante/                            (NUEVO subdomain — 14 use cases)
│   │   ├── reaccionar-restaurante.usecase.ts
│   │   ├── comentar-restaurante.usecase.ts
│   │   ├── listar-comentarios-restaurante.usecase.ts
│   │   ├── responder-comentario-restaurante.usecase.ts
│   │   ├── valorar-restaurante.usecase.ts
│   │   ├── listar-valoraciones-restaurante.usecase.ts
│   │   ├── preguntar-restaurante.usecase.ts
│   │   ├── responder-pregunta-restaurante.usecase.ts
│   │   ├── ocultar-pregunta-restaurante.usecase.ts
│   │   ├── mostrar-pregunta-restaurante.usecase.ts
│   │   ├── listar-preguntas-restaurante.usecase.ts
│   │   ├── toggle-favorito-restaurante.usecase.ts
│   │   ├── toggle-seguir-restaurante.usecase.ts
│   │   └── listar-seguidores-restaurante.usecase.ts
│   └── publicacion-restaurante/               (NUEVO subdomain — 2 use cases)
│       ├── publicar-novedad.usecase.ts
│       └── listar-publicaciones.usecase.ts
├── infrastructure/
│   ├── restaurante-social.prisma.repository.ts  (NUEVO)
│   └── restaurante-social.socket.notificador.ts (NUEVO)
└── adapters/
    ├── restaurante-social-publica.rest.ts      (NUEVO — GET social endpoints)
    ├── restaurante-social-consumer.rest.ts     (NUEVO — POST consumer endpoints)
    ├── restaurante-social-staff.rest.ts        (NUEVO — staff moderation + publicaciones)
    └── restaurante-social.schema.ts            (NUEVO — Zod schemas sociales)
```

**Structure Decision**: Extensión dentro de los módulos `restaurante` y `social` existentes, sin crear módulos nuevos. Sigue exactamente el patrón de TuTienda (feature 012): los use cases de negocio específicos van en el módulo vertical (`restaurante`), y las interacciones sociales del entity van en el módulo `social`. No hay ruptura de las fronteras modulares declaradas en la constitución.

## Use Cases Summary

| Módulo | Subdomain | Use Cases | Descripción |
|--------|-----------|-----------|-------------|
| `restaurante` | `perfil-publico` | 4 | Activar, desactivar, configurar, obtener perfil |
| `restaurante` | `directorio-publico` | 1 | Listar directorio con geo, filtros y paginación |
| `restaurante` | `menu-publico` | 1 | Listar menús PUBLICADO con ítems |
| `restaurante` | `reserva-publica` | 3 | Crear, listar propias, cancelar reserva online |
| `social` | `restaurante` | 14 | Valorar, comentar (árbol), preguntar, responder, moderar, seguir, favorito, reaccionar, listar |
| `social` | `publicacion-restaurante` | 2 | Publicar novedad, listar publicaciones |
| **Total** | | **25** | |

## Schema Changes Summary

| Cambio | Archivo | Tipo de migración |
|--------|---------|-------------------|
| Campos nuevos en `Restaurante` (especialidad, horarios, fotos, contactoPublico) | `10-tenant.prisma` | ALTER TABLE (nullable — no-breaking) |
| `tipoServicio` String? → `TipoServicioRestaurante?` | `10-tenant.prisma` | ALTER COLUMN (requiere migración de datos) |
| Nuevo enum `TipoServicioRestaurante` | `70-restaurante.prisma` | CREATE TYPE |
| `EstadoReserva` + PENDIENTE, CANCELADA_CLIENTE | `70-restaurante.prisma` | ADD VALUE (non-breaking en Postgres) |
| 8 nuevos modelos `Restaurante*` en schema `social` | `80-social.prisma` | CREATE TABLE ×8 |

## Complexity Tracking

> No requerido — todas las decisiones están dentro de los patrones constitucionales establecidos.
