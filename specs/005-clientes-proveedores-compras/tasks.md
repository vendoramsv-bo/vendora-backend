# Tasks: Gestión de Clientes, Proveedores y Compras

**Input**: Design documents from `specs/005-clientes-proveedores-compras/`
**Prerequisites**: plan.md ✓, spec.md ✓, data-model.md ✓, research.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: Unit tests included per plan.md (Vitest + fake in-memory repositories for use cases).

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US5)
- All paths are relative to repository root

---

## Phase 1: Setup (Schema + Module Skeleton)

**Purpose**: One-time infrastructure changes and directory structure required before any user story work.

- [X] T001 Add `CONFIRMADA` value to `Estado` enum in `prisma/20-compartido.prisma`
- [X] T002 Create directory skeleton for `src/modules/ventas/` (domain/ports, application/cliente, application/proveedor, application/compra, infrastructure, adapters)
- [X] T003 Create Zod request/response schemas in `src/modules/ventas/adapters/ventas.schema.ts` (schemas for cliente, proveedor, compra, detalles, costos, query params)

---

## Phase 2: Foundational (Domain Ports + Test Helpers)

**Purpose**: Domain contracts and test infrastructure that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 [P] Create domain errors in `src/modules/ventas/domain/ventas.errors.ts` — 12 error classes: `ClienteNoEncontradoError`, `ClienteNombreDuplicadoError`, `ClienteEmailDuplicadoError`, `ProveedorNoEncontradoError`, `ProveedorNombreDuplicadoError`, `ProveedorNITDuplicadoError`, `ProveedorEnUsoError`, `CompraNoEncontradaError`, `CompraYaConfirmadaError`, `DetalleVacioError`, `CostoMotivoYaExisteError`, `DetalleYaExisteError`
- [X] T005 [P] Create `IClienteRepository` port in `src/modules/ventas/domain/ports/IClienteRepository.ts` — methods: `crear`, `obtenerPorId`, `obtenerPorNombre`, `obtenerPorEmail`, `actualizar`, `cambiarEstado`, `listar`
- [X] T006 [P] Create `IProveedorRepository` port in `src/modules/ventas/domain/ports/IProveedorRepository.ts` — methods: `crear`, `obtenerPorId`, `obtenerPorNombre`, `obtenerPorNit`, `actualizar`, `cambiarEstado`, `eliminar`, `tieneCompras`, `listar`
- [X] T007 [P] Create `ICompraRepository` port in `src/modules/ventas/domain/ports/ICompraRepository.ts` — methods: `crear`, `obtenerPorId`, `actualizar`, `eliminar`, `confirmar`, `listar`, `agregarDetalle`, `actualizarDetalle`, `eliminarDetalle`, `agregarCosto`, `actualizarCosto`, `eliminarCosto`
- [X] T008 [P] Create `IVentasNotificador` port in `src/modules/ventas/domain/ports/IVentasNotificador.ts` — 7 events: `clienteCreado`, `clienteActualizado`, `proveedorCreado`, `proveedorActualizado`, `compraCreada`, `compraActualizada`, `compraConfirmada` with typed payloads
- [X] T009 Create `NullVentasNotificador` (no-op implementation) in `src/modules/ventas/infrastructure/null-ventas.notificador.ts`
- [X] T010 Create `ventas.notificador.provider.ts` (singleton getter/setter pattern) in `src/modules/ventas/infrastructure/ventas.notificador.provider.ts`
- [X] T011 [P] Create `FakeClienteRepository` (in-memory) in `tests/helpers/fake-cliente.repository.ts`
- [X] T012 [P] Create `FakeProveedorRepository` (in-memory) in `tests/helpers/fake-proveedor.repository.ts`
- [X] T013 [P] Create `FakeCompraRepository` (in-memory) in `tests/helpers/fake-compra.repository.ts`
- [X] T014 [P] Create `FakeVentasNotificador` (spy) in `tests/helpers/fake-ventas.notificador.ts`

**Checkpoint**: Domain ports + test helpers ready — user story implementation can begin

---

## Phase 3: User Story 1 — Gestión de Clientes (Priority: P1) 🎯 MVP

**Goal**: Full CRUD for clients within a tenant — create, read, update, change status, list with search/filter/pagination.

**Independent Test**: `POST /api/ventas/clientes` → 201 ACTIVO; duplicate email in same tenant → 409; `GET /api/ventas/clientes?search=María` → returns match; `PATCH /api/ventas/clientes/:id/estado` → 200 INACTIVO.

### Unit Tests for User Story 1

- [X] T015 [US1] Write unit tests for `CrearClienteUseCase` (duplicado nombre, duplicado email, creación exitosa, notificador llamado) in `tests/unit/crear-cliente.usecase.test.ts`

### Implementation for User Story 1

- [X] T016 [P] [US1] Implement `CrearClienteUseCase` in `src/modules/ventas/application/cliente/crear-cliente.usecase.ts` — validate unique nombre+email per tenant, persist, emit `clienteCreado`
- [X] T017 [P] [US1] Implement `ObtenerClienteUseCase` in `src/modules/ventas/application/cliente/obtener-cliente.usecase.ts` — throw `ClienteNoEncontradoError` if not found
- [X] T018 [P] [US1] Implement `ActualizarClienteUseCase` in `src/modules/ventas/application/cliente/actualizar-cliente.usecase.ts` — validate unique constraints on changed fields, emit `clienteActualizado`
- [X] T019 [P] [US1] Implement `CambiarEstadoClienteUseCase` in `src/modules/ventas/application/cliente/cambiar-estado-cliente.usecase.ts` — ACTIVO↔INACTIVO transitions
- [X] T020 [P] [US1] Implement `ListarClientesUseCase` in `src/modules/ventas/application/cliente/listar-clientes.usecase.ts` — `makeQueryParamsSchema(["nombre","email","estado"], ["nombre","createdAt"])` from `src/core/query-params.ts`
- [X] T021 [US1] Implement `ClientePrismaRepository` in `src/modules/ventas/infrastructure/cliente.prisma.repository.ts` — all `IClienteRepository` methods, all queries scoped to `tenantId`
- [X] T022 [US1] Implement cliente REST adapter in `src/modules/ventas/adapters/cliente.rest.ts` — 5 endpoints: `GET /clientes`, `POST /clientes`, `GET /clientes/:id`, `PATCH /clientes/:id`, `PATCH /clientes/:id/estado`; write routes require `requireRol(["PROPIETARIO","ADMIN"])`; map domain errors to HTTP codes

**Checkpoint**: `POST /api/ventas/clientes` and `GET /api/ventas/clientes` fully functional

---

## Phase 4: User Story 2 — Gestión de Proveedores (Priority: P2)

**Goal**: Full CRUD for suppliers — create, read, update, change status, delete (only if no purchases), list with search/filter/pagination.

**Independent Test**: `POST /api/ventas/proveedores` → 201; duplicate NIT → 409; `DELETE /api/ventas/proveedores/:id` (proveedor con compras) → 422 `ProveedorEnUsoError`.

### Unit Tests for User Story 2

- [X] T023 [US2] Write unit tests for `CrearProveedorUseCase` (duplicado nombre, duplicado NIT, creación exitosa) and `EliminarProveedorUseCase` (en uso → error, sin compras → ok) in `tests/unit/crear-proveedor.usecase.test.ts`

### Implementation for User Story 2

- [X] T024 [P] [US2] Implement `CrearProveedorUseCase` in `src/modules/ventas/application/proveedor/crear-proveedor.usecase.ts` — validate unique nombre+nit per tenant, persist, emit `proveedorCreado`
- [X] T025 [P] [US2] Implement `ObtenerProveedorUseCase` in `src/modules/ventas/application/proveedor/obtener-proveedor.usecase.ts`
- [X] T026 [P] [US2] Implement `ActualizarProveedorUseCase` in `src/modules/ventas/application/proveedor/actualizar-proveedor.usecase.ts` — validate unique constraints on changed fields, emit `proveedorActualizado`
- [X] T027 [P] [US2] Implement `CambiarEstadoProveedorUseCase` in `src/modules/ventas/application/proveedor/cambiar-estado-proveedor.usecase.ts`
- [X] T028 [P] [US2] Implement `EliminarProveedorUseCase` in `src/modules/ventas/application/proveedor/eliminar-proveedor.usecase.ts` — check `tieneCompras()` → throw `ProveedorEnUsoError` if true
- [X] T029 [P] [US2] Implement `ListarProveedoresUseCase` in `src/modules/ventas/application/proveedor/listar-proveedores.usecase.ts` — `makeQueryParamsSchema(["nombre","nit","estado"], ["nombre","createdAt"])`
- [X] T030 [US2] Implement `ProveedorPrismaRepository` in `src/modules/ventas/infrastructure/proveedor.prisma.repository.ts` — all `IProveedorRepository` methods, `tieneCompras` checks `compras.length > 0`
- [X] T031 [US2] Implement proveedor REST adapter in `src/modules/ventas/adapters/proveedor.rest.ts` — 6 endpoints: `GET /proveedores`, `POST /proveedores`, `GET /proveedores/:id`, `PATCH /proveedores/:id`, `PATCH /proveedores/:id/estado`, `DELETE /proveedores/:id`; map `ProveedorEnUsoError` → 422

**Checkpoint**: Proveedor CRUD fully functional and independently testable

---

## Phase 5: User Story 3 — Registro y Gestión de Compras (Priority: P3)

**Goal**: Create purchases in PENDIENTE state with detalles and costos adicionales; edit header, detalles, costos; delete PENDIENTE purchases.

**Independent Test**: `POST /api/ventas/compras` (detalles > 0) → 201 PENDIENTE; stock unchanged; `POST /api/ventas/compras/:id/detalles` → 201; `DELETE /api/ventas/compras/:id` → 204.

### Unit Tests for User Story 3

- [X] T032 [US3] Write unit tests for `CrearCompraUseCase` (detalle vacío → error, proveedor no encontrado → error, creación exitosa, notificador llamado) in `tests/unit/crear-compra.usecase.test.ts`

### Implementation for User Story 3

- [X] T033 [P] [US3] Implement `CrearCompraUseCase` in `src/modules/ventas/application/compra/crear-compra.usecase.ts` — validate proveedor exists, validate detalles not empty (`DetalleVacioError`), persist, emit `compraCreada`
- [X] T034 [P] [US3] Implement `ObtenerCompraUseCase` in `src/modules/ventas/application/compra/obtener-compra.usecase.ts` — include detalles and costos in response
- [X] T035 [P] [US3] Implement `ActualizarCompraUseCase` in `src/modules/ventas/application/compra/actualizar-compra.usecase.ts` — only PENDIENTE; throw `CompraYaConfirmadaError` if CONFIRMADA; emit `compraActualizada`
- [X] T036 [P] [US3] Implement `EliminarCompraUseCase` in `src/modules/ventas/application/compra/eliminar-compra.usecase.ts` — only PENDIENTE; throw `CompraYaConfirmadaError` if CONFIRMADA
- [X] T037 [P] [US3] Implement `ListarComprasUseCase` in `src/modules/ventas/application/compra/listar-compras.usecase.ts` — `makeQueryParamsSchema(["estado","proveedorId"], ["fecha","createdAt"])`
- [X] T038 [US3] Implement `CompraPrismaRepository` (partial — CRUD + detalles + costos, excluding `confirmar`) in `src/modules/ventas/infrastructure/compra.prisma.repository.ts` — recalculate `totalCantidad`, `totalCompra`, `totalCostoAdicional` on every detalle/costo mutation; enforce `@@unique([compraId, productoId, varianteId])` → `DetalleYaExisteError`; enforce `@@unique([compraId, motivo])` → `CostoMotivoYaExisteError`
- [X] T039 [US3] Implement compra REST adapter (CRUD + detalles + costos, excluding confirmar) in `src/modules/ventas/adapters/compra.rest.ts` — endpoints: `GET /compras`, `POST /compras`, `GET /compras/:id`, `PATCH /compras/:id`, `DELETE /compras/:id`, `POST /compras/:id/detalles`, `PATCH /compras/:id/detalles/:detalleId`, `DELETE /compras/:id/detalles/:detalleId`, `POST /compras/:id/costos`, `PATCH /compras/:id/costos/:costoId`, `DELETE /compras/:id/costos/:costoId`

**Checkpoint**: Compra CRUD + detalles + costos fully functional in PENDIENTE state

---

## Phase 6: User Story 4 — Confirmación de Compra (Priority: P4)

**Goal**: Confirm a PENDIENTE purchase — atomically update stock for all detalle lines with `inventarioActivado=true` and set estado to CONFIRMADA.

**Independent Test**: Confirm compra → stock increments by `cantidad`; confirm again → 422 `CompraYaConfirmadaError`; detalle with `inventarioActivado=false` → `advertencias[]` returned, rest of lines updated.

### Unit Tests for User Story 4

- [X] T040 [US4] Write unit tests for `ConfirmarCompraUseCase` (ya confirmada → error, confirmación exitosa + notificador llamado, variante sin inventario → advertencia) in `tests/unit/confirmar-compra.usecase.test.ts`

### Implementation for User Story 4

- [X] T041 [US4] Implement `ConfirmarCompraUseCase` in `src/modules/ventas/application/compra/confirmar-compra.usecase.ts` — call `ICompraRepository.confirmar()`, emit `compraConfirmada` via `IVentasNotificador`, return `{ compra, advertencias }`
- [X] T042 [US4] Add `confirmar()` method to `CompraPrismaRepository` in `src/modules/ventas/infrastructure/compra.prisma.repository.ts` — single `$transaction`: (1) fetch compra, (2) guard `CompraNoEncontradaError` + `CompraYaConfirmadaError`, (3) for each detalle with `varianteId` + `inventarioActivado=true`: increment `ProductoVariante.cantidadStock` + create `MovimientoInventario { tipo: ENTRADA }`, (4) update `Compra.estado = CONFIRMADA`, (5) return `{ compra, advertencias }`
- [X] T043 [US4] Add `POST /compras/:id/confirmar` endpoint to `src/modules/ventas/adapters/compra.rest.ts` — requires `requireRol(["PROPIETARIO","ADMIN"])`; response: `{ compra, advertencias }` with 200

**Checkpoint**: Full purchase lifecycle functional — PENDIENTE → CONFIRMADA with atomic stock update

---

## Phase 7: User Story 5 — Notificaciones en Tiempo Real (Priority: P5) + Server Wiring

**Goal**: All write operations emit Socket.IO events to the tenant room; wire the ventas module into the server.

**Independent Test**: Two clients connected to tenant room; create proveedor → both receive `ventas:proveedor:creado`; confirm compra → both receive `ventas:compra:confirmada`.

### Implementation for User Story 5

- [X] T044 [US5] Implement `VentasSocketNotificador` in `src/modules/ventas/infrastructure/ventas.socket.notificador.ts` — emit 7 events to tenant room: `ventas:cliente:creado`, `ventas:cliente:actualizado`, `ventas:proveedor:creado`, `ventas:proveedor:actualizado`, `ventas:compra:creada`, `ventas:compra:actualizada`, `ventas:compra:confirmada`
- [X] T045 [US5] Create `ventas-router.ts` assembling clientes, proveedores, compras sub-routers into a single Hono app in `src/modules/ventas/adapters/ventas-router.ts`
- [X] T046 [US5] Mount `ventasApp` at `/api/ventas` in `src/server/hono.ts` — `app.route("/api/ventas", ventasApp)`
- [X] T047 [US5] Register `VentasSocketNotificador` and call `setVentasNotificador()` in `src/server/index.ts` — follow same pattern as `AlmacenSocketNotificador`

**Checkpoint**: All 5 user stories fully wired and operational

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Validation, type checking, and manual verification

- [X] T048 Run `npx tsc --noEmit` and fix all TypeScript errors across the ventas module
- [X] T049 Run `npx vitest run tests/unit/` and verify all 4 new test files pass (crear-cliente, crear-proveedor, crear-compra, confirmar-compra)
- [ ] T050 Manual trace of `quickstart.md` Escenarios 1–7 against running server (deferred — requires DB migration and running server)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (T001–T003) — BLOCKS all user stories
- **Phase 3–7 (User Stories)**: All depend on Phase 2 completion; can be done sequentially P1→P2→P3→P4→P5
- **Phase 8 (Polish)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1) Clientes**: Can start immediately after Phase 2 — no dependencies on other stories
- **US2 (P2) Proveedores**: Can start after Phase 2 — independent of US1
- **US3 (P3) Compras CRUD**: Depends on US2 (Proveedor must exist to validate `proveedorId`)
- **US4 (P4) Confirmar**: Depends on US3 (CompraRepository.confirmar extends US3 repository)
- **US5 (P5) Notificaciones + Wiring**: Depends on US1–US4 (needs all adapters before assembling router)

### Within Each User Story

- Unit tests written before use case implementation (TDD)
- Use cases (T016–T020, etc.) written before the Prisma repository
- Prisma repository before the REST adapter
- All use cases within a story marked [P] can run in parallel (different files)

---

## Parallel Opportunities per Story

```
# Phase 2 — run all in parallel:
T004 ventas.errors.ts
T005 IClienteRepository.ts
T006 IProveedorRepository.ts
T007 ICompraRepository.ts
T008 IVentasNotificador.ts
T011 fake-cliente.repository.ts
T012 fake-proveedor.repository.ts
T013 fake-compra.repository.ts
T014 fake-ventas.notificador.ts

# US1 use cases — run in parallel after T015 (test):
T016 crear-cliente.usecase.ts
T017 obtener-cliente.usecase.ts
T018 actualizar-cliente.usecase.ts
T019 cambiar-estado-cliente.usecase.ts
T020 listar-clientes.usecase.ts

# US2 use cases — run in parallel after T023 (test):
T024 crear-proveedor.usecase.ts
T025 obtener-proveedor.usecase.ts
T026 actualizar-proveedor.usecase.ts
T027 cambiar-estado-proveedor.usecase.ts
T028 eliminar-proveedor.usecase.ts
T029 listar-proveedores.usecase.ts

# US3 use cases — run in parallel after T032 (test):
T033 crear-compra.usecase.ts
T034 obtener-compra.usecase.ts
T035 actualizar-compra.usecase.ts
T036 eliminar-compra.usecase.ts
T037 listar-compras.usecase.ts
```

---

## Implementation Strategy

### MVP First (US1 — Clientes only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004–T014) — CRITICAL
3. Complete Phase 3: US1 Clientes (T015–T022)
4. **STOP and VALIDATE**: Test cliente endpoints independently
5. Proceed to US2 when ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 Clientes → independently testable MVP
3. US2 Proveedores → independently testable
4. US3 Compras CRUD → depends on Proveedor
5. US4 Confirmar → extends Compra
6. US5 Wiring + Notifications → all adapters assembled and served

---

## Notes

- **No DB migration yet**: `npx prisma migrate dev` is deferred until PostgreSQL credentials are ready (constraint from Feature 004)
- **CONFIRMADA enum**: Add to `prisma/20-compartido.prisma` in T001 but do not run migration
- **Cross-module stock update**: `confirmar()` in `ComprasPrismaRepository` directly accesses `almacen` schema tables via Prisma — no runtime port coupling
- **requireRol pattern**: Write endpoints require `requireRol(["PROPIETARIO","ADMIN"])`; read endpoints require no role (any tenant member)
- **T050**: Deferred manual QA — requires running server + migrated DB
- [P] tasks = different files, no blocking dependencies
- [Story] label maps each task to its user story for independent traceability
