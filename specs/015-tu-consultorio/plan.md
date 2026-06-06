# Implementation Plan: TuConsultorio — Perfil Público de Consultorio Médico

**Branch**: `015-tu-consultorio` | **Date**: 2026-06-05 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/015-tu-consultorio/spec.md`

## Summary

Exponer el consultorio médico de un tenant como entidad pública en VENDORA. El módulo `consultorio` existente (citas internas, historias clínicas, recetas, atenciones) se extiende con cuatro nuevos subdominios públicos: perfil público configurable por el staff, directorio búscable sin autenticación, catálogo de servicios médicos visibles, y agendamiento online con flujo PENDIENTE → confirmación/rechazo por staff. Además se agrega el tejido social completo (valoraciones, comentarios árbol, preguntas moderables, seguimiento, favoritos, reacciones, publicaciones de novedades), siguiendo el mismo patrón que TuRestaurante (feature 013). La base de datos requiere extensión de los schemas `consultorio`, `tenant` y `social` con 7 nuevos modelos, 2 nuevos enums y modificaciones a 4 modelos existentes.

**Decisión crítica de diseño**: `Cita.pacienteId` se hace nullable para citas online; se agrega `consumerUserId String?` para tracking del consumidor. Ver `research.md` Decision 1.

## Technical Context

**Language/Version**: TypeScript strict (Node.js ≥ 20 LTS)  
**Primary Dependencies**: Hono + @hono/zod-openapi, Prisma 7, Socket.IO, Better-Auth, Zod, BullMQ  
**Storage**: PostgreSQL (schemas: `tenant`, `consultorio`, `social`)  
**Testing**: Vitest + Testcontainers (PostgreSQL real con todos los schemas)  
**Target Platform**: Render (Web Service + Background Worker, mismo build)  
**Performance Goals**: p95 directorio ≤ 2s bajo carga normal; notificaciones ≤ 3s; slots ≤ 1s  
**Constraints**: Datos clínicos privados (historias, recetas, pacientes) NUNCA expuestos públicamente  
**Scale/Scope**: ≤ 500 consultorios activos iniciales; 3 schemas Prisma afectados

## Constitution Check

| Artículo | Verificación | Estado |
|----------|-------------|--------|
| **I — Stack** | TypeScript strict, Hono + zod-openapi, Prisma 7, Socket.IO, Better-Auth, Zod, Vitest | ✅ |
| **II — Hexagonal** | Nuevos subdominios en módulo `consultorio` con estructura domain/application/infrastructure/adapters | ✅ |
| **III — Multi-tenancy** | `tenantId`/`consultorioId` en todos los nuevos modelos; guard `esConsultorio` en endpoints de staff | ✅ |
| **IV — Queries** | Directorio y listados usan `makeQueryParamsSchema` + `paginate` de `core/query-params.ts` | ✅ |
| **V — Datos** | Modelos en schemas `consultorio` y `social` con `@@schema()` correcto; auditoría en `Consultorio` | ✅ |
| **VI — Tiempo real** | Eventos emitidos desde `application/` vía puerto `IConsultorioPublicoNotificador` | ✅ |
| **VII — Auth** | Better-Auth para consumidores; guard capability `esConsultorio` para staff | ✅ |
| **VIII — Testing** | Unit con fakes en memoria; integración con Testcontainers | ✅ |
| **IX — Convenciones** | Código de dominio en español; términos hexagonales en inglés (usecase, repository, port) | ✅ |

**No hay violaciones.** Complexity Tracking no requerido.

## Project Structure

### Documentation (this feature)

```text
specs/015-tu-consultorio/
├── plan.md              # Este archivo
├── spec.md              # Especificación funcional
├── research.md          # Decisiones de diseño (8 decisions)
├── data-model.md        # Schema Prisma — 7 modelos nuevos + 2 enums + 4 cambios
├── quickstart.md        # Guía de implementación para el desarrollador
├── contracts/
│   └── api-consultorio-publico.md  # Contratos REST + Socket.IO
├── checklists/
│   └── requirements.md  # Checklist de calidad (todos los items pasan)
└── tasks.md             # (generado por /speckit-tasks — no creado aún)
```

### Source Code (repository root)

```text
prisma/
├── 10-tenant.prisma       ← MODIFICAR: agregar campos públicos + relaciones sociales a Consultorio
├── 60-consultorio.prisma  ← MODIFICAR: Medico.visiblePublico, ServicioMedico.visiblePublico+mostrarPrecio,
│                                        Cita: nullable pacienteId + origenOnline + consumerUserId + EstadoCita
│                                        NUEVO enum EstadoCita, NUEVO enum TipoServicioConsultorio
└── 80-social.prisma       ← AGREGAR: 7 nuevos modelos Consultorio*

src/modules/consultorio/
├── domain/
│   ├── ports/
│   │   ├── IConsultorioPublicoRepository.ts   (NUEVO)
│   │   └── IConsultorioPublicoNotificador.ts  (NUEVO)
│   └── consultorio-publico.errors.ts          (NUEVO)
├── application/
│   ├── perfil-publico/                        (NUEVO subdomain — 4 use cases)
│   │   ├── activar-perfil-publico.usecase.ts
│   │   ├── desactivar-perfil-publico.usecase.ts
│   │   ├── actualizar-configuracion-publica.usecase.ts
│   │   └── obtener-perfil-publico.usecase.ts
│   ├── directorio-publico/                    (NUEVO subdomain — 1 use case)
│   │   └── listar-directorio.usecase.ts
│   ├── servicios-publicos/                    (NUEVO subdomain — 1 use case)
│   │   └── listar-servicios-publicos.usecase.ts
│   └── cita-online/                           (NUEVO subdomain — 4 use cases)
│       ├── consultar-disponibilidad.usecase.ts
│       ├── crear-cita-online.usecase.ts
│       ├── listar-mis-citas.usecase.ts
│       └── cancelar-cita-online.usecase.ts
├── infrastructure/
│   ├── consultorio-publico.prisma.repository.ts  (NUEVO)
│   ├── consultorio-publico.socket.notificador.ts (NUEVO)
│   └── consultorio-publico.notificador.provider.ts (NUEVO)
└── adapters/
    ├── consultorio-publica.rest.ts              (NUEVO — endpoints públicos GET)
    ├── consultorio-consumer-citas.rest.ts       (NUEVO — consumer: citas online + mis-citas)
    ├── consultorio-staff-publico.rest.ts        (NUEVO — staff: perfil, médicos, servicios, citas)
    └── consultorio.schema.ts                    (NUEVO — schemas Zod)

src/modules/social/
├── domain/
│   ├── ports/
│   │   ├── IConsultorioSocialRepository.ts    (NUEVO)
│   │   └── IConsultorioSocialNotificador.ts   (NUEVO)
│   └── consultorio-social.errors.ts           (NUEVO)
├── application/
│   ├── consultorio/                            (NUEVO subdomain — 7 use cases)
│   │   ├── reaccionar-consultorio.usecase.ts
│   │   ├── comentar-consultorio.usecase.ts
│   │   ├── responder-comentario-consultorio.usecase.ts
│   │   ├── valorar-consultorio.usecase.ts
│   │   ├── preguntar-consultorio.usecase.ts
│   │   ├── toggle-seguir-consultorio.usecase.ts
│   │   └── toggle-favorito-consultorio.usecase.ts
│   └── publicacion-consultorio/               (NUEVO subdomain — 2 use cases)
│       ├── publicar-novedad-consultorio.usecase.ts
│       └── listar-publicaciones-consultorio.usecase.ts
├── infrastructure/
│   ├── consultorio-social.prisma.repository.ts     (NUEVO)
│   ├── consultorio-social.socket.notificador.ts    (NUEVO)
│   └── consultorio-social.notificador.provider.ts  (NUEVO)
└── adapters/
    ├── consultorio-social-publica.rest.ts    (NUEVO — GET público social)
    ├── consultorio-social-consumer.rest.ts   (NUEVO — consumer social)
    ├── consultorio-social-staff.rest.ts      (NUEVO — staff social)
    └── social.router.ts                      (MODIFICAR — agregar 3 routers nuevos)

src/server/index.ts                           (MODIFICAR — registrar routers + notificadores)
```

## Use Cases

| ID | Use Case | Módulo | Subdomain | Actor |
|----|----------|--------|-----------|-------|
| UC-01 | Activar perfil público | consultorio | perfil-publico | Staff |
| UC-02 | Desactivar perfil público | consultorio | perfil-publico | Staff |
| UC-03 | Actualizar configuración pública | consultorio | perfil-publico | Staff |
| UC-04 | Obtener perfil público | consultorio | perfil-publico | Público |
| UC-05 | Listar directorio | consultorio | directorio-publico | Público |
| UC-06 | Listar servicios públicos | consultorio | servicios-publicos | Público |
| UC-07 | Consultar disponibilidad de slots | consultorio | cita-online | Público |
| UC-08 | Crear cita online | consultorio | cita-online | Consumer |
| UC-09 | Listar mis citas | consultorio | cita-online | Consumer |
| UC-10 | Cancelar cita online | consultorio | cita-online | Consumer |
| UC-11 | Confirmar cita online (staff) | consultorio | cita-online | Staff |
| UC-12 | Rechazar cita online (staff) | consultorio | cita-online | Staff |
| UC-13 | Reaccionar al consultorio | social | consultorio | Consumer |
| UC-14 | Comentar consultorio | social | consultorio | Consumer |
| UC-15 | Responder comentario | social | consultorio | Consumer |
| UC-16 | Valorar consultorio | social | consultorio | Consumer |
| UC-17 | Hacer pregunta pública | social | consultorio | Consumer |
| UC-18 | Responder pregunta (staff) | social | publicacion-consultorio | Staff |
| UC-19 | Toggle favorito | social | consultorio | Consumer |
| UC-20 | Toggle seguir | social | consultorio | Consumer |
| UC-21 | Publicar novedad | social | publicacion-consultorio | Staff |
| UC-22 | Listar publicaciones | social | publicacion-consultorio | Público |

## Schema Changes Summary

| Modelo | Cambio | Campo(s) |
|--------|--------|----------|
| `Consultorio` (10-tenant) | ADD campos públicos | `horarios`, `contactoPublico`, `tipoServicio`, `fotos` |
| `Consultorio` (10-tenant) | ADD relaciones | 6 relaciones sociales (reacciones, comentarios, valoraciones, preguntas, favoritos, seguidores) |
| `Medico` (60-consultorio) | ADD | `visiblePublico Boolean @default(false)` |
| `ServicioMedico` (60-consultorio) | ADD | `visiblePublico Boolean @default(false)`, `mostrarPrecio Boolean @default(false)` |
| `Cita` (60-consultorio) | MODIFY | `pacienteId` → nullable; ADD `origenOnline`, `consumerUserId`; CHANGE `estado` → `EstadoCita` |
| NEW `EstadoCita` enum | 60-consultorio | PENDIENTE, CONFIRMADA, ATENDIDA, CANCELADA, CANCELADA_CLIENTE, RECHAZADA, NO_ASISTIO |
| NEW `TipoServicioConsultorio` enum | 60-consultorio | PRESENCIAL, TELECONSULTA, AMBOS |
| NEW 7 modelos `Consultorio*` | 80-social | ConsultorioReaccion, ConsultorioComentario, ConsultorioComentarioReaccion, ConsultorioValoracion, ConsultorioPregunta, ConsultorioRespuesta, ConsultorioFavorito, ConsultorioSeguidor |
