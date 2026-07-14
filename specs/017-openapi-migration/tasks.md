# Tasks: Migración a OpenAPI Documentado

**Input**: Design documents from `/specs/017-openapi-migration/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/migration-pattern.md ✅, quickstart.md ✅

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths in all descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and create shared helpers required by all module migrations.

- [x] T001 Install `@hono/swagger-ui` dependency via `npm install @hono/swagger-ui` and verify entry in `package.json`
- [x] T002 Create `src/core/openapi-responses.ts` with `okResponse`, `createdResponse`, `errorResponses` (400/401/403/404/409/422), `ErrorResponseSchema`, and `PaginatedMetaSchema` per `contracts/migration-pattern.md`
- [x] T003 Add `bearerAuth` HTTP Bearer security scheme to `components.securitySchemes` inside the `app.doc()` config object in `src/server/hono.ts` so all `security: [{ bearerAuth: [] }]` route declarations resolve correctly

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Integration test that enforces the CI gate — it will fail until all migrations complete.

**⚠️ CRITICAL**: Write the test first so it fails while migrations are pending; it becomes the acceptance gate for US1.

- [x] T004 Create `tests/integration/openapi.spec.ts` with two Vitest tests: (1) `GET /api/openapi.json` returns >100 entries in `paths`, (2) all `operationId` values across every path item are globally unique — import `crearApp()` from `src/server/hono.ts` directly (no server needed) per `contracts/migration-pattern.md`

**Checkpoint**: Foundation ready — module-by-module US1 migration can now begin.

---

## Phase 3: User Story 1 — API completamente explorable desde el spec (Priority: P1) 🎯 MVP

**Goal**: Migrate all ~55 routers and 6 aggregators from `new Hono<HonoEnv>()` to `new OpenAPIHono<HonoEnv>()` with `createRoute` + `.openapi()` so `GET /api/openapi.json` returns >100 documented paths covering every module.

**Independent Test**: Call `GET /api/openapi.json` and verify paths exist for all modules: Autenticación, Tenant, Catálogo, Almacén, Ventas, Consultorio, Restaurante, Tienda, Social. Each path must have `operationId` (unique, following `{módulo}_{verbo}_{recurso}`), at least one `tag`, and a 200/201 response.

### Grupo 1 — Tenant

- [x] T005 [US1] Migrate `src/modules/tenant/adapters/tenant.rest.ts` → `OpenAPIHono<HonoEnv>`, convert 4 routes (`GET /`, `GET /actual`, `GET /miembros`, `GET /invitaciones`) using `createRoute` with `operationId` pattern `tenant_{verbo}_{recurso}`, tag `Tenant`, `security: [{ bearerAuth: [] }]`, import helpers from `src/core/openapi-responses.ts`; run `npx tsc --noEmit` after

### Grupo 2 — Autenticación

- [x] T006 [US1] Migrate `src/modules/autenticacion/adapters/auth.rest.ts` → `OpenAPIHono<HonoEnv>`; add stub catch-all `GET /auth/{...path}` with `operationId: "auth_catch_all_better_auth"` tag `Autenticación` and `DELETE /user` with `operationId: "auth_eliminar_usuario"`, `security: [{ bearerAuth: [] }]`, per the Better-Auth pattern in `contracts/migration-pattern.md`; run `npx tsc --noEmit` after

### Grupo 3 — Catálogo

- [x] T007 [P] [US1] Migrate `src/modules/catalogo/adapters/catalogo-router.ts` → `OpenAPIHono<HonoEnv>` (constructor change only; `.use()` and `.route()` calls unchanged) per aggregator pattern in `contracts/migration-pattern.md`
- [x] T008 [P] [US1] Migrate `src/modules/catalogo/adapters/actividad-economica.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Catálogo`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file
- [x] T009 [P] [US1] Migrate `src/modules/catalogo/adapters/unidad-medida.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Catálogo`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file
- [x] T010 [P] [US1] Migrate `src/modules/catalogo/adapters/categoria.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Catálogo`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file
- [x] T011 [P] [US1] Migrate `src/modules/catalogo/adapters/producto.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Catálogo`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file; run `npx tsc --noEmit` after T007-T011

### Grupo 4 — Almacén

- [x] T012 [P] [US1] Migrate `src/modules/almacen/adapters/almacen-router.ts` → `OpenAPIHono<HonoEnv>` (constructor change only; `.use()` and `.route()` calls unchanged)
- [x] T013 [P] [US1] Migrate `src/modules/almacen/adapters/almacen-operaciones.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Almacén`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file
- [x] T014 [P] [US1] Migrate `src/modules/almacen/adapters/inventario.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Almacén`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file
- [x] T015 [P] [US1] Migrate `src/modules/almacen/adapters/receta.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Almacén`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file
- [x] T016 [P] [US1] Migrate `src/modules/almacen/adapters/insumo.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Almacén`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file; run `npx tsc --noEmit` after T012-T016

### Grupo 5 — Ventas

- [x] T017 [P] [US1] Migrate `src/modules/ventas/adapters/ventas-router.ts` → `OpenAPIHono<HonoEnv>` (constructor change only; `.use()` and `.route()` calls unchanged)
- [x] T018 [P] [US1] Migrate `src/modules/ventas/adapters/cliente.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Ventas`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file
- [x] T019 [P] [US1] Migrate `src/modules/ventas/adapters/proveedor.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Ventas`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file
- [x] T020 [P] [US1] Migrate `src/modules/ventas/adapters/compra.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Ventas`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file
- [x] T021 [P] [US1] Migrate `src/modules/ventas/adapters/punto-venta.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Ventas`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file
- [x] T022 [P] [US1] Migrate `src/modules/ventas/adapters/turno-atencion.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Ventas`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file
- [x] T023 [P] [US1] Migrate `src/modules/ventas/adapters/caja.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Ventas`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file
- [x] T024 [P] [US1] Migrate `src/modules/ventas/adapters/gastos.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Ventas`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file
- [x] T025 [P] [US1] Migrate `src/modules/ventas/adapters/pedido.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Ventas`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file
- [x] T026 [P] [US1] Migrate `src/modules/ventas/adapters/venta.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Ventas`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file; run `npx tsc --noEmit` after T017-T026

### Grupo 6 — Consultorio

- [x] T027 [P] [US1] Migrate `src/modules/consultorio/adapters/consultorio-router.ts` → `OpenAPIHono<HonoEnv>` (constructor change only; `.use()` and `.route()` calls unchanged)
- [x] T028 [P] [US1] Migrate `src/modules/consultorio/adapters/consultorio.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Consultorio`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file
- [x] T029 [P] [US1] Migrate `src/modules/consultorio/adapters/medico.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Consultorio`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file
- [x] T030 [P] [US1] Migrate `src/modules/consultorio/adapters/paciente.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Consultorio`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file
- [x] T031 [P] [US1] Migrate `src/modules/consultorio/adapters/cita.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Consultorio`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file
- [x] T032 [P] [US1] Migrate `src/modules/consultorio/adapters/historia-clinica.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Consultorio`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file
- [x] T033 [P] [US1] Migrate `src/modules/consultorio/adapters/atencion-medica.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Consultorio`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file
- [x] T034 [P] [US1] Migrate `src/modules/consultorio/adapters/receta-medica.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Consultorio`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file
- [x] T035 [P] [US1] Migrate `src/modules/consultorio/adapters/servicio-medico.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Consultorio`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file
- [x] T036 [P] [US1] Migrate `src/modules/consultorio/adapters/vacunacion.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Consultorio`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file
- [x] T037 [P] [US1] Migrate `src/modules/consultorio/adapters/consultorio-publica.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Consultorio Público`, NO `security` field (public routes per FR-004), reuse existing schemas
- [x] T038 [P] [US1] Migrate `src/modules/consultorio/adapters/consultorio-consumer-citas.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Consultorio Público`, apply `security: [{ bearerAuth: [] }]` only to routes that use `requireAuth`, reuse existing schemas
- [x] T039 [P] [US1] Migrate `src/modules/consultorio/adapters/consultorio-staff-publico.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Consultorio Público`, NO `security` for routes under `/api/public/**` per FR-004, reuse existing schemas; run `npx tsc --noEmit` after T027-T039

### Grupo 7 — Restaurante

- [x] T040 [US1] Migrate `src/modules/restaurante/adapters/restaurante.router.ts` → change all 5 internal `Hono<HonoEnv>` instances to `OpenAPIHono<HonoEnv>` (keep every `.use()`, `.route()`, and `.all()` call unchanged)
- [x] T041 [P] [US1] Migrate `src/modules/restaurante/adapters/restaurante.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Restaurante`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file
- [x] T042 [P] [US1] Migrate `src/modules/restaurante/adapters/tiempo-comida.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Restaurante`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file
- [x] T043 [P] [US1] Migrate `src/modules/restaurante/adapters/menu.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Restaurante`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file
- [x] T044 [P] [US1] Migrate `src/modules/restaurante/adapters/menu-item.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Restaurante`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file
- [x] T045 [P] [US1] Migrate `src/modules/restaurante/adapters/reserva.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Restaurante`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file
- [x] T046 [P] [US1] Migrate `src/modules/restaurante/adapters/reserva-publica.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Restaurante Público`, NO `security` (public route per FR-004), reuse existing schemas
- [x] T047 [P] [US1] Migrate `src/modules/restaurante/adapters/cocina.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Restaurante`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file
- [x] T048 [P] [US1] Migrate `src/modules/restaurante/adapters/publicacion-rrss.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Restaurante`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file
- [x] T049 [P] [US1] Migrate `src/modules/restaurante/adapters/restaurante-publica.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Restaurante Público`, NO `security` (public routes per FR-004), reuse existing schemas
- [x] T050 [P] [US1] Migrate `src/modules/restaurante/adapters/restaurante-staff-publico.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Restaurante Público`, apply `security: [{ bearerAuth: [] }]` only to routes that use `requireAuth`, reuse existing schemas; run `npx tsc --noEmit` after T040-T050

### Grupo 8 — Tienda

- [x] T051 [P] [US1] Migrate `src/modules/tienda/adapters/tienda-staff.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Tienda`, `security: [{ bearerAuth: [] }]`, reuse existing schemas from the corresponding `*.schema.ts` file
- [x] T052 [P] [US1] Migrate `src/modules/tienda/adapters/tienda-publica.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Tienda Pública`, NO `security` (public routes per FR-004), reuse existing schemas; run `npx tsc --noEmit` after T051-T052

### Grupo 9 — Social

- [x] T053 [US1] Migrate `src/modules/social/adapters/social.router.ts` → change both internal `Hono<HonoEnv>` instances to `OpenAPIHono<HonoEnv>` (keep every `.use()` and `.route()` call unchanged)
- [x] T054 [P] [US1] Migrate `src/modules/social/adapters/producto-social.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Social`, apply `security` per individual route's auth requirement, reuse existing schemas
- [x] T055 [P] [US1] Migrate `src/modules/social/adapters/tienda-social.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Social`, apply `security` per individual route's auth requirement, reuse existing schemas
- [x] T056 [P] [US1] Migrate `src/modules/social/adapters/restaurante-social-consumer.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Social`, `security: [{ bearerAuth: [] }]`, reuse existing schemas
- [x] T057 [P] [US1] Migrate `src/modules/social/adapters/restaurante-social-staff.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Social`, `security: [{ bearerAuth: [] }]`, reuse existing schemas
- [x] T058 [P] [US1] Migrate `src/modules/social/adapters/restaurante-social-publica.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Social`, NO `security` (public routes), reuse existing schemas
- [x] T059 [P] [US1] Migrate `src/modules/social/adapters/publicacion-staff.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Social`, `security: [{ bearerAuth: [] }]`, reuse existing schemas
- [x] T060 [P] [US1] Migrate `src/modules/social/adapters/publicacion-publica.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Social`, NO `security` (public routes), reuse existing schemas
- [x] T061 [P] [US1] Migrate `src/modules/social/adapters/consultorio-social-consumer.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Social`, `security: [{ bearerAuth: [] }]`, reuse existing schemas
- [x] T062 [P] [US1] Migrate `src/modules/social/adapters/consultorio-social-staff.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Social`, `security: [{ bearerAuth: [] }]`, reuse existing schemas
- [x] T063 [P] [US1] Migrate `src/modules/social/adapters/consultorio-social-publica.rest.ts` → `OpenAPIHono<HonoEnv>`, convert all routes with `createRoute`, tag `Social`, NO `security` (public routes), reuse existing schemas; run `npx tsc --noEmit` after T053-T063

**Checkpoint**: All ~55 routers and 6 aggregators migrated. `GET /api/openapi.json` must return >100 paths. The integration test from T004 must pass.

---

## Phase 4: User Story 2 — Exploración interactiva en Swagger UI (Priority: P2)

**Goal**: Expose `GET /api/docs` with Swagger UI pointing to the fully-populated OpenAPI spec.

**Independent Test**: Open `/api/docs` in a browser; Swagger UI loads, shows all modules grouped by tag with no parse errors, and can execute a test request against a live endpoint.

- [x] T064 [US2] Add `import { swaggerUI } from "@hono/swagger-ui"` and `app.get("/api/docs", swaggerUI({ url: "/api/openapi.json" }))` to `src/server/hono.ts` after the `app.doc(...)` call per `contracts/migration-pattern.md`; run `npx tsc --noEmit`

**Checkpoint**: `/api/docs` renders Swagger UI with full spec. US1 and US2 both functional.

---

## Phase 5: User Story 3 — Generación de SDK tipado desde el spec (Priority: P3)

**Goal**: Ensure all endpoints with Zod schemas in `*.schema.ts` produce typed (non-`unknown`) entries in the generated spec so SDK generators produce usable TypeScript types.

**Independent Test**: Run `npx openapi-typescript http://localhost:3000/api/openapi.json --output types.d.ts`; the output must not contain `unknown` for endpoints that already have explicit schemas in `*.schema.ts`.

- [ ] T065 [US3] Audit all migrated `*.rest.ts` files for any remaining inline Zod validation (e.g. `Schema.safeParse(body)` or `await c.req.json()` not replaced by `c.req.valid("json")`) — extract any found inline schemas to the corresponding `*.schema.ts` file and update the `createRoute` `request.body` definition per FR-011; run `npx tsc --noEmit` after

**Checkpoint**: All request schemas are typed via `createRoute`; `openapi-typescript` produces non-`unknown` types for all documented endpoints.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification that the full migration satisfies all success criteria.

- [x] T066 Run `npx tsc --noEmit` across the full project and fix all remaining TypeScript errors from the migration; target 0 errors per SC-003
- [x] T067 Run `npm run test:integration` and confirm T004 test passes: >100 entries in `paths`, zero duplicate `operationId` values — verifying SC-001 and SC-008

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS US1 (T002 and T003 must exist before any `createRoute` uses them)
- **US1 (Phase 3)**: Depends on Phase 2; each of the 9 module groups is independent of the others
- **US2 (Phase 4)**: Depends on Phase 1 (package installed via T001) — can technically run after T001 but full value only after US1
- **US3 (Phase 5)**: Depends on US1 substantially complete — audits the migrated code
- **Polish (Phase 6)**: Depends on US1 + US2 + US3 completion

### User Story Dependencies

- **US1 (P1)**: Depends on Phases 1–2 only; the 9 module groups (T005–T063) are fully independent of each other
- **US2 (P2)**: Depends on T001 (package install) only for compilation; one-line change in `hono.ts`
- **US3 (P3)**: Depends on US1 being substantially complete to audit migrated routers

### Within US1: Recommended Module Order

Per `quickstart.md`, for sequential work:
`tenant` (T005) → `autenticacion` (T006) → `catalogo` (T007–T011) → `almacen` (T012–T016) → `ventas` (T017–T026) → `consultorio` (T027–T039) → `restaurante` (T040–T050) → `tienda` (T051–T052) → `social` (T053–T063)

Within each module, aggregator tasks (T007, T012, T017, T027, T040, T053) are constructor-only changes and can run in parallel with their group's router tasks.

### Parallel Opportunities

- T001, T002, T003 (Phase 1) — all independent files
- T007–T011 (catálogo) — 5 different files
- T012–T016 (almacén) — 5 different files
- T017–T026 (ventas) — 10 different files
- T027–T039 (consultorio) — 13 different files
- T040–T050 (restaurante) — T040 independent from T041–T050, those 10 are parallel
- T051–T052 (tienda) — 2 different files
- T053–T063 (social) — T053 independent from T054–T063, those 10 are parallel

---

## Parallel Example: US1 — Ventas Group

```
# After T017 (aggregator), launch all 9 in parallel:
Task T018: src/modules/ventas/adapters/cliente.rest.ts
Task T019: src/modules/ventas/adapters/proveedor.rest.ts
Task T020: src/modules/ventas/adapters/compra.rest.ts
Task T021: src/modules/ventas/adapters/punto-venta.rest.ts
Task T022: src/modules/ventas/adapters/turno-atencion.rest.ts
Task T023: src/modules/ventas/adapters/caja.rest.ts
Task T024: src/modules/ventas/adapters/gastos.rest.ts
Task T025: src/modules/ventas/adapters/pedido.rest.ts
Task T026: src/modules/ventas/adapters/venta.rest.ts
# All touch different files — safe to launch simultaneously
```

## Parallel Example: US1 — Consultorio Group

```
# T027 (aggregator) + T028-T039 (routers) all in parallel:
Task T027: consultorio-router.ts           # aggregator, constructor-only
Task T028: consultorio.rest.ts
Task T029: medico.rest.ts
Task T030: paciente.rest.ts
Task T031: cita.rest.ts
Task T032: historia-clinica.rest.ts
Task T033: atencion-medica.rest.ts
Task T034: receta-medica.rest.ts
Task T035: servicio-medico.rest.ts
Task T036: vacunacion.rest.ts
Task T037: consultorio-publica.rest.ts
Task T038: consultorio-consumer-citas.rest.ts
Task T039: consultorio-staff-publico.rest.ts
# All 13 touch different files
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004)
3. Complete Phase 3: US1 — starting with T005 (Tenant), then by module group
4. **STOP and VALIDATE**: Run `npm run test:integration` — T004 must pass
5. Confirm `GET /api/openapi.json` returns >100 paths

### Incremental Delivery

1. Setup + Foundational (4 tasks) → Foundation ready
2. US1 migration (59 tasks) → >100 paths in spec — **MVP deliverable**
3. US2 (1 task) → Swagger UI at `/api/docs`
4. US3 (1 task) → Schema quality audit
5. Polish (2 tasks) → TypeScript clean, all tests green

### Parallel Team Strategy

With multiple developers after Phases 1–2:

- **Dev A**: Tenant + Autenticación + Catálogo (T005–T011)
- **Dev B**: Almacén + Ventas (T012–T026)
- **Dev C**: Consultorio + Tienda (T027–T039, T051–T052)
- **Dev D**: Restaurante + Social + US2 (T040–T063, T064)

Each dev runs `npx tsc --noEmit` after their group; all merge → T065 + T066–T067.

---

## Notes

- `[P]` tasks operate on different files — no merge conflicts
- Aggregator changes (T007, T012, T017, T027, T040, T053) are constructor-only: `new Hono` → `new OpenAPIHono`; never touch `.use()` or `.route()` calls
- `c.req.valid("json")` replaces `await c.req.json()` + `Schema.safeParse()` in migrated routers
- Public endpoints (no `requireAuth` guard) MUST NOT have `security: [{ bearerAuth: [] }]` per FR-004
- All `operationId` values follow `{módulo}_{verbo}_{recurso}` camelCase pattern per `data-model.md`
- Never modify handlers, use-cases, repositories, or domain logic — changes are routing-layer only per FR-009

## Estado verificado (2026-07-13)

- **US1 (T005–T063) confirmado**: los 54 `*.rest.ts` (53 del listado original + `wizard.rest.ts`, agregado luego del plan) y los 6 agregadores ya usan `OpenAPIHono<HonoEnv>`; `grep -c "new Hono<"` = 0 en todos.
- **T001–T004, T064, T066 confirmados** por inspección directa del código (`package.json`, `src/core/openapi-responses.ts`, `src/server/hono.ts`, `npx tsc --noEmit` sin errores).
- **T067 confirmado**: `npx vitest run tests/integration/openapi.test.ts` (el archivo real de T004, con nombre `.test.ts` en vez de `.spec.ts`) pasa: >100 paths, `operationId` únicos.
- **T065 sigue pendiente**: 46 archivos `*.rest.ts` todavía validan con `Schema.parse(await c.req.json())` en vez de `c.req.valid("json")`. No se tocó como parte de esta revisión — falta hacer el audit y la migración fila por fila.
