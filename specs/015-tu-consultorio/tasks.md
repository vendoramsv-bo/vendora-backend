# Tasks: TuConsultorio — Perfil Público de Consultorio Médico

**Input**: specs/015-tu-consultorio/ (plan.md, spec.md, data-model.md, contracts/api-consultorio-publico.md, quickstart.md, research.md)
**Feature Branch**: `015-tu-consultorio`
**Date**: 2026-06-05
**Tests**: Not requested — no test tasks generated.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable — touches a different file, no dependency on other in-progress tasks in the same group
- **[Story]**: US1–US5 maps to user stories in spec.md
- All file paths are relative to repository root

---

## Phase 1: Setup

**Purpose**: Confirm directory structure for new subdomain folders before any file is created.

- [x] T001 Create directory skeleton for all new subdomain folders: `src/modules/consultorio/domain/ports/`, `src/modules/consultorio/application/perfil-publico/`, `src/modules/consultorio/application/directorio-publico/`, `src/modules/consultorio/application/servicios-publicos/`, `src/modules/consultorio/application/cita-online/`, `src/modules/consultorio/infrastructure/`, `src/modules/consultorio/adapters/`, `src/modules/social/domain/ports/`, `src/modules/social/application/consultorio/`, `src/modules/social/application/publicacion-consultorio/`, `src/modules/social/infrastructure/` (create .gitkeep or first file in each)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema migrations, domain ports, core infrastructure. All user stories block on this phase.

**⚠️ CRITICAL**: No user story work can begin until Phase 2 is complete.

### Schema Changes (T002–T006)

- [x] T002 Modify `prisma/60-consultorio.prisma`: (1) add enum `EstadoCita` with values PENDIENTE, CONFIRMADA, ATENDIDA, CANCELADA, CANCELADA_CLIENTE, RECHAZADA, NO_ASISTIO and `@@schema("consultorio")`; (2) add enum `TipoServicioConsultorio` with values PRESENCIAL, TELECONSULTA, AMBOS and `@@schema("consultorio")`; (3) add `Medico.visiblePublico Boolean @default(false)`; (4) add `ServicioMedico.visiblePublico Boolean @default(false)` and `ServicioMedico.mostrarPrecio Boolean @default(false)`; (5) change `Cita.pacienteId` to `String?` (nullable), change `Cita.estado` to `EstadoCita @default(PENDIENTE)`, add `Cita.consumerUserId String?`, add `Cita.origenOnline Boolean @default(false)`, add `@@index([consumerUserId, origenOnline])` to Cita per data-model.md

- [x] T003 [P] Modify `prisma/10-tenant.prisma` — `Consultorio` model: add `horarios Json?`, `contactoPublico Json?`, `tipoServicio TipoServicioConsultorio @default(PRESENCIAL)`, `fotos String[]`; add 6 social back-relation fields: `reacciones ConsultorioReaccion[]`, `comentarios ConsultorioComentario[]`, `valoraciones ConsultorioValoracion[]`, `preguntas ConsultorioPregunta[]`, `favoritos ConsultorioFavorito[]`, `seguidores ConsultorioSeguidor[]` per data-model.md

- [x] T004 [P] Add 8 new social models to `prisma/80-social.prisma` per data-model.md (exact snippets provided there): `ConsultorioReaccion`, `ConsultorioComentario`, `ConsultorioComentarioReaccion`, `ConsultorioValoracion`, `ConsultorioPregunta`, `ConsultorioRespuesta`, `ConsultorioFavorito`, `ConsultorioSeguidor` — all with `@@schema("social")`

- [x] T005 Add named back-relation fields to the `User` model in the relevant prisma file for all 8 new `Consultorio*` social models: `reaccionesConsultorio ConsultorioReaccion[] @relation("reaccionesConsultorio")`, `comentariosConsultorio ConsultorioComentario[] @relation("comentariosConsultorio")`, `reaccionesComentarioConsultorio ConsultorioComentarioReaccion[] @relation("reaccionesComentarioConsultorio")`, `valoracionesConsultorio ConsultorioValoracion[] @relation("valoracionesConsultorio")`, `preguntasConsultorio ConsultorioPregunta[] @relation("preguntasConsultorio")`, `respuestasConsultorio ConsultorioRespuesta[] @relation("respuestasConsultorio")`, `favoritosConsultorio ConsultorioFavorito[] @relation("favoritosConsultorio")`, `seguidoresConsultorio ConsultorioSeguidor[] @relation("seguidoresConsultorio")`

- [x] T006 Run `npx prisma generate --config prisma/prisma.config.ts` then `npx prisma migrate dev --name "feature-015-tu-consultorio" --config prisma/prisma.config.ts`; inspect generated SQL to verify `Cita.estado` ALTER correctly casts existing `Estado` values to `EstadoCita` (PENDIENTE→PENDIENTE, CONFIRMADA→CONFIRMADA); adjust migration SQL manually if the auto-generated cast is missing per quickstart.md warning

### Domain Ports & Zod Schemas (T007–T013) — parallel with schema tasks

- [x] T007 [P] Create `src/modules/consultorio/domain/ports/IConsultorioPublicoRepository.ts` interface with methods: `resolveConsultorioInfo(slug)`, `activarPerfil(tenantId, actorId)`, `desactivarPerfil(tenantId, actorId)`, `actualizarConfiguracion(consultorioId, data)`, `obtenerPerfil(slug)`, `listarDirectorio(params)`, `listarServiciosPublicos(consultorioId, params)`, `setVisibilidadServicio(servicioId, consultorioId, visiblePublico, mostrarPrecio?)`, `setVisibilidadMedico(medicoId, consultorioId, visiblePublico)`, `getMedicoHorarios(medicoId, consultorioId)`, `getServicio(servicioId, consultorioId)`, `getCitasEnRango(medicoId, desde, hasta)`, `crearCitaOnline(data)`, `getCitaById(citaId)`, `cancelarCitaOnline(citaId, consumerUserId)`, `listarMisCitas(consumerUserId, params)`, `confirmarCitaOnline(citaId, consultorioId)`, `rechazarCitaOnline(citaId, consultorioId, motivo?)`, `listarCitasOnline(consultorioId, params)` — follow same pattern as existing `IRestaurantePublicoRepository`

- [x] T008 [P] Create `src/modules/consultorio/domain/ports/IConsultorioPublicoNotificador.ts` interface with methods: `emitirNuevaCitaOnline(tenantId, payload: { consultorioSlug, citaId, fechaHora, medicoId })`, `emitirPerfilActualizado(tenantId, payload: { consultorioSlug })` per Socket.IO events table in contracts

- [x] T009 [P] Create `src/modules/consultorio/domain/consultorio-publico.errors.ts` with typed error classes: `ConsultorioNoEncontradoError`, `SlotNoDisponibleError` (maps to 409 SLOT_NO_DISPONIBLE), `CitaNoCancelableError` (maps to 409 CITA_NO_CANCELABLE), `MedicoNoDisponibleError` (400), `ServicioNoDisponibleError` (400), `CapacidadConsultorioInactivaError` (400)

- [x] T010 [P] Create `src/modules/consultorio/adapters/consultorio.schema.ts` with Zod schemas for: `HorarioConsultorioSchema` (diaSemana 0–6, horaInicio HH:MM, horaFin HH:MM, activo), `ContactoPublicoSchema`, `ActualizarConfiguracionPublicaBodySchema`, `CrearCitaOnlineBodySchema` (medicoId, servicioId, fechaHora ISO8601, motivo?), `MisCitasQuerySchema` (estado?, page?, take?, order?), `DirectorioQuerySchema` (lat?, lon?, especialidad?, tipoServicio?, orderBy?, order?, page?, take?), `DisponibilidadQuerySchema` (medicoId req, servicioId req, fechaDesde req, fechaHasta req max 30 days)

- [x] T011 [P] Create `src/modules/social/domain/ports/IConsultorioSocialRepository.ts` interface — clone `IRestauranteSocialRepository` replacing "Restaurante" with "Consultorio" throughout; include methods: `reaccionar`, `getReacciones`, `crearComentario`, `getComentarios`, `crearValoracion`, `getValoraciones`, `crearPregunta`, `getPreguntas`, `getPreguntasStaff` (includes INACTIVO), `crearRespuestaPregunta`, `ocultarPregunta`, `mostrarPregunta`, `toggleFavorito`, `toggleSeguir`, `getTotalSeguidores`, `publicarNovedad`, `getPublicaciones`

- [x] T012 [P] Create `src/modules/social/domain/ports/IConsultorioSocialNotificador.ts` interface — clone `IRestauranteSocialNotificador` replacing "Restaurante" with "Consultorio"; methods: `emitirNuevaValoracion`, `emitirNuevoComentario`, `emitirNuevaPregunta`, `emitirNuevoSeguidor`, `emitirNuevaPublicacion` — emit to rooms `tenant:${tenantId}` AND `tenant:${tenantId}:consultorio` per research.md Decision 8

- [x] T013 [P] Create `src/modules/social/domain/consultorio-social.errors.ts` with error classes: `ConsultorioSocialNoActivoError`, `ValoracionDuplicadaError` (one active per user per consultorio), `ComentarioNoEncontradoError`, `PreguntaNoEncontradaError`

### Core Infrastructure (T014–T019)

- [x] T014 Create `src/modules/consultorio/infrastructure/consultorio-publico.prisma.repository.ts` implementing `IConsultorioPublicoRepository` using PrismaClient; implement `crearCitaOnline` using `prisma.$transaction` for slot conflict detection per quickstart.md pseudocode (check existing cita at same medicoId+fechaHora with estado not in CANCELADA/CANCELADA_CLIENTE/RECHAZADA before creating); use `@@index([consumerUserId, origenOnline])` hint in `listarMisCitas` queries

- [x] T015 [P] Create `src/modules/consultorio/infrastructure/consultorio-publico.socket.notificador.ts` implementing `IConsultorioPublicoNotificador`; emit Socket.IO events `consultorio:nueva-cita-online` and `consultorio:perfil-actualizado` to rooms `tenant:${tenantId}` and `tenant:${tenantId}:consultorio`

- [x] T016 [P] Create `src/modules/consultorio/infrastructure/consultorio-publico.notificador.provider.ts` with `setConsultorioPublicoNotificador(n)` setter and `getConsultorioPublicoNotificador()` getter using module-level variable (singleton pattern matching existing notificador providers)

- [x] T017 Create `src/modules/social/infrastructure/consultorio-social.prisma.repository.ts` implementing `IConsultorioSocialRepository` — clone `src/modules/social/infrastructure/restaurante-social.prisma.repository.ts` replacing "Restaurante"/"restaurante" with "Consultorio"/"consultorio" throughout; preserve cursor-based pagination pattern and upsert logic for valoracion (@@unique([consultorioId, userId]))

- [x] T018 [P] Create `src/modules/social/infrastructure/consultorio-social.socket.notificador.ts` implementing `IConsultorioSocialNotificador`; emit events `consultorio:nueva-valoracion`, `consultorio:nuevo-comentario`, `consultorio:nueva-pregunta`, `consultorio:nuevo-seguidor`, `consultorio:nueva-publicacion` to rooms `tenant:${tenantId}` and `tenant:${tenantId}:consultorio`

- [x] T019 [P] Create `src/modules/social/infrastructure/consultorio-social.notificador.provider.ts` with `setConsultorioSocialNotificador(n)` setter and `getConsultorioSocialNotificador()` getter (same singleton pattern as T016)

**Checkpoint**: Foundation ready — schema migrated, ports defined, repositories implemented. User story work can begin.

---

## Phase 3: User Story 1 — Activación y configuración del perfil público (Priority: P1) 🎯 MVP

**Goal**: Staff activates/deactivates public profile; configures horarios, contacto, tipo, fotos, médicos visibles, servicios visibles. GET /:slug returns full public profile.

**Independent Test**: Staff calls POST /api/consultorio/activar-perfil-publico → `esConsultorio=true`. Staff calls PATCH /api/consultorio/configuracion-publica with horarios+contactoPublico+tipoServicio. GET /api/public/consultorios/:slug returns the configured profile with médicos (visiblePublico=true) and no clinical data. Staff calls POST /desactivar-perfil-publico → GET /:slug returns 404.

### Implementation for User Story 1

- [x] T020 [P] [US1] Implement `src/modules/consultorio/application/perfil-publico/activar-perfil-publico.usecase.ts`: accepts `{ tenantId, actorId }`; calls `IConsultorioPublicoRepository.activarPerfil(tenantId, actorId)`; returns `{ esConsultorio: true }`

- [x] T021 [P] [US1] Implement `src/modules/consultorio/application/perfil-publico/desactivar-perfil-publico.usecase.ts`: accepts `{ tenantId, actorId }`; calls `IConsultorioPublicoRepository.desactivarPerfil(tenantId, actorId)`; returns `{ esConsultorio: false }`

- [x] T022 [P] [US1] Implement `src/modules/consultorio/application/perfil-publico/actualizar-configuracion-publica.usecase.ts`: accepts partial `{ horarios?, contactoPublico?, tipoServicio?, fotos?, especialidades? }`; calls `actualizarConfiguracion(consultorioId, data)`; calls `IConsultorioPublicoNotificador.emitirPerfilActualizado(tenantId, { consultorioSlug })`; records `updatedById`

- [x] T023 [P] [US1] Implement `src/modules/consultorio/application/perfil-publico/obtener-perfil-publico.usecase.ts`: calls `resolveConsultorioInfo(slug)` (throws `ConsultorioNoEncontradoError` if not found or `esConsultorio=false`); calls `obtenerPerfil(slug)`; maps result to public DTO — include nombre, descripcion, logo, fotos, especialidades, nroRegistro, tipoServicio, horarios, contactoPublico, medicos (visiblePublico=true only), promedioValoracion, totalValoraciones, totalSeguidores, localizacion; NEVER include HistoriaClinica, AtencionMedica, RecetaMedica, Paciente, diagnósticos

- [x] T024 [US1] Implement `src/modules/consultorio/adapters/consultorio-staff-publico.rest.ts` with Hono+zod-openapi routes (all require `esConsultorio` capability guard): `POST /activar-perfil-publico` → T020, `POST /desactivar-perfil-publico` → T021, `PATCH /configuracion-publica` → T022, `PATCH /medicos/:medicoId/visibilidad` → `setVisibilidadMedico`, `PATCH /servicios/:servicioId/visibilidad` → `setVisibilidadServicio`; export `consultorioStaffPublicoRouter`

- [x] T025 [US1] Create `src/modules/consultorio/adapters/consultorio-publica.rest.ts` with `GET /:slug` route calling `obtener-perfil-publico.usecase.ts`; no auth required; return 404 if `ConsultorioNoEncontradoError`; export `consultorioPublicaRouter`

- [x] T026 [US1] Register in `src/server/index.ts`: `app.route("/api/consultorio", consultorioStaffPublicoRouter)`; wire `setConsultorioPublicoNotificador(new ConsultorioPublicoSocketNotificador(io))` per quickstart.md Fase 4 imports

**Checkpoint**: US1 functional — staff can activate, configure, and deactivate. GET /:slug returns public profile.

---

## Phase 4: User Story 2 — Directorio y perfil público de consultorios (Priority: P2)

**Goal**: Unauthenticated consumers browse consultorio directory with geo/specialty/service filters; view full profiles.

**Independent Test**: GET /api/public/consultorios (no auth) returns paginated list of `esConsultorio=true` entries with slug, nombre, especialidades, tipoServicio, promedioValoracion, localizacion. Filters `especialidad=Pediatría`, `tipoServicio=TELECONSULTA`, `lat`/`lon` work. GET /api/public/consultorios/:slug returns full profile. No clinical data in any response.

### Implementation for User Story 2

- [x] T027 [US2] Implement `src/modules/consultorio/application/directorio-publico/listar-directorio.usecase.ts`: accepts `DirectorioParams` (lat?, lon?, especialidad?, tipoServicio?, orderBy: puntuacion|seguidores|distancia|fecha, order, page, take); calls `IConsultorioPublicoRepository.listarDirectorio(params)`; uses `paginate()` from `src/core/query-params.ts`; returns `{ data: ConsultorioDirectorioItem[], total, page, take, totalPaginas, hayPaginaSiguiente, hayPaginaAnterior }`

- [x] T028 [US2] Add `GET /` directory endpoint to `src/modules/consultorio/adapters/consultorio-publica.rest.ts` using `makeQueryParamsSchema` from `src/core/query-params.ts` for query validation; call `listar-directorio.usecase.ts`; response shape: data[], total, page, take, totalPaginas, hayPaginaSiguiente, hayPaginaAnterior per contracts

- [x] T029 [US2] Register in `src/server/index.ts`: `app.route("/api/public/consultorios", consultorioPublicaRouter)`

**Checkpoint**: US2 functional — public directory browsable with filters, full profile accessible.

---

## Phase 5: User Story 4 — Agendamiento de citas en línea (Priority: P2)

**Goal**: Consumer checks slot availability, books appointment (→ PENDIENTE), lists own appointments (all states), cancels PENDIENTE/CONFIRMADA. Staff confirms/rejects online appointments.

**Independent Test**: GET /:slug/disponibilidad with medicoId+servicioId+fechaDesde+fechaHasta returns slots. POST /api/consumer/consultorios/:slug/citas creates cita with estado=PENDIENTE and origenOnline=true. GET /mis-citas lists consumer's own citas. PATCH /mis-citas/:id/cancelar changes estado to CANCELADA_CLIENTE. Concurrent POST on same slot returns 409. Staff: GET /citas-online shows pending online bookings; PATCH confirmar → CONFIRMADA, PATCH rechazar → RECHAZADA.

### Implementation for User Story 4

- [x] T030 [P] [US4] Implement `src/modules/consultorio/application/cita-online/consultar-disponibilidad.usecase.ts`: call `resolveConsultorioInfo(slug)`, `getMedicoHorarios(medicoId, consultorioId)` (validates `visiblePublico=true`), `getServicio(servicioId, consultorioId)` (validates `visiblePublico=true`), `getCitasEnRango(medicoId, desde, hasta)`; generate slots by iterating each day in range, expanding horario using `servicio.duracionMin` as interval; mark slot occupied if any cita overlaps (estado not in CANCELADA/CANCELADA_CLIENTE/RECHAZADA); return `{ data: [{ fechaHora, disponible }] }`; validate fechaHasta ≤ 30 days from fechaDesde per contracts

- [x] T031 [P] [US4] Implement `src/modules/consultorio/application/cita-online/crear-cita-online.usecase.ts`: validate `medico.visiblePublico=true` (throw `MedicoNoDisponibleError`) and `servicio.visiblePublico=true` (throw `ServicioNoDisponibleError`); call `crearCitaOnline(data)` which uses `$transaction` with conflict check (throws `SlotNoDisponibleError` on 409); call `IConsultorioPublicoNotificador.emitirNuevaCitaOnline(tenantId, { consultorioSlug, citaId, fechaHora, medicoId })`; return created cita DTO per contracts

- [x] T032 [P] [US4] Implement `src/modules/consultorio/application/cita-online/listar-mis-citas.usecase.ts`: filter by `consumerUserId`; optional `estado` filter; order by `fechaHora DESC` (default); use `paginate()` from `src/core/query-params.ts`; include consultorio slug+nombre, medico nombre, servicio nombre in each item per contracts response shape

- [x] T033 [P] [US4] Implement `src/modules/consultorio/application/cita-online/cancelar-cita-online.usecase.ts`: call `getCitaById(citaId)`; verify `cita.consumerUserId === authenticatedUserId` (throw 403 if not); verify `estado in [PENDIENTE, CONFIRMADA]` (throw `CitaNoCancelableError` if ATENDIDA/CANCELADA/CANCELADA_CLIENTE/RECHAZADA/NO_ASISTIO); call `cancelarCitaOnline(citaId, consumerUserId)` → estado = CANCELADA_CLIENTE; return `{ id, estado: "CANCELADA_CLIENTE" }`

- [x] T034 [US4] Extend `src/modules/consultorio/adapters/consultorio-staff-publico.rest.ts` with cita-online staff endpoints (all require `esConsultorio` guard): `GET /citas-online` (paginated, optional `estado` filter, `origenOnline=true`), `PATCH /citas-online/:citaId/confirmar` (→ CONFIRMADA via `confirmarCitaOnline`), `PATCH /citas-online/:citaId/rechazar` (body: `motivo?`, → RECHAZADA via `rechazarCitaOnline`)

- [x] T035 [US4] Implement `src/modules/consultorio/adapters/consultorio-consumer-citas.rest.ts` with Hono+zod-openapi routes (all require Bearer auth): `POST /:slug/citas` → T031, `GET /mis-citas` → T032, `PATCH /mis-citas/:citaId/cancelar` → T033; extract `consumerUserId` from Better-Auth session; export `consultorioConsumerCitasRouter`

- [x] T036 [US4] Add `GET /:slug/disponibilidad` query endpoint to `src/modules/consultorio/adapters/consultorio-publica.rest.ts`; validate query params using `DisponibilidadQuerySchema` from consultorio.schema.ts; no auth required

- [x] T037 [US4] Register in `src/server/index.ts`: `app.route("/api/consumer/consultorios", consultorioConsumerCitasRouter)` per quickstart.md Fase 4

**Checkpoint**: US4 functional — full booking flow: availability → create (PENDIENTE) → list → cancel → staff confirm/reject.

---

## Phase 6: User Story 3 — Catálogo de servicios públicos (Priority: P3)

**Goal**: Unauthenticated consumers browse the public services catalog for a consultorio, filtered by especialidad; price shown only when `mostrarPrecio=true`.

**Independent Test**: GET /api/public/consultorios/:slug/servicios returns only `ServicioMedico` records where `visiblePublico=true`. `precio` field absent when `mostrarPrecio=false`. Filter `especialidad=Pediatría` returns only matching services. Internal services (`visiblePublico=false`) never appear.

### Implementation for User Story 3

- [x] T038 [US3] Implement `src/modules/consultorio/application/servicios-publicos/listar-servicios-publicos.usecase.ts`: call `resolveConsultorioInfo(slug)`; call `listarServiciosPublicos(consultorioId, params)` filtering by `visiblePublico=true` and optional `especialidad`; map to DTO omitting `precioBase` when `mostrarPrecio=false`; use `paginate()` for response shape

- [x] T039 [US3] Add `GET /:slug/servicios` endpoint to `src/modules/consultorio/adapters/consultorio-publica.rest.ts`; query params: `especialidad?`, `page?`, `take?` (max 100); call T038; response fields per contracts: id, nombre, descripcion, especialidad, duracionMin, precio (conditional)

**Checkpoint**: US3 functional — services catalog with privacy filter (mostrarPrecio) enforced.

---

## Phase 7: User Story 5 — Interacciones sociales del consultorio (Priority: P3)

**Goal**: Consumers react, comment, rate, ask questions, follow, and favorite. Staff responds/hides questions and publishes novedades. Public GET endpoints expose aggregated social data.

**Independent Test**: POST /reaccionar (upsert toggle), POST /comentarios (with optional padreId for 2-level nesting), POST /valorar (upsert — second call updates, not duplicates), POST /preguntas, POST /seguir (toggle returns `{ siguiendo, totalSeguidores }`), POST /favorito (toggle). Staff: POST /preguntas/:id/responder creates `ConsultorioRespuesta`; PATCH /ocultar sets estado=INACTIVO (hides from public GET /preguntas). Staff: POST /novedades creates `Publicacion`. Public GET endpoints exclude INACTIVO records.

### Implementation for User Story 5

- [x] T040 [P] [US5] Implement `src/modules/social/application/consultorio/reaccionar-consultorio.usecase.ts`: upsert `ConsultorioReaccion` by `(consultorioId, userId)`; toggle (delete) if same tipo submitted again; return `{ tipo: string | null, removed: boolean, reacciones: [{ tipo, total }] }`

- [x] T041 [P] [US5] Implement `src/modules/social/application/consultorio/comentar-consultorio.usecase.ts`: create `ConsultorioComentario`; accept optional `padreId`; validate `padreId` exists if provided; call `IConsultorioSocialNotificador.emitirNuevoComentario(tenantId, { consultorioSlug, comentarioId })`; return created `ConsultorioComentario`

- [x] T042 [P] [US5] Implement `src/modules/social/application/consultorio/responder-comentario-consultorio.usecase.ts`: create child `ConsultorioComentario` with `padreId`; validate parent exists and `parent.padreId === null` (enforce max 2 nesting levels); return created child comment

- [x] T043 [P] [US5] Implement `src/modules/social/application/consultorio/valorar-consultorio.usecase.ts`: upsert `ConsultorioValoracion` by `@@unique([consultorioId, userId])`; validate `puntuacion` in 1–5; recalculate `promedioValoracion` after upsert; call `IConsultorioSocialNotificador.emitirNuevaValoracion(tenantId, { consultorioSlug, promedio, total })`; return saved `ConsultorioValoracion`

- [x] T044 [P] [US5] Implement `src/modules/social/application/consultorio/preguntar-consultorio.usecase.ts`: create `ConsultorioPregunta` with `estado=ACTIVO`; call `IConsultorioSocialNotificador.emitirNuevaPregunta(tenantId, { consultorioSlug, preguntaId })`; return created `ConsultorioPregunta`

- [x] T045 [P] [US5] Implement `src/modules/social/application/consultorio/toggle-seguir-consultorio.usecase.ts`: upsert/delete `ConsultorioSeguidor` by `@@unique([consultorioId, userId])`; call `IConsultorioSocialNotificador.emitirNuevoSeguidor(tenantId, { consultorioSlug, totalSeguidores })` when following; return `{ siguiendo: boolean, totalSeguidores: number }`

- [x] T046 [P] [US5] Implement `src/modules/social/application/consultorio/toggle-favorito-consultorio.usecase.ts`: upsert/delete `ConsultorioFavorito` by `@@unique([consultorioId, userId])`; return `{ favorito: boolean }`

- [x] T047 [P] [US5] Implement `src/modules/social/application/publicacion-consultorio/publicar-novedad-consultorio.usecase.ts`: create `Publicacion` record with `tenantId` from consultorio context (reuse existing `Publicacion` model per research.md Decision 5); require `PROPIETARIO` or `ADMIN` role check; call `IConsultorioSocialNotificador.emitirNuevaPublicacion(tenantId, { consultorioSlug, publicacionId })`; return `{ id, estado: "PUBLICADO", createdAt }`

- [x] T048 [P] [US5] Implement `src/modules/social/application/publicacion-consultorio/listar-publicaciones-consultorio.usecase.ts`: query `Publicacion` by `tenantId` (from slug resolution); cursor-based pagination following `restaurante-social.prisma.repository.ts` `makeMeta()` pattern; return `{ data: Publicacion[], meta: { take, total, hasMore, nextCursor } }`

- [x] T049 [US5] Implement `src/modules/social/adapters/consultorio-social-publica.rest.ts` with Hono+zod-openapi GET routes (no auth): `GET /:slug/reacciones` → grouped by tipo, `GET /:slug/comentarios` (cursor, optional padreId, exclude INACTIVO), `GET /:slug/valoraciones` (cursor, orderBy puntuacion|fecha), `GET /:slug/preguntas` (cursor, ACTIVO only, include respuestas), `GET /:slug/seguidores/count` → `{ total }`, `GET /:slug/publicaciones` (cursor); export `consultorioSocialPublicaRouter`

- [x] T050 [US5] Implement `src/modules/social/adapters/consultorio-social-consumer.rest.ts` with Hono+zod-openapi POST routes (all require Bearer auth): `POST /:slug/reaccionar` → T040, `POST /:slug/comentarios` → T041 + T042, `POST /:slug/valorar` → T043, `POST /:slug/preguntas` → T044, `POST /:slug/seguir` → T045, `POST /:slug/favorito` → T046; export `consultorioSocialConsumerRouter`

- [x] T051 [US5] Implement `src/modules/social/adapters/consultorio-social-staff.rest.ts` with Hono+zod-openapi routes (require `esConsultorio` guard; PROPIETARIO/ADMIN for respond/hide/publish): `GET /preguntas` (include INACTIVO, cursor), `POST /preguntas/:preguntaId/responder` (body: `{ respuesta }` → creates `ConsultorioRespuesta` via repository), `PATCH /preguntas/:preguntaId/ocultar` (estado → INACTIVO), `PATCH /preguntas/:preguntaId/mostrar` (estado → ACTIVO), `POST /novedades` → T047; export `consultorioSocialStaffRouter`

- [x] T052 [US5] Update `src/modules/social/adapters/social.router.ts` to register 3 new consultorio routers per quickstart.md wiring: `socialApp.route("/consultorios", consultorioSocialConsumerRouter)`, `socialApp.route("/staff/consultorios", consultorioSocialStaffRouter)`, `publicSocialApp.route("/consultorios", consultorioSocialPublicaRouter)` — match exact routing convention used for restaurante routers in the same file

- [x] T053 [US5] Register in `src/server/index.ts`: import and call `setConsultorioSocialNotificador(new ConsultorioSocialSocketNotificador(io))` per quickstart.md Fase 4

**Checkpoint**: US5 functional — full social layer: reactions, comments, ratings, questions, follow, favorite, novedades.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T054 [P] Privacy audit: inspect all response DTOs in `consultorio-publica.rest.ts`, `consultorio-consumer-citas.rest.ts`, `consultorio-social-publica.rest.ts`, `consultorio-social-consumer.rest.ts` — verify none include `HistoriaClinica`, `AtencionMedica`, `RecetaMedica`, `Paciente`, `diagnóstico`, `receta`, or billing fields; confirm FR-011 and SC-006 from spec.md pass

- [x] T055 [P] Paginación contract compliance: verify all offset-based listados (directorio, servicios, citas-online, mis-citas) use `paginate()` from `src/core/query-params.ts` and return `{ data, total, page, take, totalPaginas, hayPaginaSiguiente, hayPaginaAnterior }`; verify all cursor-based listados (comentarios, valoraciones, preguntas, publicaciones) return `{ data, meta: { take, total, hasMore, nextCursor } }` per FR-033 and FR-034

- [x] T056 Run complete happy-path validation per `specs/015-tu-consultorio/quickstart.md`: activar perfil → configurar → listar directorio → ver perfil → consultar slots → crear cita online → cancelar cita → valorar → seguir consultorio

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1. Schema tasks T002–T005 can run in parallel; T006 (migrate) blocks on T002–T005. Domain ports T007–T013 can run in parallel with schema tasks. Infrastructure T014–T019 requires T006 + respective ports complete
- **Phase 3 (US1)**: Requires all of Phase 2 complete
- **Phase 4 (US2)**: Requires Phase 2 complete; independent of US1 but shares `consultorio-publica.rest.ts` (created in T025 — coordinate file ownership)
- **Phase 5 (US4)**: Requires Phase 2 complete; independent of US1/US2
- **Phase 6 (US3)**: Requires Phase 2 complete; `consultorio-publica.rest.ts` already exists from US1 (T025)
- **Phase 7 (US5)**: Requires Phase 2 complete; entirely in `src/modules/social/` — fully independent of US1–US4
- **Phase 8 (Polish)**: Requires all desired user stories complete

### Parallel Opportunities Within Phase 2

```
Parallel group A (different prisma files):
  T002  prisma/60-consultorio.prisma
  T003  prisma/10-tenant.prisma
  T004  prisma/80-social.prisma

Sequential after T004:
  T005  User model back-relations

Sequential after T002–T005:
  T006  prisma generate + migrate

Parallel group B (independent interfaces — run alongside group A):
  T007  IConsultorioPublicoRepository.ts
  T008  IConsultorioPublicoNotificador.ts
  T009  consultorio-publico.errors.ts
  T010  consultorio.schema.ts
  T011  IConsultorioSocialRepository.ts
  T012  IConsultorioSocialNotificador.ts
  T013  consultorio-social.errors.ts

After T006 + group B complete:
  T014, T015, T016  (consultorio module infra — parallel)
  T017, T018, T019  (social module infra — parallel)
```

### Parallel Opportunities Within Phase 7 (US5)

```
# All 9 use cases in parallel (different files):
T040 reaccionar-consultorio.usecase.ts
T041 comentar-consultorio.usecase.ts
T042 responder-comentario-consultorio.usecase.ts
T043 valorar-consultorio.usecase.ts
T044 preguntar-consultorio.usecase.ts
T045 toggle-seguir-consultorio.usecase.ts
T046 toggle-favorito-consultorio.usecase.ts
T047 publicar-novedad-consultorio.usecase.ts
T048 listar-publicaciones-consultorio.usecase.ts

# Then adapters (after use cases):
T049 consultorio-social-publica.rest.ts
T050 consultorio-social-consumer.rest.ts
T051 consultorio-social-staff.rest.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (**CRITICAL** — blocks all stories)
3. Complete Phase 3: US1 (staff can activate profile, consumers can view it)
4. **STOP and VALIDATE**: GET /api/public/consultorios/:slug returns correctly configured profile
5. Continue with US2 (directorio) or US4 (citas) — both P2

### Incremental Delivery

| Step | Phase | Deliverable |
|------|-------|------------|
| 1 | 1 + 2 | Foundation (schema + infra) |
| 2 | 3 (US1) | Staff manages public profile |
| 3 | 4 (US2) | Public directory live |
| 4 | 5 (US4) | Online booking working |
| 5 | 6 (US3) | Services catalog live |
| 6 | 7 (US5) | Full social layer |
| 7 | 8 | Polish + ship |

### Parallel Team Strategy (Two Developers After Phase 2)

- **Developer A**: Phase 4 (US2, 3 tasks) + Phase 6 (US3, 2 tasks)
- **Developer B**: Phase 5 (US4, 8 tasks)
- **Both**: Phase 7 (US5) in parallel — each takes half the use cases

---

## Notes

- Follow `src/modules/restaurante/` for all use case and repository patterns
- Follow `src/modules/social/infrastructure/restaurante-social.prisma.repository.ts` for social repository cursor-based pagination
- Guard `esConsultorio` **must** be applied to ALL staff endpoints per quickstart.md
- `resolveConsultorioInfo(slug)` validates `esConsultorio=true` and returns `consultorioId` + `tenantId` — always use this for slug resolution
- Clinical data privacy: NEVER expose `HistoriaClinica`, `AtencionMedica`, `RecetaMedica`, `Paciente`, diagnósticos in public or consumer responses (FR-011, SC-006)
- Slot conflict detection uses Prisma `$transaction` with a pre-create conflict check — see quickstart.md Fase 2 for the exact pattern
- Cursor-based pagination (`makeMeta()`) for social listados; offset-based (`paginate()`) for citas, directorio, servicios
