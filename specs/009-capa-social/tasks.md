# Tasks: Capa Social de la Plataforma

**Input**: Design documents from `specs/009-capa-social/`  
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/rest-api.md ✅ | quickstart.md ✅

**Tests**: Unit tests incluidos para lógica de negocio no trivial (state machine, cascada, upsert). Integration tests para repositorios Prisma.

**Organization**: Tareas agrupadas por user story para implementación y prueba independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1–US4)

---

## Phase 1: Setup

**Purpose**: Estructura del módulo + errores de dominio + schemas Zod compartidos.

- [X] T001 Create module directory structure `src/modules/social/{domain,domain/ports,application/{producto,tienda,publicacion},infrastructure,adapters}/` and `tests/social/{unit/{domain,application},integration}/`
- [X] T002 [P] Create `src/modules/social/domain/social.errors.ts` with domain error classes: `ProductoNoEncontrado`, `TiendaNoEncontrada`, `PublicacionNoEncontrada`, `ComentarioNoEncontrado`, `PreguntaNoEncontrada`, `NoAutorizado`, `EstadoPublicacionInvalido`, `PuntuacionInvalida`, `ComentarioEsRespuesta`, `SoloPropietarioAdmin`
- [X] T003 [P] Create `src/modules/social/adapters/social.schema.ts` with Zod schemas: `ReaccionProductoSchema` (emoji string), `ReaccionTipoSchema` (TipoReaccion enum), `ComentarioSchema` (contenido + padreId?), `ValoracionSchema` (puntuacion 1-5 + resena?), `PreguntaSchema`, `RespuestaSchema`, `CompartirSchema` (plataforma), `CrearPublicacionSchema` (titulo?, contenido?, tipo, etiquetas?, medios?[]), `EstadoPublicacionSchema` (PUBLICADO|ARCHIVADO)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Puertos (interfaces) + notificador null (para tests). DEBE completarse antes de cualquier user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Create `src/modules/social/domain/ports/ISocialNotificador.ts` with methods: `reaccionCreada(tenantId, payload)`, `comentarioCreado(tenantId, payload)`, `valoracionCreada(tenantId, payload)`, `publicacionNueva(tenantId, payload)` — payload types defined inline
- [X] T005 [P] Create `src/modules/social/domain/ports/IProductoSocialRepository.ts` with methods for reactions (toggle emoji), comments (CRUD + cascade delete), valoraciones (upsert), preguntas (create, list), respuestas (create), favoritos (toggle), listings with pagination
- [X] T006 [P] Create `src/modules/social/domain/ports/ITiendaSocialRepository.ts` with methods: resolveTiendaId(slug), reactions (upsert TipoReaccion), comments (CRUD + cascade), valoraciones (upsert), preguntas, respuestas, favoritos (toggle), seguimiento (toggle), seguidores count, listings with pagination
- [X] T007 [P] Create `src/modules/social/domain/ports/IPublicacionRepository.ts` with methods: create, update, findById, findByTenant (with filters: estado, etiqueta, pagination), cambiarEstado, reactions (upsert TipoReaccion), comments (CRUD + cascade), compartir (create log)
- [X] T008 [P] Create `src/modules/social/infrastructure/social.null.notificador.ts` implementing `ISocialNotificador` with no-op methods (used in tests)
- [X] T009 Create `src/modules/social/infrastructure/social.notificador.provider.ts` with `getSocialNotificador()` / `setSocialNotificador(n)` pattern (same pattern as restaurante module)

**Checkpoint**: Foundation ready — user story phases can begin.

---

## Phase 3: User Story 1 — Interacciones sobre Productos (Priority: P1) 🎯 MVP

**Goal**: Usuarios autenticados pueden reaccionar (emoji), comentar (anidado), valorar (upsert 1-5), preguntar/responder y marcar favoritos sobre cualquier producto. Visitantes no autenticados leen todas las interacciones.

**Independent Test**: Crear producto en catálogo → reaccionar, comentar, responder, valorar, preguntar, marcar favorito → verificar listados públicos y tiempo real.

### Implementation

- [X] T010 [P] [US1] Create `src/modules/social/domain/producto-comentario.entity.ts` with fields (id, productoId, tenantId, userId, contenido, editado, estado, padreId, createdAt, updatedAt), `esRespuesta()`, `puedeEditarOEliminar(userId, rol)` methods
- [X] T011 [P] [US1] Create `src/modules/social/domain/producto-valoracion.entity.ts` with fields (id, productoId, tenantId, userId, puntuacion, resena, estado), validate puntuacion 1-5 in constructor
- [X] T012 [P] [US1] Create `src/modules/social/application/producto/reaccionar-producto.usecase.ts` — toggle: if emoji exists for user delete it (returns `removed:true`), else create; emits `notificador.reaccionCreada`; resolves `productoId` via repo
- [X] T013 [P] [US1] Create `src/modules/social/application/producto/comentar-producto.usecase.ts` — validates `padreId` is a root comment (not a reply) before allowing nesting; emits `notificador.comentarioCreado`
- [X] T014 [P] [US1] Create `src/modules/social/application/producto/editar-comentario-producto.usecase.ts` — verifies userId === comentario.userId (throw `NoAutorizado` if not); sets `editado=true`
- [X] T015 [P] [US1] Create `src/modules/social/application/producto/eliminar-comentario-producto.usecase.ts` — if root comment: `repo.deleteRespuestasByPadre(comentarioId)` then `repo.deleteComentario(comentarioId)`; if reply: delete directly; allow if userId===autor OR rol in [PROPIETARIO, ADMIN, ENCARGADO]
- [X] T016 [P] [US1] Create `src/modules/social/application/producto/valorar-producto.usecase.ts` — upsert: create or update valoracion; validates puntuacion 1-5; emits `notificador.valoracionCreada` with `nuevoPromedio`
- [X] T017 [P] [US1] Create `src/modules/social/application/producto/preguntar-producto.usecase.ts` — creates `ProductoPregunta`; no notification (low-urgency)
- [X] T018 [P] [US1] Create `src/modules/social/application/producto/responder-pregunta-producto.usecase.ts` — verifies pregunta exists; creates `ProductoRespuesta`
- [X] T019 [P] [US1] Create `src/modules/social/application/producto/toggle-favorito-producto.usecase.ts` — if favorito exists delete it (returns `favorito:false`), else create (returns `favorito:true`)
- [X] T020 [P] [US1] Create `src/modules/social/application/producto/listar-comentarios-producto.usecase.ts` — paginated list using `makeQueryParamsSchema`; supports `soloRaiz` flag to filter root comments only; includes respuestas when `soloRaiz=false`
- [X] T021 [P] [US1] Create `src/modules/social/application/producto/listar-valoraciones-producto.usecase.ts` — paginated with meta.promedio calculated; orderable by fecha or puntuacion
- [X] T022 [P] [US1] Create `src/modules/social/application/producto/listar-preguntas-producto.usecase.ts` — paginated; includes respuestas array per question
- [X] T023 [US1] Create `src/modules/social/infrastructure/producto-social.prisma.repository.ts` implementing `IProductoSocialRepository` using `prismaBase as any`; implements all methods including: `toggleReaccionProducto` (findUnique by (productoId, userId, emoji) → delete or create), `upsertValoracion`, `deleteRespuestasByPadre`, `getPromedioValoraciones`, paginated listings
- [X] T024 [US1] Create `src/modules/social/adapters/producto-social.rest.ts` with `productoSocialRouter` (Hono) and `publicProductoSocialRouter`; staff routes use `requireAuth`; public GET routes use no auth; route `tenantId` from session for write routes; `slug` for public routes

**Checkpoint**: US1 completa — interacciones sobre productos funcionan end-to-end.

---

## Phase 4: User Story 2 — Interacciones sobre el Tenant/Tienda (Priority: P2)

**Goal**: Usuarios autenticados pueden reaccionar (TipoReaccion enum), comentar, valorar, preguntar, marcar favorito y seguir la vitrina del tenant. Solo funciona para tenants con `esTienda=true`.

**Independent Test**: Activar esTienda en tenant → realizar todas las interacciones → verificar conteo de seguidores → verificar guard para tenants sin Tienda.

### Implementation

- [X] T025 [P] [US2] Create `src/modules/social/domain/tienda-comentario.entity.ts` with same structure as `producto-comentario.entity.ts` but referencing `tiendaId` instead of `productoId`
- [X] T026 [P] [US2] Create `src/modules/social/domain/tienda-valoracion.entity.ts` — same structure as `producto-valoracion.entity.ts` with `tiendaId`
- [X] T027 [P] [US2] Create `src/modules/social/application/tienda/reaccionar-tienda.usecase.ts` — upsert pattern: one `TipoReaccion` per user per tienda; if same tipo → remove (toggle); if different tipo → update; emits `notificador.reaccionCreada`
- [X] T028 [P] [US2] Create `src/modules/social/application/tienda/comentar-tienda.usecase.ts` — same cascade-prevention logic as producto; emits `notificador.comentarioCreado`
- [X] T029 [P] [US2] Create `src/modules/social/application/tienda/editar-comentario-tienda.usecase.ts`
- [X] T030 [P] [US2] Create `src/modules/social/application/tienda/eliminar-comentario-tienda.usecase.ts` — cascade same as producto
- [X] T031 [P] [US2] Create `src/modules/social/application/tienda/valorar-tienda.usecase.ts` — upsert; emits `notificador.valoracionCreada`
- [X] T032 [P] [US2] Create `src/modules/social/application/tienda/preguntar-tienda.usecase.ts`
- [X] T033 [P] [US2] Create `src/modules/social/application/tienda/responder-pregunta-tienda.usecase.ts`
- [X] T034 [P] [US2] Create `src/modules/social/application/tienda/toggle-favorito-tienda.usecase.ts` — toggle
- [X] T035 [P] [US2] Create `src/modules/social/application/tienda/toggle-seguir-tienda.usecase.ts` — toggle; returns `{ siguiendo: true|false }`
- [X] T036 [P] [US2] Create `src/modules/social/application/tienda/listar-comentarios-tienda.usecase.ts` — paginated
- [X] T037 [P] [US2] Create `src/modules/social/application/tienda/listar-valoraciones-tienda.usecase.ts` — paginated with promedio
- [X] T038 [P] [US2] Create `src/modules/social/application/tienda/listar-preguntas-tienda.usecase.ts` — paginated with respuestas
- [X] T039 [US2] Create `src/modules/social/infrastructure/tienda-social.prisma.repository.ts` implementing `ITiendaSocialRepository`; includes `resolveTiendaId(slug)` (looks up `tenant.slug → tienda.id`); throws `TiendaNoEncontrada` if tenant has no Tienda record; upsert for reacciones and valoraciones
- [X] T040 [US2] Create `src/modules/social/adapters/tienda-social.rest.ts` with `tiendaSocialRouter` and `publicTiendaSocialRouter`; resolves `tiendaId` via slug for all routes; write routes require `requireAuth`; reads are public

**Checkpoint**: US2 completa — vitrina de tienda social funciona; guard para esTienda=false retorna 404.

---

## Phase 5: User Story 3 — Publicaciones del Tenant (Priority: P3)

**Goal**: PROPIETARIO y ADMIN pueden crear/publicar/archivar publicaciones con medios. Cualquier usuario autenticado puede reaccionar, comentar y compartir. Visitantes leen publicaciones publicadas.

**Independent Test**: PROPIETARIO crea publicación → publica → usuario comenta → ENCARGADO intenta crear (403) → staff archiva → publicación desaparece del feed público.

### Implementation

- [X] T041 [P] [US3] Create `src/modules/social/domain/publicacion.entity.ts` with state machine `BORRADOR → PUBLICADO → ARCHIVADO` (no reverse transitions); methods: `validarTransicion(nuevoEstado)`, `estaPublicada()`, `esBorrador()`; throws `EstadoPublicacionInvalido` on invalid transition; fields: id, tenantId, autorId, titulo, contenido, tipo, estado, etiquetas, publicadoEn, medios[], createdAt, updatedAt
- [X] T042 [P] [US3] Create `src/modules/social/domain/publicacion-comentario.entity.ts` — same structure as producto-comentario.entity.ts with `publicacionId` instead of `productoId`
- [X] T043 [US3] Create `src/modules/social/application/publicacion/crear-publicacion.usecase.ts` — verifies `rol IN [PROPIETARIO, ADMIN]` (throw `SoloPropietarioAdmin`); creates `Publicacion` in BORRADOR; creates associated `PublicacionMedia[]` records
- [X] T044 [US3] Create `src/modules/social/application/publicacion/actualizar-publicacion.usecase.ts` — verifies rol + estado=BORRADOR; updates titulo, contenido, etiquetas; replaces medios[] (delete all then recreate)
- [X] T045 [US3] Create `src/modules/social/application/publicacion/cambiar-estado-publicacion.usecase.ts` — verifies rol PROPIETARIO|ADMIN; calls `publicacion.validarTransicion(nuevoEstado)`; sets `publicadoEn=now()` when transitioning to PUBLICADO; emits `notificador.publicacionNueva` on PUBLICADO
- [X] T046 [P] [US3] Create `src/modules/social/application/publicacion/listar-publicaciones.usecase.ts` — supports `estado` filter (staff sees all; public call passes estado=PUBLICADO); filterable by `etiqueta`; paginated
- [X] T047 [P] [US3] Create `src/modules/social/application/publicacion/obtener-publicacion.usecase.ts` — returns publicacion + medios + reacciones (count per tipo) + primera página de comentarios
- [X] T048 [P] [US3] Create `src/modules/social/application/publicacion/reaccionar-publicacion.usecase.ts` — upsert TipoReaccion (one per user); toggle if same tipo; emits `notificador.reaccionCreada`
- [X] T049 [P] [US3] Create `src/modules/social/application/publicacion/comentar-publicacion.usecase.ts` — cascade prevention for replies; emits `notificador.comentarioCreado`
- [X] T050 [P] [US3] Create `src/modules/social/application/publicacion/editar-comentario-publicacion.usecase.ts`
- [X] T051 [P] [US3] Create `src/modules/social/application/publicacion/eliminar-comentario-publicacion.usecase.ts` — cascade same pattern; allow if autor OR rol PROPIETARIO|ADMIN
- [X] T052 [P] [US3] Create `src/modules/social/application/publicacion/compartir-publicacion.usecase.ts` — creates `PublicacionCompartido` record; returns it (client uses plataforma to open share URL)
- [X] T053 [US3] Create `src/modules/social/infrastructure/publicacion.prisma.repository.ts` implementing `IPublicacionRepository` using `prismaBase as any`; includes: create with medios[], updateWithMediaReplace, findPublicas (estado=PUBLICADO), upsertReaccion, cascadeDeleteComentario
- [X] T054 [US3] Create `src/modules/social/adapters/publicacion-staff.rest.ts` with `publicacionStaffRouter` using `requireAuth` + `requireRol([PROPIETARIO, ADMIN])`: `POST /publicaciones`, `PUT /publicaciones/:id`, `PATCH /publicaciones/:id/estado`, `DELETE /publicaciones/:id`, `POST /publicaciones/:id/reaccionar`, `POST /publicaciones/:id/comentarios`, `PUT /comentarios/publicacion/:id`, `DELETE /comentarios/publicacion/:id`, `POST /publicaciones/:id/compartir`
- [X] T055 [US3] Create `src/modules/social/adapters/publicacion-publica.rest.ts` with `publicacionPublicaRouter` (no auth): `GET /:slug/publicaciones`, `GET /:slug/publicaciones/:id`; resolves tenantId from slug

**Checkpoint**: US3 completa — publicaciones end-to-end: staff crea/publica, usuarios interactúan, público lee.

---

## Phase 6: User Story 4 — Actualizaciones en Tiempo Real (Priority: P4)

**Goal**: Todas las interacciones emiten eventos Socket.IO a la sala del tenant y sub-salas por elemento. Usuarios conectados ven cambios en < 2 segundos.

**Independent Test**: Abrir dos clientes Socket.IO suscritos a `tenant:{id}:producto:{id}` → primera sesión reacciona vía REST → segunda sesión recibe evento sin recargar.

### Implementation

- [X] T056 [US4] Create `src/modules/social/infrastructure/social.socket.notificador.ts` implementing `ISocialNotificador`; constructor receives `io: Server`; each method emits to `tenant:${tenantId}` AND the relevant sub-sala (`tenant:${tenantId}:producto:${elementoId}` or `tenant:${tenantId}:publicacion:${publicacionId}`) using `io.to(sala1).to(sala2).emit(event, payload)`
- [X] T057 [US4] Update `src/modules/social/infrastructure/social.notificador.provider.ts` to export `setSocialNotificador(n: ISocialNotificador)` and `getSocialNotificador()` (singleton pattern — same as restaurante module)
- [X] T058 [US4] Wire up real-time in `src/server/index.ts`: import `SocialSocketNotificador`, `setSocialNotificador`; add `setSocialNotificador(new SocialSocketNotificador(io))` after socket setup

**Checkpoint**: US4 completa — todos los eventos sociales emitidos en tiempo real.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Router final, montaje en servidor, unit tests de lógica crítica, integration tests, validación manual.

- [X] T059 Create `src/modules/social/adapters/social.router.ts` exporting `socialApp` (Hono, requireAuth routes) and `publicSocialApp` (Hono, public routes): mount `productoSocialRouter`, `tiendaSocialRouter`, `publicacionStaffRouter` in `socialApp`; mount `publicProductoSocialRouter`, `publicTiendaSocialRouter`, `publicacionPublicaRouter` in `publicSocialApp`
- [X] T060 Mount social routes in `src/server/hono.ts`: `app.route("/api/social", socialApp)` and `app.route("/api/public/social", publicSocialApp)` (import from social.router.ts)
- [X] T061 [P] Write unit tests `tests/social/unit/domain/publicacion.entity.test.ts` — test state machine: valid transitions (BORRADOR→PUBLICADO, PUBLICADO→ARCHIVADO), invalid transitions throw `EstadoPublicacionInvalido`
- [X] T062 [P] Write unit tests `tests/social/unit/application/eliminar-comentario-producto.usecase.test.ts` — test cascade: root comment with 2 replies → deleteRespuestasByPadre called before deleteComentario; reply comment → direct delete only
- [X] T063 [P] Write unit tests `tests/social/unit/application/valorar-producto.usecase.test.ts` — test upsert: first valoracion creates; second call from same user updates; invalid puntuacion (0 or 6) throws `PuntuacionInvalida`
- [X] T064 [P] Write integration tests `tests/social/integration/producto-social.prisma.repository.test.ts` using `describe.skipIf(!process.env.DATABASE_URL)` — test toggle emoji reaction, upsert valoracion, cascade comment delete, favorito toggle
- [X] T065 [P] Write integration tests `tests/social/integration/tienda-social.prisma.repository.test.ts` — test resolveTiendaId throws for tenant with esTienda=false, upsert reaccion (TipoReaccion), seguimiento toggle
- [X] T066 [P] Write integration tests `tests/social/integration/publicacion.prisma.repository.test.ts` — test cambiarEstado, upsert publicacion reaccion, cascade comment delete on publicacion
- [X] T067 Run TypeScript type check `pnpm tsc --noEmit` and fix any type errors in the social module
- [X] T068 Manual validation: execute quickstart.md Escenario 1 (reaccionar a producto + tiempo real) and Escenario 5 (crear y publicar publicación) — verify end-to-end behavior
- [X] T069 Manual validation: execute quickstart.md Escenario 8 (guard ENCARGADO) and Escenario 9 (Tienda no activa) — verify error responses match contracts
- [X] T070 Update memory file `C:\Users\UnseR\.claude\projects\d--Marcelo-REACT-vendora-vendora-backend\memory\project_008_restaurante.md` to reflect completion of feature 008 and start of feature 009

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Sin dependencias — comenzar inmediatamente
- **Phase 2 (Foundational)**: Depende de Phase 1 — **BLOQUEA todas las user stories**
- **Phase 3 (US1)**: Depende de Phase 2; no depende de US2/US3/US4
- **Phase 4 (US2)**: Depende de Phase 2; no depende de US1/US3/US4
- **Phase 5 (US3)**: Depende de Phase 2; no depende de US1/US2/US4
- **Phase 6 (US4)**: Depende de Phase 2; debe completarse para que los eventos sean reales (sin ella, null notificador se usa en pruebas)
- **Phase 7 (Polish)**: Depende de todas las fases anteriores

### User Story Dependencies

- **US1 (P1)**: Puede iniciarse tras Foundational. Sin dependencias de otras US.
- **US2 (P2)**: Puede iniciarse tras Foundational. Sin dependencias de US1 (comparte solo el patrón, no el código).
- **US3 (P3)**: Puede iniciarse tras Foundational. Sin dependencias de US1/US2.
- **US4 (P4)**: El socket notificador es independiente; el null notificador (T008) ya provee stub para US1-US3.

### Parallel Opportunities

```bash
# Phase 1 (T001-T003): T002 y T003 en paralelo con T001
# Phase 2 (T004-T009): T005, T006, T007, T008 en paralelo con T004
# Phase 3 US1 (T010-T024): T010-T022 todos en paralelo entre sí; T023 tras T010-T022; T024 tras T023
# Phase 4 US2 (T025-T040): T025-T038 en paralelo; T039 tras T025-T038; T040 tras T039
# Phase 5 US3 (T041-T055): T041-T042 en paralelo; T046-T052 en paralelo; T053 tras T041-T052; T054-T055 tras T053
# Phase 7 (Polish): T061-T066 todos en paralelo
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 + Phase 2 (setup + foundation)
2. Complete Phase 3 (US1 — interacciones sobre productos)
3. **STOP y VALIDAR**: Reaccionar, comentar, valorar un producto desde REST. Verificar listados públicos.
4. Deploy/demo US1 si está listo

### Incremental Delivery

1. Setup + Foundational → Estructura del módulo lista
2. **US1** → MVP: interacciones sobre productos ✅
3. **US2** → Vitrina de tienda social ✅
4. **US3** → Publicaciones del tenant ✅
5. **US4** → Tiempo real activado para todas las interacciones ✅
6. Polish → Pruebas + validación manual

---

## Notes

- El schema `80-social.prisma` ya está migrado — no crear ni modificar archivos Prisma
- `ProductoReaccion` permite múltiples emojis por usuario (emoji libre); `TiendaReaccion`/`PublicacionReaccion` usan `TipoReaccion` enum con una por usuario — ver Decision 3 de research.md
- Usar `prismaBase as any` para queries cross-schema (catalogo.Producto, tenant.Tienda)
- La eliminación de comentarios raíz con respuestas se hace en dos pasos en el use case (Decision 4 de research.md)
- Auth tri-nivel: reads public, writes any-auth-user (tenantId del recurso), staff-only para publicaciones
