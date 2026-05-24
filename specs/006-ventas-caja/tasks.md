# Tasks: Sistema de Ventas y Caja

**Input**: Design documents from `specs/006-ventas-caja/`  
**Branch**: `006-ventas-caja`  
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅

**Note**: No new Prisma migrations. No `npx prisma migrate dev`. All schema models already exist in `50-ventas.prisma`.

---

## Phase 1: Setup

**Purpose**: No new project initialization needed — Feature 006 extends the existing `ventas` module from Feature 005. This phase sets up the shared cross-cutting foundational pieces.

- [X] T001 Extend `src/modules/ventas/domain/ventas.errors.ts` — add 8 new error classes: `CajaYaAbiertaError`, `CajaYaCerradaError`, `PuntoVentaInactivoError`, `TurnoInactivoError`, `VentaYaConfirmadaError`, `PedidoTerminalError`, `PuntoVentaNombreDuplicadoError`, `TurnoNombreDuplicadoError`
- [X] T002 Extend `src/modules/ventas/domain/ports/IVentasNotificador.ts` — add 4 new event methods: `ventaCreada`, `cajaAbierta`, `cajaCerrada`, `pedidoActualizado` with payload interfaces
- [X] T003 [P] Extend `src/modules/ventas/infrastructure/null-ventas.notificador.ts` — add no-op implementations for the 4 new events
- [X] T004 [P] Extend `src/modules/ventas/infrastructure/ventas.socket.notificador.ts` — add Socket.IO emit for `ventas:venta:creada`, `ventas:caja:abierta`, `ventas:caja:cerrada`, `ventas:pedido:actualizado`
- [X] T005 [P] Extend `tests/helpers/fake-ventas.notificador.ts` — add capture arrays and call methods for the 4 new events
- [X] T006 Extend `src/modules/ventas/adapters/ventas.schema.ts` — add Zod schemas for: `CrearPuntoVentaSchema`, `ActualizarPuntoVentaSchema`, `CrearTurnoAtencionSchema`, `ActualizarTurnoAtencionSchema`, `AbrirCajaSchema`, `CerrarCajaSchema`, `RegistrarIngresoCajaSchema`, `RegistrarEgresoCajaSchema`, `CrearVentaSchema` (with `detalleSchema` nested), `CrearPedidoSchema`, `ActualizarEstadoPedidoSchema`, `ConvertirPedidoEnVentaSchema`, `CrearGastoSchema`, `ActualizarGastoSchema`, `QueryParamsPuntoVentaSchema`, `QueryParamsTurnoSchema`, `QueryParamsCajaSchema`, `QueryParamsVentaSchema`, `QueryParamsPedidoSchema`, `QueryParamsGastosSchema`, `QueryParamsReporteSchema`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Domain ports and test fakes that multiple user stories depend on.

**⚠️ CRITICAL**: T001–T006 (Phase 1) must complete before any user story work begins.

- [X] T007 [P] Create `src/modules/ventas/domain/ports/IPuntoVentaRepository.ts` — declare `crear`, `actualizar`, `cambiarEstado`, `obtener`, `listar` method signatures with `PuntoVentaData` return type
- [X] T008 [P] Create `src/modules/ventas/domain/ports/ITurnoAtencionRepository.ts` — declare `crear`, `actualizar`, `cambiarEstado`, `obtener`, `listar` method signatures with `TurnoAtencionData` return type
- [X] T009 [P] Create `src/modules/ventas/domain/ports/ICajaRepository.ts` — declare `abrir`, `cerrar`, `registrarIngreso`, `registrarEgreso`, `obtener`, `listar` method signatures; include `CajaAbiertaData`, `IngresoCajaData`, `EgresoCajaData` types; `abrir` returns `CajaAbiertaData` or throws `CajaYaAbiertaError`
- [X] T010 [P] Create `src/modules/ventas/domain/ports/IVentaRepository.ts` — declare `crear`, `confirmar`, `obtener`, `listar` method signatures; `confirmar` returns `{ venta: VentaData; advertencias: string[] }` like ICompraRepository pattern
- [X] T011 [P] Create `src/modules/ventas/domain/ports/IPedidoRepository.ts` — declare `crear`, `actualizarEstado`, `convertirEnVenta`, `obtener`, `listar` method signatures with `PedidoData` return type
- [X] T012 [P] Create `src/modules/ventas/domain/ports/IGastosRepository.ts` — declare `crear`, `actualizar`, `eliminar`, `listar` method signatures with `GastoData` return type
- [X] T013 [P] Create `src/modules/ventas/domain/ports/IReporteRepository.ts` — declare `getConsolidado(tenantId, filters)` returning `{ data: ReporteIngresoDTO[]; total: number }`; define `ReporteIngresoDTO` interface with fields: `id`, `fecha`, `monto`, `tipoPago`, `estado`, `fuente: "VENTA" | "CONSULTORIO"`, `clienteNombre`, `puntoVentaId`

**Checkpoint**: All 13 ports and foundational files ready — user story implementation can begin

---

## Phase 3: User Story 1 — Configuración de Puntos de Venta y Turnos (Priority: P1) 🎯 MVP

**Goal**: Admin can create, edit, activate/deactivate puntos de venta and turnos de atención. Both appear in filterable/paginatable lists.

**Independent Test**: Create a punto de venta "Caja Principal", create turno "Mañana", verify both appear in lists with estado=ACTIVO.

### Implementation

- [X] T014 [P] [US1] Create `src/modules/ventas/application/puntoVenta/crear-punto-venta.usecase.ts` — checks `nombre` uniqueness (throws `PuntoVentaNombreDuplicadoError`), calls `repo.crear()`, returns created data
- [X] T015 [P] [US1] Create `src/modules/ventas/application/puntoVenta/actualizar-punto-venta.usecase.ts` — checks `nombre` uniqueness on update (excluding self), calls `repo.actualizar()`
- [X] T016 [P] [US1] Create `src/modules/ventas/application/puntoVenta/cambiar-estado-punto-venta.usecase.ts` — toggles ACTIVO/INACTIVO
- [X] T017 [P] [US1] Create `src/modules/ventas/application/puntoVenta/listar-puntos-venta.usecase.ts` — delegates to `repo.listar()` with paginated result
- [X] T018 [P] [US1] Create `src/modules/ventas/application/turnoAtencion/crear-turno-atencion.usecase.ts` — checks `turno` uniqueness (throws `TurnoNombreDuplicadoError`)
- [X] T019 [P] [US1] Create `src/modules/ventas/application/turnoAtencion/actualizar-turno-atencion.usecase.ts`
- [X] T020 [P] [US1] Create `src/modules/ventas/application/turnoAtencion/cambiar-estado-turno-atencion.usecase.ts`
- [X] T021 [P] [US1] Create `src/modules/ventas/application/turnoAtencion/listar-turnos-atencion.usecase.ts`
- [X] T022 [P] [US1] Create `src/modules/ventas/infrastructure/punto-venta.prisma.repository.ts` — implements `IPuntoVentaRepository`; `listar` uses `makeQueryParamsSchema` + `toPrismaArgs` + `paginate`; unique checks done at DB via Prisma error code P2002 → `PuntoVentaNombreDuplicadoError`
- [X] T023 [P] [US1] Create `src/modules/ventas/infrastructure/turno-atencion.prisma.repository.ts` — implements `ITurnoAtencionRepository`; same pattern as punto-venta
- [X] T024 [P] [US1] Create `src/modules/ventas/adapters/punto-venta.rest.ts` — 4 endpoints: `GET /`, `POST /`, `PATCH /:id`, `PATCH /:id/estado`; uses `CrearPuntoVentaSchema`, `ActualizarPuntoVentaSchema`, `CambiarEstadoSchema`; `requireRol(["PROPIETARIO","ADMIN"])` on write endpoints; inline try/catch error mapping (no generic helper)
- [X] T025 [P] [US1] Create `src/modules/ventas/adapters/turno-atencion.rest.ts` — 4 endpoints: `GET /`, `POST /`, `PATCH /:id`, `PATCH /:id/estado`; same pattern as punto-venta.rest.ts
- [X] T026 [US1] Update `src/modules/ventas/adapters/ventas-router.ts` — mount `puntoVentaRouter` at `/puntos-venta` and `turnoAtencionRouter` at `/turnos-atencion`

**Checkpoint**: US1 complete — punto de venta and turno CRUD + lists working

---

## Phase 4: User Story 2 — Apertura y Cierre de Caja (Priority: P2)

**Goal**: Member can open a caja, register ingresos/egresos, close with arqueo showing correct expected-vs-counted difference.

**Independent Test**: Open caja with $500, register $200 ingreso, $50 egreso, close with $680 arqueo. Verify diferencia = 680 - (500 + 200 - 50) = 30.

### Unit Tests

- [X] T027 Create `tests/helpers/fake-caja.repository.ts` — in-memory implementation of `ICajaRepository`; supports `abrir`, `cerrar`, `registrarIngreso`, `registrarEgreso`, `obtener`, `listar`
- [X] T028 Create `tests/unit/abrir-caja.usecase.test.ts` — 3 tests: (1) abre caja y emite `cajaAbierta`; (2) lanza `CajaYaAbiertaError` si ya existe apertura activa en mismo punto/turno/miembro/fecha; (3) lanza `PuntoVentaInactivoError` si punto de venta INACTIVO
- [X] T029 Create `tests/unit/cerrar-caja.usecase.test.ts` — 3 tests: (1) cierra caja con estado CERRADA; (2) emite `cajaCerrada`; (3) lanza `CajaYaCerradaError` si ya cerrada

### Implementation

- [X] T030 [P] [US2] Create `src/modules/ventas/application/caja/abrir-caja.usecase.ts` — verifies punto de venta ACTIVO, verifies turno ACTIVO, calls `repo.abrir()` (pre-check for duplicate), emits `cajaAbierta`; creates first `IngresosCaja` entry with `motivo="Apertura"` and `monto=montoInicial` atomically
- [X] T031 [P] [US2] Create `src/modules/ventas/application/caja/cerrar-caja.usecase.ts` — fetches caja, verifies APERTURADA (throws `CajaYaCerradaError` if not), calls `repo.cerrar(id, montoArqueoCaja)`, emits `cajaCerrada`
- [X] T032 [P] [US2] Create `src/modules/ventas/application/caja/registrar-ingreso-caja.usecase.ts` — verifies caja APERTURADA (throws `CajaYaCerradaError`), calls `repo.registrarIngreso()`; `repo` increments `caja.montoIngresos` atomically
- [X] T033 [P] [US2] Create `src/modules/ventas/application/caja/registrar-egreso-caja.usecase.ts` — same pattern as ingreso but for egresos
- [X] T034 [P] [US2] Create `src/modules/ventas/application/caja/obtener-caja.usecase.ts` — fetches caja by id with ingresos, egresos; throws 404 if not found
- [X] T035 [P] [US2] Create `src/modules/ventas/application/caja/listar-cajas.usecase.ts` — delegates to `repo.listar()` with paginated result
- [X] T036 [US2] Create `src/modules/ventas/infrastructure/caja.prisma.repository.ts` — implements `ICajaRepository`; `abrir`: `findFirst` duplicate check + `$transaction` (create AperturaCierreDeCaja + create IngresosCaja with motivo="Apertura"); `cerrar`: `$transaction` (update estadoCaja=CERRADA + set montoArqueoCaja); `registrarIngreso`: `$transaction` (create IngresosCaja + increment `caja.montoIngresos`); `registrarEgreso`: same for egresos; `listar`: `makeQueryParamsSchema` + `toPrismaArgs` + `paginate`
- [X] T037 [US2] Create `src/modules/ventas/adapters/caja.rest.ts` — 6 endpoints per contract: `GET /`, `GET /:id`, `POST /abrir`, `POST /:id/cerrar`, `POST /:id/ingresos`, `POST /:id/egresos`; inline error mapping; `requireRol` NOT required on these (any member can use caja)
- [X] T038 [US2] Update `src/modules/ventas/adapters/ventas-router.ts` — mount `cajaRouter` at `/cajas`

**Checkpoint**: US2 complete — caja lifecycle (abrir, ingresos/egresos, cerrar) working

---

## Phase 5: User Story 3 — Registro y Confirmación de Ventas (Priority: P3)

**Goal**: Member registers a venta in an open caja with products (registered or occasional client), confirms it, and stock decrements automatically.

**Independent Test**: Member with open caja registers venta with 2 products, confirms it, and both product variant stocks decrease by sold quantity.

### Unit Tests

- [X] T039 Create `tests/helpers/fake-venta.repository.ts` — in-memory implementation of `IVentaRepository`; supports `crear`, `confirmar`, `obtener`, `listar`; `confirmar` returns `{ venta, advertencias: [] }`
- [X] T040 Create `tests/unit/confirmar-venta.usecase.test.ts` — 3 tests: (1) confirma venta y retorna `advertencias`; (2) emite `ventaCreada` con tenantId y ventaId; (3) lanza `VentaYaConfirmadaError` si venta ya confirmada

### Implementation

- [X] T041 [P] [US3] Create `src/modules/ventas/application/venta/crear-venta.usecase.ts` — verifies caja APERTURADA (throws error if not), calls `repo.crear()`, emits `ventaCreada`; calculates `totalCantidad`, `totalVenta`, `totalDescuento`, `diferencia` at application layer before persisting
- [X] T042 [P] [US3] Create `src/modules/ventas/application/venta/confirmar-venta.usecase.ts` — fetches venta, verifies not already confirmed (`VentaYaConfirmadaError`), calls `repo.confirmar()`, emits nothing extra (ventaCreada is emitted at create time)
- [X] T043 [P] [US3] Create `src/modules/ventas/application/venta/obtener-venta.usecase.ts` — fetches venta by id with detalle; throws 404 if not found
- [X] T044 [P] [US3] Create `src/modules/ventas/application/venta/listar-ventas.usecase.ts` — delegates to `repo.listar()` with paginated result
- [X] T045 [US3] Create `src/modules/ventas/infrastructure/venta.prisma.repository.ts` — implements `IVentaRepository`; `crear`: creates `Venta` + `VentaDetalle[]` in transaction; `confirmar`: `$transaction` — for each VentaDetalle: (a) if `variante.inventarioActivado`: decrement `ProductoVariante.cantidadStock` + create `MovimientoInventario(SALIDA)`; (b) query `ProductoInsumo` for product: for each insumo, decrement `Insumo.cantidadStock` by `(detalle.cantidad × insumo.cantidad)` + create `MovimientoAlmacen(SALIDA)`; (c) if `tipoPago=EFECTIVO`: increment `AperturaCierreDeCaja.montoVentas`; collects `advertencias` for variants/insumos skipped; `listar`: filterables `fecha`, `estadoPago`, `tipoPago`, `puntoVentaId`, `turnoId`, `clienteId`
- [X] T046 [US3] Create `src/modules/ventas/adapters/venta.rest.ts` — 4 endpoints: `GET /`, `GET /:id`, `POST /` (create venta), `POST /:id/confirmar`; inline error mapping; `requireRol` NOT required (any member can create venta)
- [X] T047 [US3] Update `src/modules/ventas/adapters/ventas-router.ts` — mount `ventaRouter` at `/ventas`

**Checkpoint**: US3 complete — venta creation + confirmation with stock decrement working

---

## Phase 6: User Story 4 — Gestión de Pedidos en Línea (Priority: P4)

**Goal**: Customer creates pedidos from public portal; staff changes estado; staff converts pedido to venta.

**Independent Test**: Create pedido with 2 products (estado=PENDIENTE), change to ELABORADO, convert to venta — venta created with referenciaTipo=PEDIDO and pedido estado → FINALIZADO.

### Unit Tests

- [X] T048 Create `tests/helpers/fake-pedido.repository.ts` — in-memory implementation of `IPedidoRepository`; supports all 5 methods; `actualizarEstado` enforces state machine transitions; `convertirEnVenta` creates a fake VentaData
- [X] T049 Create `tests/unit/convertir-pedido-en-venta.usecase.test.ts` — 3 tests: (1) crea venta con `referenciaTipo=PEDIDO` y pedido → FINALIZADO; (2) lanza `PedidoTerminalError` si pedido ya FINALIZADO o RECHAZADO; (3) emite `pedidoActualizado` con nuevo estado FINALIZADO

### Implementation

- [X] T050 [P] [US4] Create `src/modules/ventas/application/pedido/crear-pedido.usecase.ts` — creates pedido with estado=PENDIENTE (PENDIENTE from Estado enum), calculates `totalCantidad` and `totalPedido`; emits `pedidoActualizado`
- [X] T051 [P] [US4] Create `src/modules/ventas/application/pedido/actualizar-estado-pedido.usecase.ts` — validates transition using `TRANSICIONES_PEDIDO` constant (`PENDIENTE→[ELABORADO,RECHAZADO]`, `ELABORADO→[FINALIZADO,RECHAZADO]`, terminal=[FINALIZADO,RECHAZADO]`); throws `PedidoTerminalError` on invalid; calls `repo.actualizarEstado()`; emits `pedidoActualizado`
- [X] T052 [P] [US4] Create `src/modules/ventas/application/pedido/convertir-pedido-en-venta.usecase.ts` — verifies pedido not terminal; calls `repo.convertirEnVenta()` which creates a `Venta` (referenciaTipo=PEDIDO, referenciaId=pedido.id) from pedido detalle; updates pedido estado → FINALIZADO; emits `pedidoActualizado`
- [X] T053 [P] [US4] Create `src/modules/ventas/application/pedido/obtener-pedido.usecase.ts`
- [X] T054 [P] [US4] Create `src/modules/ventas/application/pedido/listar-pedidos.usecase.ts`
- [X] T055 [US4] Create `src/modules/ventas/infrastructure/pedido.prisma.repository.ts` — implements `IPedidoRepository`; `crear`: creates `Pedido` + `PedidoDetalle[]`; `actualizarEstado`: update `Pedido.estado` (PENDIENTE→ELABORADO maps to Estado.ELABORADO, etc.); `convertirEnVenta`: `$transaction` creates `Venta` + `VentaDetalle[]` from pedido + `VentaDetalle` copies + updates pedido estado; `listar`: filterables `estado`, `fecha`, `userId`
- [X] T056 [US4] Create `src/modules/ventas/adapters/pedido.rest.ts` — 5 endpoints: `GET /`, `GET /:id`, `POST /`, `PATCH /:id/estado`, `POST /:id/convertir-en-venta`; `requireRol` on `PATCH` and `POST convertir` (staff only); `POST /pedidos` is public (any authenticated user)
- [X] T057 [US4] Update `src/modules/ventas/adapters/ventas-router.ts` — mount `pedidoRouter` at `/pedidos`

**Checkpoint**: US4 complete — pedidos CRUD, state machine, and conversion to venta working

---

## Phase 7: User Story 5 — Registro de Gastos (Priority: P5)

**Goal**: Admin registers operational expenses (alquiler, servicios, insumos) visible in financial reports.

**Independent Test**: Create gasto $1500 "Alquiler mensual", verify in gastos list for that month.

### Implementation

- [X] T058 [P] [US5] Create `src/modules/ventas/application/gastos/crear-gasto.usecase.ts` — validates `totalGasto > 0`, calls `repo.crear()`, returns created gasto
- [X] T059 [P] [US5] Create `src/modules/ventas/application/gastos/actualizar-gasto.usecase.ts` — fetches gasto, validates not ELIMINADO, calls `repo.actualizar()`
- [X] T060 [P] [US5] Create `src/modules/ventas/application/gastos/eliminar-gasto.usecase.ts` — soft-deletes by changing `estado → ELIMINADO`
- [X] T061 [P] [US5] Create `src/modules/ventas/application/gastos/listar-gastos.usecase.ts` — delegates to `repo.listar()` with paginated result; filters out ELIMINADO by default unless explicitly requested
- [X] T062 [US5] Create `src/modules/ventas/infrastructure/gastos.prisma.repository.ts` — implements `IGastosRepository`; `listar`: filterables `fecha`, `estado`, `createdAt`; soft-delete sets `estado=ELIMINADO`
- [X] T063 [US5] Create `src/modules/ventas/adapters/gastos.rest.ts` — 4 endpoints: `GET /`, `POST /`, `PATCH /:id`, `DELETE /:id`; all write endpoints require `requireRol(["PROPIETARIO","ADMIN"])`
- [X] T064 [US5] Update `src/modules/ventas/adapters/ventas-router.ts` — mount `gastosRouter` at `/gastos`

**Checkpoint**: US5 complete — gastos CRUD + list working

---

## Phase 8: User Story 6 — Reportes Consolidados de Ventas (Priority: P6)

**Goal**: Admin views unified income report across all tenant verticals (ventas + consultorio cobros).

**Independent Test**: With ventas and consultorio atenciones in the DB for the same tenant, the consolidated report returns records from both with correct `fuente` field.

### Implementation

- [X] T065 [P] [US6] Create `src/modules/ventas/application/reporte/reporte-consolidado.usecase.ts` — calls `repo.getConsolidado(tenantId, filters)`, paginates the merged result (if repo returns already merged), returns `{ data: ReporteIngresoDTO[]; meta }`
- [X] T066 [US6] Create `src/modules/ventas/infrastructure/reporte.prisma.repository.ts` — implements `IReporteRepository`; parallel queries: (1) `prisma.venta.findMany({ where: { tenantId, fecha: { gte, lte }, ...filters } })` → map to `ReporteIngresoDTO(fuente="VENTA")`; (2) if `tenant.esConsultorio`: `prisma.atencionMedica.findMany({ where: { consultorioId: ..., fechaAtencion: { gte, lte } }, include: { pagos: true } })` → map to `ReporteIngresoDTO(fuente="CONSULTORIO")`; merge + sort by `fecha` desc; count total; paginate
- [X] T067 [US6] Add `GET /reporte-consolidado` endpoint to `src/modules/ventas/adapters/venta.rest.ts` — requires `requireRol(["PROPIETARIO","ADMIN"])`; uses `QueryParamsReporteSchema`; calls `ReporteConsolidadoUseCase`
- [X] T068 [US6] Update `src/modules/ventas/adapters/ventas-router.ts` — ensure `ReporteRepository` and `ReporteConsolidadoUseCase` are wired in the venta router scope

**Checkpoint**: US6 complete — consolidated report with cross-vertical data working

---

## Phase 9: User Story 7 — Notificaciones en Tiempo Real (Priority: P7)

**Goal**: All tenant members receive real-time events for ventas, cajas, and pedidos.

**Note**: US7 is implemented implicitly via the notificador port extended in Phase 1 (T002–T005). The events are emitted from the use cases in US2 (caja), US3 (venta), and US4 (pedido). This phase verifies the wiring is complete.

### Implementation

- [X] T069 [US7] Verify `src/modules/ventas/infrastructure/ventas.socket.notificador.ts` emits all 4 new events to `tenant:${tenantId}` room: `ventas:venta:creada`, `ventas:caja:abierta`, `ventas:caja:cerrada`, `ventas:pedido:actualizado`
- [X] T070 [US7] Verify `src/server/index.ts` — confirm `ventasNotificador` is already wired (from Feature 005); no changes expected since the notificador provider is a singleton that all new use cases will receive via the provider

**Checkpoint**: US7 complete — all events flow through Socket.IO to tenant room

---

## Phase 10: Polish & Cross-Cutting Concerns

- [X] T071 Final review of `src/modules/ventas/adapters/ventas-router.ts` — confirm all 8 sub-routers are mounted: `/clientes`, `/proveedores`, `/compras`, `/puntos-venta`, `/turnos-atencion`, `/cajas`, `/ventas`, `/pedidos`, `/gastos`
- [X] T072 Run TypeScript type check (`npx tsc --noEmit`) — fix any type errors introduced by the new code
- [X] T073 Run Vitest tests (`npx vitest run`) — verify all unit tests pass (including new T028, T029, T040, T048, T049)
- [ ] T074 Manual QA — deferred; requires running server (`npm run dev`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** (Setup T001–T006): No external dependencies — start immediately
- **Phase 2** (Foundational T007–T013): Depends on T001–T006 (ports reference error classes and notificador)
- **Phase 3** (US1 T014–T026): Depends on Phase 2
- **Phase 4** (US2 T027–T038): Depends on Phase 3 (caja needs puntoVentaId + turnoId; ports for ICajaRepository)
- **Phase 5** (US3 T039–T047): Depends on Phase 4 (venta needs `aperturaCierreCajaId`)
- **Phase 6** (US4 T048–T057): Depends on Phase 2 (independent of US1–US3 at domain level; uses IVentaRepository in convertirEnVenta)
- **Phase 7** (US5 T058–T064): Depends on Phase 2 only — fully independent
- **Phase 8** (US6 T065–T068): Depends on Phase 5 (queries Venta table)
- **Phase 9** (US7 T069–T070): Depends on Phases 4, 5, 6
- **Phase 10** (Polish T071–T074): Depends on all previous phases

### User Story Dependencies

- **US1 (P1)**: After Phase 2 — no story dependencies
- **US2 (P2)**: After US1 — uses puntoVentaId + turnoId from US1 entities
- **US3 (P3)**: After US2 — venta must be linked to open caja
- **US4 (P4)**: After Phase 2 — independent; convertirEnVenta creates Venta (cross-US3 at repo level)
- **US5 (P5)**: After Phase 2 — fully independent
- **US6 (P6)**: After US3 — queries Venta model
- **US7 (P7)**: Cross-cutting — built into use cases of US2, US3, US4

### Within Each User Story

- Port (interface) → Use cases → Repository implementation → REST adapter → Router mount
- Parallel tasks [P] within the same phase can run simultaneously

### Parallel Opportunities

All [P] tasks within Phase 1: T003, T004, T005 (after T002)  
All [P] tasks within Phase 2: T007–T013 (after Phase 1)  
All use case [P] tasks within US1: T014–T021 (after T007+T008)  
All infrastructure [P] tasks within US1: T022–T023 (after T007+T008)  
All adapter [P] tasks within US1: T024–T025 (after T014–T021)  
All use case [P] tasks within US2: T030–T035 (after T027)  
All use case [P] tasks within US3: T041–T044 (after T039)  
All use case [P] tasks within US4: T050–T054 (after T048)  
All use case [P] tasks within US5: T058–T061 (after Phase 2)  
US5, US4 (Phase 7, 6) can run in parallel with US2 (Phase 4)  

---

## Parallel Example: User Story 1

```bash
# After T007+T008 (ports ready), launch all use cases in parallel:
T014: crear-punto-venta.usecase.ts
T015: actualizar-punto-venta.usecase.ts
T016: cambiar-estado-punto-venta.usecase.ts
T017: listar-puntos-venta.usecase.ts
T018: crear-turno-atencion.usecase.ts
T019: actualizar-turno-atencion.usecase.ts
T020: cambiar-estado-turno-atencion.usecase.ts
T021: listar-turnos-atencion.usecase.ts

# Then in parallel:
T022: punto-venta.prisma.repository.ts
T023: turno-atencion.prisma.repository.ts

# Then in parallel:
T024: punto-venta.rest.ts
T025: turno-atencion.rest.ts

# Finally:
T026: ventas-router.ts mount
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Complete Phase 1 (T001–T006)
2. Complete Phase 2 (T007–T013)
3. Complete Phase 3/US1 (T014–T026)
4. **STOP and VALIDATE**: Puntos de venta and turnos CRUD functional

### Incremental Delivery

1. Phase 1+2 → Foundation ready
2. US1 → Config ready (puntos venta + turnos)
3. US2 → Caja lifecycle ready
4. US3 → Sales flow ready (MVP for retail!)
5. US4 → Online orders ready
6. US5 → Expenses tracking ready
7. US6 → Consolidated reporting ready
8. US7 → Real-time events verified end-to-end

---

## Notes

- `[P]` tasks = different files, no unresolved dependencies
- `[USn]` label = which user story drives this task
- **No `npx prisma migrate dev`** — schema models already exist; migrations are deferred
- Pedido estado mapping: PENDIENTE=PENDIENTE, EN_PROCESO=ELABORADO, COMPLETADO=FINALIZADO, CANCELADO=RECHAZADO (existing `Estado` enum values)
- All write endpoints follow pattern: `validate → call use case → format response`
- Stock decrement in `venta.prisma.repository.ts` mirrors `compra.prisma.repository.ts` confirmar() from Feature 005
- `montoInicial` of caja is stored as first `IngresosCaja(motivo="Apertura")` created atomically in `abrir-caja` transaction
