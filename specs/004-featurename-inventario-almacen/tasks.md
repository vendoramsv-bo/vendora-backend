# Tasks: Inventario y AlmacÃ©n

**Input**: Design documents from `specs/004-featurename-inventario-almacen/`
**Prerequisites**: plan.md âœ…, spec.md âœ…, data-model.md âœ…, contracts/ âœ…, research.md âœ…, quickstart.md âœ…

**Organization**: Tasks organized by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks in the same phase)
- **[Story]**: User story label (US1â€“US5)
- Exact file paths required in each description

---

## Phase 1: Setup (Schema Modifications)

**Purpose**: Apply Prisma schema changes that all user stories depend on

- [X] T001 Modify prisma/30-catalogo.prisma â€” add `inventarioActivado Boolean @default(false)` field to `ProductoVariante` model and add `productosInsumoVariante ProductoInsumo[]` relation
- [X] T002 Modify prisma/40-almacen.prisma â€” (1) add `stockAntes Int @default(0)`, `stockDespues Int @default(0)`, `createdById String?` to `MovimientoInventario`; (2) add `stockDespues Int @default(0)` to `AjusteDetalle`; (3) add `stockAntes Int @default(0)`, `stockDespues Int @default(0)`, `createdById String?` to `MovimientoAlmacen`; (4) add `varianteId String?` and `variante ProductoVariante? @relation(...)` to `ProductoInsumo`, change `cantidad Int` to `cantidad Decimal @db.Decimal(10,4)`, update `@@unique` to `@@unique([productoId, varianteId, insumoId])`
- [ ] T003 Run `npx prisma migrate dev --name feat004-inventario-almacen` from project root to apply schema changes and regenerate Prisma client

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Domain errors, ports, notificador infrastructure, and shared Zod schemas â€” MUST be complete before any user story

âš ï¸ **CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create all domain error classes (`VarianteNoEncontrada`, `VarianteNoInicializada`, `VarianteYaInicializada`, `InsumoNoEncontrado`, `InsumoNombreDuplicado`, `InsumoEnUsoEnReceta`, `InsumoVencido`, `StockInsuficiente`, `ProveedorNoEncontrado`, `DetalleVacio`, `MotivoRequerido`) with HTTP status codes in src/modules/almacen/domain/almacen.errors.ts
- [X] T005 [P] Create `IAlmacenNotificador` port interface with methods `stockCritico`, `stockNormalizado`, `insumoStockCritico`, `insumoStockNormalizado` and their typed payloads (`StockCriticoPayload`, `StockNormalizadoPayload`, `InsumoStockCriticoPayload`, `InsumoStockNormalizadoPayload`) in src/modules/almacen/domain/ports/IAlmacenNotificador.ts
- [X] T006 [P] Create `IInventarioProductoRepository` port with methods for finding variante by tenantId, saving stock (inventarioActivado, cantidadStock, stockMinimo), creating AjusteInventario with detalles, creating RecuentoInventario with detalles, creating MovimientoInventario, listing ajustes and listado de movimientos with pagination in src/modules/almacen/domain/ports/IInventarioProductoRepository.ts
- [X] T007 [P] Create `IInsumoRepository` port with methods for CRUD of insumos (findById, findByNombre, create, update, delete), updating stock, creating MovimientoAlmacen, listing insumos with stockCritico filter and pagination, listing movimientos by insumoId in src/modules/almacen/domain/ports/IInsumoRepository.ts
- [X] T008 [P] Create `IIngresoAlmacenRepository` port with methods for creating IngresoAlmacen (with detalles, updating insumo stocks, creating MovimientoAlmacen INGRESO), findById with detalles, list with pagination in src/modules/almacen/domain/ports/IIngresoAlmacenRepository.ts
- [X] T009 [P] Create `ISalidaAlmacenRepository` port with methods for creating SalidaAlmacen (with detalles, updating insumo stocks, creating MovimientoAlmacen SALIDA), findById with detalles, list with pagination in src/modules/almacen/domain/ports/ISalidaAlmacenRepository.ts
- [X] T010 [P] Create `IRecuentoAlmacenRepository` port with methods for creating RecuentoAlmacen (with detalles, updating insumo stocks to stockFisico, creating MovimientoAlmacen RECUENTO), findById with detalles, list with pagination in src/modules/almacen/domain/ports/IRecuentoAlmacenRepository.ts
- [X] T011 [P] Create `IRecetaProductoRepository` port with methods for finding recipe by productoId (varianteId=null) and by (productoId+varianteId), upsert recipe lines in $transaction (delete old + insert new), delete by (productoId, varianteId), check if insumo is referenced in active recipes with productoIds list in src/modules/almacen/domain/ports/IRecetaProductoRepository.ts
- [X] T012 Create `NullAlmacenNotificador` class implementing `IAlmacenNotificador` with all no-op methods in src/modules/almacen/infrastructure/null-almacen.notificador.ts
- [X] T013 Create `AlmacenNotificadorProvider` module with `getAlmacenNotificador()` and `setAlmacenNotificador()` functions, initialized to `NullAlmacenNotificador` instance, following the same pattern as `ICatalogoNotificador` provider in src/modules/almacen/infrastructure/almacen.notificador.provider.ts
- [X] T014 [P] Create shared Zod schemas for all almacen request/response types (InicializarVarianteBody, AjusteInventarioBody, RecuentoInventarioBody, CrearInsumoBody, AjusteInsumoBody, CrearIngresoBody, CrearSalidaBody, RecuentoAlmacenBody, DefinirRecetaBody, ConsumirProductoBody) in src/modules/almacen/adapters/almacen.schema.ts
- [X] T015 [P] Create `FakeAlmacenNotificador` test spy (in-memory IAlmacenNotificador that records emitted events for assertion) in tests/helpers/fake-almacen-notificador.ts

**Checkpoint**: Foundation ready â€” all ports defined, notificador wired to Null impl, shared schemas available

---

## Phase 3: User Story 1 â€” Control de Stock de Productos (Priority: P1) ðŸŽ¯ MVP

**Goal**: Inicializar variantes en inventario, registrar ajustes de stock, consultar stock actual y movimientos

**Independent Test**: Inicializar variante (stock=50, mÃ­nimo=5), registrar ajuste -8 â†’ stock=42; intentar mover variante no inicializada â†’ 422; registrar ajuste que lleva stock a 4 â†’ evento stockCritico emitido; reponer a 6 â†’ evento stockNormalizado emitido

### Implementation for User Story 1

- [X] T016 [P] [US1] Implement `InventarioProductoPrismaRepository` implementing `IInventarioProductoRepository` â€” all methods must filter by tenantId, use `toPrismaArgs` for list queries, and run stock mutations in `$transaction` in src/modules/almacen/infrastructure/inventario-producto.prisma.repository.ts
- [X] T017 [P] [US1] Create `FakeInventarioProductoRepository` in-memory implementation of `IInventarioProductoRepository` using `Map` storage for unit tests in tests/helpers/fake-inventario-producto.repository.ts
- [X] T018 [US1] Implement `InicializarVarianteUseCase` â€” verify variante belongs to tenant (throw `VarianteNoEncontrada`), check `inventarioActivado` flag (throw `VarianteYaInicializada`), set `inventarioActivado=true`, `cantidadStock=stockInicial`, `stockMinimo`, create `MovimientoInventario` tipo `CREACION` with stockAntes=0/stockDespues=stockInicial in src/modules/almacen/application/inventario/inicializar-variante.usecase.ts
- [X] T019 [US1] Implement `ObtenerStockUseCase` â€” find variante by (id, tenantId), throw `VarianteNoEncontrada` if not found, return cantidadStock/stockMinimo/inventarioActivado in src/modules/almacen/application/inventario/obtener-stock.usecase.ts
- [X] T020 [US1] Implement `RegistrarAjusteUseCase` â€” throw `DetalleVacio` if no detalles; for each detalle verify `inventarioActivado=true` (throw `VarianteNoInicializada`); `$transaction`: create `AjusteInventario` + `AjusteDetalle[]` + `MovimientoInventario[]` each with stockAntes/stockDespues + update `cantidadStock`; post-transaction: call `evaluarStockCritico(stockAntes, stockDespues, stockMinimo)` per variante and emit via notificador in src/modules/almacen/application/inventario/registrar-ajuste.usecase.ts
- [X] T021 [US1] Implement `ListarAjustesUseCase` â€” tenantId-scoped, use `makeQueryParamsSchema + toPrismaArgs + paginate` from src/core/query-params.ts in src/modules/almacen/application/inventario/listar-ajustes.usecase.ts
- [X] T022 [US1] Implement `ListarMovimientosVarianteUseCase` â€” filter by (varianteId, tenantId), paginated with toPrismaArgs in src/modules/almacen/application/inventario/listar-movimientos-variante.usecase.ts
- [X] T023 [US1] Write unit tests for `InicializarVarianteUseCase` (happy path with CREACION movement, `VarianteNoEncontrada`, `VarianteYaInicializada` on double init) using FakeInventarioProductoRepository in tests/unit/inicializar-variante.usecase.test.ts
- [X] T024 [US1] Write unit tests for `RegistrarAjusteUseCase` (happy path single/multiple detalles, `VarianteNoInicializada`, `DetalleVacio`, stockCritico event emitted when crosses minimum, stockNormalizado event on recovery) using FakeInventarioProductoRepository + FakeAlmacenNotificador in tests/unit/registrar-ajuste.usecase.test.ts
- [X] T025 [US1] Implement `inventario.rest.ts` Hono router â€” `GET /variantes/:varianteId/stock`, `POST /variantes/:varianteId/inicializar`, `GET /variantes/:varianteId/movimientos`, `GET /ajustes`, `POST /ajustes`, `GET /ajustes/:id` â€” apply `requireRol(["PROPIETARIO","ADMIN"])` on write operations in src/modules/almacen/adapters/inventario.rest.ts
- [X] T026 [US1] Create `almacen-router.ts` â€” Hono app with `HonoEnv`, apply `requireAuth + requireTenantActivo` middleware on `"*"`, mount `inventarioRouter` in src/modules/almacen/adapters/almacen-router.ts
- [X] T027 [US1] Register `almacenApp` at `/api/almacen` in src/server/hono.ts inside `crearApp()`

**Checkpoint**: US1 fully functional â€” variant stock visible, adjustments recorded with full audit trail, stock critical/normalized events emitted via NullNotificador

---

## Phase 4: User Story 2 â€” Recuento de Inventario de Productos (Priority: P2)

**Goal**: Registrar recuentos fÃ­sicos que ajustan automÃ¡ticamente el stock al valor contado, con responsable y diferencia registrados

**Independent Test**: Variante con stock=50, registrar recuento fÃ­sico=47 â†’ stock ajustado a 47, movimiento tipo RECUENTO con stockAntes=50/stockDespues=47/diferencia=-3 y responsable registrado

### Implementation for User Story 2

- [X] T028 [US2] Implement `RegistrarRecuentoUseCase` â€” throw `DetalleVacio` if no detalles; verify all varianteIds have `inventarioActivado=true` (throw `VarianteNoInicializada`); `$transaction`: create `RecuentoInventario` + `RecuentoDetalle[]` (stockSistema=current, stockFisico, diferencia=stockFisico-stockSistema) + `MovimientoInventario[]` tipo `RECUENTO` with stockAntes/stockDespues + update `cantidadStock` to stockFisico; post-transaction: emit stockCritico/stockNormalizado per variante if threshold crossed in src/modules/almacen/application/inventario/registrar-recuento.usecase.ts
- [X] T029 [US2] Implement `ListarRecuentosUseCase` â€” tenantId-scoped, paginated with toPrismaArgs in src/modules/almacen/application/inventario/listar-recuentos.usecase.ts
- [X] T030 [US2] Write unit tests for `RegistrarRecuentoUseCase` (happy path with diferencia < 0, diferencia = 0 still creates recuento, `VarianteNoInicializada`, stockCritico event when count leaves stock below minimum) in tests/unit/registrar-recuento.usecase.test.ts
- [X] T031 [US2] Add recuento endpoints to `inventario.rest.ts` â€” `GET /recuentos`, `POST /recuentos`, `GET /recuentos/:id` â€” with `requireRol` on POST in src/modules/almacen/adapters/inventario.rest.ts

**Checkpoint**: US1 + US2 functional â€” physical inventory counts now auto-adjust stock with full audit trail

---

## Phase 5: User Story 3 â€” GestiÃ³n de Insumos y AlmacÃ©n (Priority: P3)

**Goal**: CRUD de insumos, ingresos con proveedor/lote/costo, salidas manuales, ajustes de insumo, recuentos de almacÃ©n, historial por insumo

**Independent Test**: Crear insumo "Harina" unidad=kg mÃ­nimo=10; ingreso 50kg proveedor "Molino ABC" lote L001 $2.50/kg â†’ stock=50; ajuste -45kg â†’ stock=5 < mÃ­nimo â†’ evento insumoStockCritico; historial muestra INGRESO + AJUSTE con stockAntes/stockDespues

### Implementation for User Story 3

- [X] T032 [P] [US3] Implement `InsumosPrismaRepository` implementing `IInsumoRepository` â€” all queries tenantId-scoped, `listInsumos` supports `stockCritico` filter (cantidadStock < stockMinimo), `updateStock` + `createMovimiento` inside `$transaction` in src/modules/almacen/infrastructure/insumo.prisma.repository.ts
- [X] T033 [P] [US3] Implement `IngresoAlmacenPrismaRepository` implementing `IIngresoAlmacenRepository` â€” `create` runs `$transaction` creating IngresoAlmacen + IngresoDetalles + incrementing each insumo cantidadStock + creating MovimientoAlmacen INGRESO with stockAntes/stockDespues per line in src/modules/almacen/infrastructure/ingreso-almacen.prisma.repository.ts
- [X] T034 [P] [US3] Implement `SalidaAlmacenPrismaRepository` implementing `ISalidaAlmacenRepository` â€” `create` runs `$transaction` creating SalidaAlmacen + SalidaDetalles + decrementing each insumo cantidadStock + creating MovimientoAlmacen SALIDA with stockAntes/stockDespues per line in src/modules/almacen/infrastructure/salida-almacen.prisma.repository.ts
- [X] T035 [P] [US3] Implement `RecuentoAlmacenPrismaRepository` implementing `IRecuentoAlmacenRepository` â€” `create` runs `$transaction` creating RecuentoAlmacen + RecuentoAlmacenDetalles + updating each insumo cantidadStock to stockFisico + creating MovimientoAlmacen RECUENTO with stockAntes/stockDespues per line in src/modules/almacen/infrastructure/recuento-almacen.prisma.repository.ts
- [X] T036 [P] [US3] Create `FakeInsumoRepository` in-memory implementation of `IInsumoRepository` using Map storage for unit tests in tests/helpers/fake-insumo.repository.ts
- [X] T037 [US3] Implement `CrearInsumoUseCase` â€” check `InsumoNombreDuplicado` (same nombre in tenant), create with `cantidadStock=0`, create `MovimientoAlmacen` tipo `CREACION` in src/modules/almacen/application/insumo/crear-insumo.usecase.ts
- [X] T038 [US3] Implement `ListarInsumosUseCase` â€” tenantId-scoped, supports `stockCritico` boolean filter, paginated with toPrismaArgs in src/modules/almacen/application/insumo/listar-insumos.usecase.ts
- [X] T039 [US3] Implement `ObtenerInsumoUseCase` â€” find by (id, tenantId), throw `InsumoNoEncontrado`, include unidadMedida and computed estado (critico, vencido) in src/modules/almacen/application/insumo/obtener-insumo.usecase.ts
- [X] T040 [US3] Implement `ActualizarInsumoUseCase` â€” find by (id, tenantId), if nombre changed check `InsumoNombreDuplicado`, update fields in src/modules/almacen/application/insumo/actualizar-insumo.usecase.ts
- [X] T041 [US3] Implement `CambiarEstadoInsumoUseCase` â€” find insumo, if setting INACTIVO check `IRecetaProductoRepository.findReferencingProducts(insumoId, tenantId)` and throw `InsumoEnUsoEnReceta` with productoIds list if non-empty, update estado in src/modules/almacen/application/insumo/cambiar-estado-insumo.usecase.ts
- [X] T042 [US3] Implement `EliminarInsumoUseCase` â€” find insumo, check `InsumoEnUsoEnReceta` same as CambiarEstado, delete if safe in src/modules/almacen/application/insumo/eliminar-insumo.usecase.ts
- [X] T043 [US3] Implement `RegistrarAjusteInsumoUseCase` â€” require motivo (throw `MotivoRequerido`), find insumo, if fechaVencimiento < now set `InsumoVencido` warning flag (do not throw), compute stockAntes/stockDespues, `$transaction`: update cantidadStock + create MovimientoAlmacen AJUSTE; post-tx: call `evaluarStockCritico` and emit `insumoStockCritico` or `insumoStockNormalizado` in src/modules/almacen/application/insumo/registrar-ajuste-insumo.usecase.ts
- [X] T044 [US3] Implement `ListarMovimientosInsumoUseCase` â€” filter by (insumoId, tenantId), paginated with toPrismaArgs in src/modules/almacen/application/insumo/listar-movimientos-insumo.usecase.ts
- [X] T045 [US3] Implement `CrearIngresoUseCase` â€” throw `ProveedorNoEncontrado` if proveedorId not in tenant, verify each insumoId (throw `InsumoNoEncontrado`), set `InsumoVencido` warning if any line has past fechaVencimiento, delegate to `IIngresoAlmacenRepository.create` (which handles $transaction), post-tx: emit `insumoStockNormalizado` for any insumo whose stock crossed minimum upward in src/modules/almacen/application/almacen/crear-ingreso.usecase.ts
- [X] T046 [US3] Implement `ListarIngresosUseCase` â€” tenantId-scoped, paginated with toPrismaArgs in src/modules/almacen/application/almacen/listar-ingresos.usecase.ts
- [X] T047 [US3] Implement `CrearSalidaUseCase` â€” throw `DetalleVacio` if no detalles, verify each insumoId, if any insumo has insufficient stock and `forzar=false` throw `StockInsuficiente`, delegate to `ISalidaAlmacenRepository.create` ($transaction), post-tx: emit `insumoStockCritico` for any insumo crossing minimum downward in src/modules/almacen/application/almacen/crear-salida.usecase.ts
- [X] T048 [US3] Implement `ListarSalidasUseCase` â€” tenantId-scoped, paginated with toPrismaArgs in src/modules/almacen/application/almacen/listar-salidas.usecase.ts
- [X] T049 [US3] Implement `RegistrarRecuentoAlmacenUseCase` â€” throw `DetalleVacio` if no detalles, verify each insumoId, delegate to `IRecuentoAlmacenRepository.create` ($transaction), post-tx: emit `insumoStockCritico`/`insumoStockNormalizado` per insumo where threshold crossed in src/modules/almacen/application/almacen/registrar-recuento-almacen.usecase.ts
- [X] T050 [US3] Implement `ListarRecuentosAlmacenUseCase` â€” tenantId-scoped, paginated with toPrismaArgs in src/modules/almacen/application/almacen/listar-recuentos-almacen.usecase.ts
- [X] T051 [US3] Write unit tests for `CrearInsumoUseCase` (happy path creates with stock=0, `InsumoNombreDuplicado` on same tenant, different tenant allowed) in tests/unit/crear-insumo.usecase.test.ts
- [X] T052 [US3] Write unit tests for `CambiarEstadoInsumoUseCase` (ACTIVOâ†’INACTIVO happy path, `InsumoEnUsoEnReceta` with productoIds, INACTIVOâ†’ACTIVO always allowed) in tests/unit/cambiar-estado-insumo.usecase.test.ts
- [X] T053 [US3] Write unit tests for `CrearIngresoUseCase` (happy path with stock increase, `ProveedorNoEncontrado`, `InsumoVencido` warning header, `insumoStockNormalizado` event when stock crosses minimum upward) in tests/unit/crear-ingreso-almacen.usecase.test.ts
- [X] T054 [US3] Implement `insumo.rest.ts` Hono router â€” `GET /insumos`, `POST /insumos`, `GET /insumos/:id`, `PUT /insumos/:id`, `PATCH /insumos/:id/estado`, `DELETE /insumos/:id`, `GET /insumos/:id/movimientos`, `POST /insumos/:id/ajuste` â€” with `requireRol` on writes; set `X-Warning: insumo-vencido` header when use case returns `InsumoVencido` warning in src/modules/almacen/adapters/insumo.rest.ts
- [X] T055 [US3] Implement `almacen-operaciones.rest.ts` Hono router â€” `GET /ingresos`, `POST /ingresos`, `GET /ingresos/:id`, `GET /salidas`, `POST /salidas`, `GET /salidas/:id`, `GET /recuentos-almacen`, `POST /recuentos-almacen`, `GET /recuentos-almacen/:id` â€” with `requireRol` on writes in src/modules/almacen/adapters/almacen-operaciones.rest.ts
- [X] T056 [US3] Mount `insumoRouter` and `almacenOperacionesRouter` in src/modules/almacen/adapters/almacen-router.ts

**Checkpoint**: US3 fully functional â€” insumo catalog, ingresos with supplier+lot, salidas, recuentos de almacÃ©n, all with event emission

---

## Phase 6: User Story 4 â€” Recetas y Consumo (Priority: P4)

**Goal**: Definir recetas a nivel de producto o variante; registrar consumos que descuentan insumos automÃ¡ticamente aplicando herencia de receta; `forzar` flag para stock insuficiente

**Independent Test**: Definir receta "Empanada" = 0.1kg harina + 0.05kg carne; consumo 10 unidades â†’ harina -1kg, carne -0.5kg, movimientos automÃ¡ticos tipo SALIDA por receta; variante sin receta propia hereda receta del producto base

### Implementation for User Story 4

- [X] T057 [P] [US4] Implement `RecetaProductoPrismaRepository` implementing `IRecetaProductoRepository` â€” `findByProducto` gets lines where varianteId=null; `findByVariante` gets lines where varianteId=specific; `upsert` runs `$transaction` (delete existing lines for same productoId+varianteId, insert new lines); `findReferencingProducts(insumoId)` returns list of productoIds referencing the insumo; all queries tenantId-scoped via producto relation in src/modules/almacen/infrastructure/receta-producto.prisma.repository.ts
- [X] T058 [P] [US4] Create `FakeRecetaProductoRepository` in-memory implementation of `IRecetaProductoRepository` in tests/helpers/fake-receta-producto.repository.ts
- [X] T059 [US4] Implement `ObtenerRecetaUseCase` â€” if varianteId provided: find recipe for (productoId, varianteId), fallback to (productoId, null) if not found; return lines array (empty if no recipe) in src/modules/almacen/application/receta/obtener-receta.usecase.ts
- [X] T060 [US4] Implement `DefinirRecetaUseCase` â€” verify producto exists and belongs to tenant, if varianteId: verify variante belongs to producto, verify all insumoIds exist and are ACTIVO in tenant (throw `InsumoNoEncontrado` for any missing), upsert via `IRecetaProductoRepository.upsert` in src/modules/almacen/application/receta/definir-receta.usecase.ts
- [X] T061 [US4] Implement `EliminarRecetaUseCase` â€” verify producto exists, delete ProductoInsumo lines for (productoId, varianteId) â€” varianteId=null for product-level recipe in src/modules/almacen/application/receta/eliminar-receta.usecase.ts
- [X] T062 [US4] Implement `RegistrarConsumoUseCase` â€” verify variante `inventarioActivado` (throw `VarianteNoInicializada`); look up recipe: first by (productoId, varianteId), then by (productoId, null); if recipe exists: for each line compute `cantidadInsumo = linea.cantidad * cantidad`, if any insumo stock < cantidadInsumo and `forzar=false` throw `StockInsuficiente`; `$transaction`: decrement `cantidadStock` on variante + decrement each insumo + create `MovimientoInventario` + create `MovimientoAlmacen` per insumo; post-tx: emit stockCritico/Normalizado for variante and each insumo in src/modules/almacen/application/consumo/registrar-consumo.usecase.ts
- [X] T063 [US4] Write unit tests for `DefinirRecetaUseCase` (happy path product-level, happy path variante-level, insumo INACTIVO throws, variante not belonging to producto throws) in tests/unit/definir-receta.usecase.test.ts
- [X] T064 [US4] Write unit tests for `RegistrarConsumoUseCase` (happy path with variant recipe, fallback to product recipe, no recipe only decrements variant stock, `StockInsuficiente` forzar=false, forzar=true allows negative stock, stockCritico/Normalizado events emitted correctly) in tests/unit/registrar-consumo.usecase.test.ts
- [X] T065 [US4] Implement `receta.rest.ts` Hono router â€” `GET /productos/:productoId/receta`, `PUT /productos/:productoId/receta`, `DELETE /productos/:productoId/receta`, `GET /productos/:productoId/variantes/:varianteId/receta`, `PUT /productos/:productoId/variantes/:varianteId/receta`, `DELETE /productos/:productoId/variantes/:varianteId/receta` â€” with `requireRol` on writes in src/modules/almacen/adapters/receta.rest.ts
- [X] T066 [US4] Implement `consumo.rest.ts` Hono router â€” `POST /consumo` with `forzar` boolean body field; response includes `stockAntes`, `stockDespues`, `insumosBajados[]`, `advertencias[]` in src/modules/almacen/adapters/consumo.rest.ts
- [X] T067 [US4] Mount `recetaRouter` and `consumoRouter` in src/modules/almacen/adapters/almacen-router.ts

**Checkpoint**: US4 fully functional â€” recipe inheritance working, consumption auto-deducts supplies, insufficient stock handled with forzar flag

---

## Phase 7: User Story 5 â€” Notificaciones en Tiempo Real (Priority: P5)

**Goal**: Replace `NullAlmacenNotificador` with `AlmacenSocketNotificador` to emit 4 typed events via Socket.IO to the correct tenant room

**Independent Test**: Two clients of tenant A connected; adjustment drops product below minimum â†’ both clients receive `almacen:stock:critico` event; client from tenant B receives nothing; replenishment â†’ both clients receive `almacen:stock:normalizado`

### Implementation for User Story 5

- [X] T068 [US5] Implement `AlmacenSocketNotificador` class implementing `IAlmacenNotificador` â€” each method calls `io.to(`tenant:${tenantId}`).emit(eventName, payload)` for its respective event (`almacen:stock:critico`, `almacen:stock:normalizado`, `almacen:insumo:stock:critico`, `almacen:insumo:stock:normalizado`); constructor receives `Server` from socket.io in src/modules/almacen/infrastructure/almacen.socket.notificador.ts
- [X] T069 [US5] Register `AlmacenSocketNotificador` in src/server/index.ts â€” after `io` is initialized, create `const almacenNotificador = new AlmacenSocketNotificador(io)` and call `setAlmacenNotificador(almacenNotificador)`; import from almacen.notificador.provider.ts

**Checkpoint**: All 4 real-time events live â€” almacen:stock:critico, almacen:stock:normalizado, almacen:insumo:stock:critico, almacen:insumo:stock:normalizado broadcast to correct tenant rooms only

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final type safety and test validation

- [X] T070 [P] Run `npx tsc --noEmit` and fix any TypeScript strict-mode errors across all new files in src/modules/almacen/
- [X] T071 [P] Run `npx vitest run tests/unit/` and verify all 8 unit test files pass (inicializar-variante, registrar-ajuste, registrar-recuento, crear-insumo, cambiar-estado-insumo, crear-ingreso-almacen, definir-receta, registrar-consumo)
- [ ] T072 Manually trace quickstart.md Escenarios 1â€“6 against implemented endpoints to confirm all paths work end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies â€” start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion (Prisma types must be regenerated before writing repository implementations)
- **US1 (Phase 3)**: Depends on Phase 2 completion
- **US2 (Phase 4)**: Depends on Phase 3 (shares inventario.rest.ts and same repository)
- **US3 (Phase 5)**: Depends on Phase 2 only â€” can run in parallel with US1+US2 after Phase 2 completes
- **US4 (Phase 6)**: Depends on Phase 3 (US1) AND Phase 5 (US3) â€” needs both variant stock and insumo stock operational
- **US5 (Phase 7)**: Depends on all US1â€“US4 phases â€” upgrades notificador from Null to Socket
- **Polish (Phase 8)**: Depends on all user story phases

### User Story Dependencies

- **US1 (P1)**: Phase 2 only
- **US2 (P2)**: US1 (shared repository + inventario.rest.ts)
- **US3 (P3)**: Phase 2 only â€” parallel with US1 after Phase 2
- **US4 (P4)**: US1 + US3 (requires both variant stock and insumo stock)
- **US5 (P5)**: US1 + US2 + US3 + US4 (all event sources)

### Within Each User Story

- Repository implementations before use cases (use cases inject repositories)
- Use cases before adapters (adapters call use cases)
- Unit tests written after repository fake + use case are both complete
- Adapter mounting in almacen-router.ts after adapter file created

### Parallel Opportunities

- T005â€“T011: All port interface files in Phase 2 can run in parallel
- T016â€“T017: Repository + fake helper can run in parallel in Phase 3
- T032â€“T036: All US3 repository files + fake can run in parallel
- T057â€“T058: US4 repository + fake can run in parallel
- T070â€“T071: TypeScript check + test run can run in parallel

---

## Parallel Example: User Story 3

```
# All US3 repositories and fake can run together (T032â€“T036):
Task T032: insumo.prisma.repository.ts
Task T033: ingreso-almacen.prisma.repository.ts
Task T034: salida-almacen.prisma.repository.ts
Task T035: recuento-almacen.prisma.repository.ts
Task T036: fake-insumo.repository.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (schema + migration)
2. Complete Phase 2: Foundational (ports + notificador + schemas)
3. Complete Phase 3: User Story 1 (stock de variantes, ajustes, movimientos)
4. **STOP and VALIDATE**: Run quickstart Escenario 1 against running server
5. Proceed to US2 if validation passes

### Incremental Delivery

1. Phase 1 + 2 â†’ Foundation ready
2. Phase 3 (US1) â†’ Stock de variantes funcional (MVP)
3. Phase 4 (US2) â†’ Recuentos fÃ­sicos aÃ±adidos
4. Phase 5 (US3) â†’ MÃ³dulo de insumos completo (independent of US1/US2)
5. Phase 6 (US4) â†’ Recetas y consumo integrado (requires US1 + US3)
6. Phase 7 (US5) â†’ Notificaciones en tiempo real activadas
7. Phase 8 â†’ Polish y validaciÃ³n final

### Notes

- `$transaction` is required for ALL stock mutations to ensure atomicity
- Emit notificador events AFTER `$transaction` commits (post-transaction), never inside
- `evaluarStockCritico(stockAntes, stockDespues, stockMinimo)`: `stockAntes >= min && stockDespues < min â†’ "critico"` ; `stockAntes < min && stockDespues >= min â†’ "normalizado"`
- Use `makeQueryParamsSchema + toPrismaArgs + paginate` from `src/core/query-params.ts` for all list use cases
- `InsumoVencido` is a warning (set `X-Warning: insumo-vencido` header), NOT an error that blocks the operation
- `StockInsuficiente` blocks only when `forzar=false`; `forzar=true` proceeds and allows negative stock
- Recipe inheritance in consumo: variante recipe â†’ product recipe â†’ no recipe (only decrement variant stock)
- `requireRol(["PROPIETARIO","ADMIN"])` on all write endpoints; any authenticated tenant member can read

