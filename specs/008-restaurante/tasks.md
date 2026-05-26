# Tasks: MÃ³dulo de Restaurante

**Input**: Design documents from `specs/008-restaurante/`  
**Feature**: 008-restaurante Â· Branch: main  
**Plan**: [plan.md](plan.md) Â· **Spec**: [spec.md](spec.md)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1â€“US5)
- All paths are relative to repository root

---

## Phase 1: Setup

**Purpose**: Estructura del mÃ³dulo y dependencias nuevas.

- [X] T001 Create module directory skeleton: `src/modules/restaurante/{domain/ports,application/{restaurante,tiempo-comida,menu,reserva,cocina,publicacion-rrss},infrastructure,adapters}` and `tests/restaurante/{unit/{domain,application},integration}`
- [ ] T002 Add new dependencies to `package.json`: `satori`, `@resvg/resvg-js`, verify they install cleanly with `pnpm install`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Errores de dominio, puertos transversales, guard de capacidad y schemas Zod base. BLOQUEANTE para todas las user stories.

- [X] T003 [P] Create `src/modules/restaurante/domain/restaurante.errors.ts` with domain error classes: `RestauranteNoEncontrado`, `TiempoComidaDuplicado`, `TiempoComidaEnUso`, `MenuNoEncontrado`, `MenuNoEditable`, `MenuSinItemsDisponibles`, `MenuNoPublicado`, `ItemDuplicado`, `ItemNoDisponible`, `ItemConReservasActivas`, `ReservaNoEncontrada`, `ReservaYaPagada`, `TransicionInvalida`, `TransicionCocinaInvalida`, `RolSinPermiso`, `CajaNoAbierta`, `PlataformaNoConfigurada`, `PublicacionYaProcesada`, `FechaEnPasado`, `HoraFueraDeServicio`
- [X] T004 [P] Create `src/modules/restaurante/domain/ports/IRestauranteNotificador.ts` with methods: `reservaCreada(data)`, `reservaActualizada(data)`, `platoCocinaActualizado(data)` â€” typed with `RestauranteServerToClientEvents` shapes from `contracts/rest-api.md`
- [X] T005 [P] Create `src/modules/restaurante/infrastructure/restaurante.null.notificador.ts` (no-op implementation of IRestauranteNotificador for tests) and `src/modules/restaurante/infrastructure/restaurante.notificador.provider.ts` (returns socket or null implementation based on env)
- [X] T006 Create `src/modules/restaurante/infrastructure/restaurante.socket.notificador.ts` implementing `IRestauranteNotificador` â€” emits to `tenant:${tenantId}:restaurante` and `tenant:${tenantId}:cocina` per event type
- [X] T007 [P] Create `src/modules/restaurante/domain/ports/IRestauranteVentaService.ts` (cross-module port) and `src/modules/restaurante/infrastructure/venta.restaurante.service.ts` (implementation calling ventas module with `referenciaTipo = "RESERVA_RESTAURANTE"`)
- [X] T008 [P] Create `src/modules/restaurante/adapters/restaurante.schema.ts` with base Zod schemas for all entities: `tiempoComidaSchema`, `menuSchema`, `menuItemSchema`, `reservaSchema`, `reservaDetalleSchema`, `publicacionRRSSSchema` â€” used by all REST adapters
- [X] T009 Create `src/modules/restaurante/adapters/restaurante-guard.middleware.ts` â€” `requireRestaurante` middleware verifying `tenant.esRestaurante === true`; returns 403 `CAPACIDAD_NO_ACTIVADA` otherwise
- [X] T010 Create `src/modules/restaurante/adapters/restaurante.router.ts` â€” Hono router mounting all sub-routers; apply `requireAuth` + `requireTenant` + `requireRestaurante` to staff routes; `/public/restaurante/:slug/*` routes skip auth

**Checkpoint**: Guard, notificador, cross-module ports y schemas base listos. Las user stories pueden comenzar.

---

## Phase 3: User Story 1 â€” ConfiguraciÃ³n del Restaurante (Priority: P1) ðŸŽ¯ MVP

**Goal**: ADMIN configura perfil del restaurante (capacidad, servicios, RRSS) y define franjas horarias (tiempos de comida). Sin esto no se pueden crear menÃºs ni reservas.

**Independent Test**: `GET /restaurante/perfil` devuelve el perfil. `POST /restaurante/tiempos-comida` crea "Almuerzo 12:00â€“15:00" y aparece en `GET /restaurante/tiempos-comida` ordenado correctamente. Tenant sin `esRestaurante` recibe 403.

### Implementation for User Story 1

- [X] T011 [P] [US1] Create `src/modules/restaurante/domain/restaurante.entity.ts` â€” entity with fields from `Restaurante` model (tenant schema), validations: `capacidadMesas â‰¥ 1`, `duracionPromedioMinutos â‰¥ 1`, `servicios` as array of valid string flags
- [X] T012 [P] [US1] Create `src/modules/restaurante/domain/tiempo-comida.entity.ts` â€” entity with `horaInicio`/`horaFin` in "HH:MM" format, invariant: fin > inicio, `orden â‰¥ 0`
- [X] T013 [P] [US1] Create `src/modules/restaurante/domain/ports/IRestauranteRepository.ts` with methods: `findByTenantId(tenantId)`, `update(id, data)`
- [X] T014 [P] [US1] Create `src/modules/restaurante/domain/ports/ITiempoComidaRepository.ts` with methods: `findAllByRestaurante(restauranteId, estado?)`, `findById(id)`, `findByNombre(restauranteId, nombre)`, `create(data)`, `update(id, data)`, `softDelete(id)`, `countMenuItemsActivos(tiempoComidaId)`
- [X] T015 [US1] Create `src/modules/restaurante/infrastructure/restaurante.prisma.repository.ts` implementing `IRestauranteRepository` using scoped Prisma client (schema `tenant`)
- [X] T016 [US1] Create `src/modules/restaurante/infrastructure/tiempo-comida.prisma.repository.ts` implementing `ITiempoComidaRepository` using scoped Prisma client (schema `restaurante`), with `@@index([restauranteId, orden])` ordering
- [X] T017 [P] [US1] Create `src/modules/restaurante/application/restaurante/obtener-restaurante.usecase.ts` â€” loads Restaurante by tenantId, throws `RestauranteNoEncontrado` if not found
- [X] T018 [P] [US1] Create `src/modules/restaurante/application/restaurante/actualizar-restaurante.usecase.ts` â€” validates fields, updates profile, emits no event (profile update is not real-time)
- [X] T019 [P] [US1] Create `src/modules/restaurante/application/tiempo-comida/listar-tiempos-comida.usecase.ts` â€” returns list ordered by `orden`, filtered by estado
- [X] T020 [P] [US1] Create `src/modules/restaurante/application/tiempo-comida/crear-tiempo-comida.usecase.ts` â€” checks `findByNombre` uniqueness, throws `TiempoComidaDuplicado` if exists, creates with next orden if not specified
- [X] T021 [P] [US1] Create `src/modules/restaurante/application/tiempo-comida/actualizar-tiempo-comida.usecase.ts` â€” updates nombre/horario/orden/icono, re-checks uniqueness if nombre changes
- [X] T022 [P] [US1] Create `src/modules/restaurante/application/tiempo-comida/eliminar-tiempo-comida.usecase.ts` â€” calls `countMenuItemsActivos`; if > 0 throws `TiempoComidaEnUso`; otherwise soft deletes
- [X] T023 [US1] Create `src/modules/restaurante/adapters/restaurante.rest.ts` â€” `GET /restaurante/perfil` and `PUT /restaurante/perfil` routes using `@hono/zod-openapi`; role check PROPIETARIO|ADMIN|ENCARGADO for PUT
- [X] T024 [US1] Create `src/modules/restaurante/adapters/tiempo-comida.rest.ts` â€” full CRUD routes (`GET|POST /restaurante/tiempos-comida`, `GET|PUT|DELETE /restaurante/tiempos-comida/:id`) with role guards

### Tests for User Story 1

- [ ] T025 [P] [US1] Create `tests/restaurante/unit/domain/tiempo-comida.entity.test.ts` â€” unit tests: valid entity creation, `horaFin â‰¤ horaInicio` throws, empty nombre throws
- [ ] T026 [P] [US1] Create `tests/restaurante/unit/application/crear-tiempo-comida.usecase.test.ts` â€” in-memory fake repo: success path, `TiempoComidaDuplicado` when nombre exists, `TiempoComidaEnUso` on delete with active items
- [ ] T027 [US1] Create `tests/restaurante/integration/tiempo-comida.prisma.repository.test.ts` â€” `describe.skipIf(!process.env.DATABASE_URL)`: create, findAll ordered by orden, unique constraint, softDelete

**Checkpoint**: Perfil y tiempos de comida funcionales. Tenant guard validado. Listo para US2.

---

## Phase 4: User Story 2 â€” GestiÃ³n de MenÃºs (Priority: P1)

**Goal**: ADMIN crea menÃºs con Ã­tems del catÃ¡logo, asignados a tiempos de comida con precios propios. Ciclo de vida: borrador â†’ aprobado â†’ publicado â†’ archivado. MÃºltiples menÃºs publicados pueden coexistir.

**Independent Test**: Crear menÃº DIARIO, agregar 3 platos del catÃ¡logo con precio 15.50, publicarlo. `GET /public/restaurante/:slug/menus` devuelve el menÃº. Intentar publicar sin Ã­tems devuelve 422 `MENU_SIN_ITEMS_DISPONIBLES`.

### Implementation for User Story 2

- [X] T028 [P] [US2] Create `src/modules/restaurante/domain/menu.entity.ts` â€” entity with state machine: valid transitions `BORRADORâ†’APROBADOâ†’PUBLICADOâ†’ARCHIVADO`; `BORRADORâ†’CANCELADO`; invariant: no publicar sin Ã­tems disponibles
- [X] T029 [P] [US2] Create `src/modules/restaurante/domain/menu-item.entity.ts` â€” entity with price snapshot invariant: `precio â‰¥ 0`, `cantidad â‰¥ 1`, snapshots inmutables tras creaciÃ³n
- [X] T030 [P] [US2] Create `src/modules/restaurante/domain/ports/IMenuRepository.ts` with methods: `findAllByRestaurante(restauranteId, params)`, `findById(id)`, `create(data)`, `update(id, data)`, `countItemsDisponibles(menuId)`, `findPublicadosBySlug(slug, fecha, horaLlegada?)`
- [X] T031 [P] [US2] Create `src/modules/restaurante/domain/ports/IMenuItemRepository.ts` with methods: `findAllByMenu(menuId)`, `findById(id)`, `findByProductoEnMenu(menuId, tiempoComidaId, productoId)`, `create(data)`, `update(id, data)`, `delete(id)`, `countReservasActivas(menuItemId)`
- [X] T032 [US2] Create `src/modules/restaurante/infrastructure/menu.prisma.repository.ts` implementing `IMenuRepository` â€” includes cross-schema query for public menus filtered by `slug` of `Restaurante` (tenant schema)
- [X] T033 [US2] Create `src/modules/restaurante/infrastructure/menu-item.prisma.repository.ts` implementing `IMenuItemRepository` â€” captures product snapshot from `Producto` (catalogo schema) at creation time
- [X] T034 [P] [US2] Create `src/modules/restaurante/application/menu/listar-menus.usecase.ts` â€” uses `makeQueryParamsSchema` + `toPrismaArgs` (ArtÃ­culo IV); filterables: `estado`, `tipo`, `fechaInicio`
- [X] T035 [P] [US2] Create `src/modules/restaurante/application/menu/crear-menu.usecase.ts` â€” creates menu in BORRADOR state
- [X] T036 [P] [US2] Create `src/modules/restaurante/application/menu/obtener-menu.usecase.ts` â€” returns menu with items grouped by tiempoComida
- [X] T037 [P] [US2] Create `src/modules/restaurante/application/menu/actualizar-menu.usecase.ts` â€” only in BORRADOR|APROBADO; throws `MenuNoEditable` for PUBLICADO|ARCHIVADO
- [X] T038 [US2] Create `src/modules/restaurante/application/menu/cambiar-estado-menu.usecase.ts` â€” validates state machine, calls `countItemsDisponibles` before PUBLICADO, throws `MenuSinItemsDisponibles`; emits no real-time event (menu state is not real-time per spec)
- [X] T039 [P] [US2] Create `src/modules/restaurante/application/menu/agregar-item-menu.usecase.ts` â€” checks `findByProductoEnMenu` uniqueness (`ItemDuplicado`), loads product snapshot from catalogo, creates MenuItem
- [X] T040 [P] [US2] Create `src/modules/restaurante/application/menu/actualizar-item-menu.usecase.ts` â€” updates precio/flags/orden/notaMenu; snapshots remain frozen
- [X] T041 [P] [US2] Create `src/modules/restaurante/application/menu/eliminar-item-menu.usecase.ts` â€” checks `countReservasActivas`; throws `ItemConReservasActivas` if > 0
- [X] T042 [US2] Create `src/modules/restaurante/adapters/menu.rest.ts` â€” `GET|POST /restaurante/menus`, `GET|PUT /restaurante/menus/:id`, `PATCH /restaurante/menus/:id/estado`; includes `GET /public/restaurante/:slug/menus` and `GET /public/restaurante/:slug/menus/:menuId` (no auth)
- [X] T043 [US2] Create `src/modules/restaurante/adapters/menu-item.rest.ts` â€” `GET|POST /restaurante/menus/:menuId/items`, `PUT|DELETE /restaurante/menus/:menuId/items/:itemId`

### Tests for User Story 2

- [ ] T044 [P] [US2] Create `tests/restaurante/unit/domain/menu.entity.test.ts` â€” state machine: all valid transitions pass, invalid transitions throw `TransicionInvalida`
- [ ] T045 [P] [US2] Create `tests/restaurante/unit/application/cambiar-estado-menu.usecase.test.ts` â€” in-memory fake: success BORRADORâ†’PUBLICADO with items, `MenuSinItemsDisponibles` without items, `MenuNoEditable` on ARCHIVADO edit
- [ ] T046 [US2] Create `tests/restaurante/integration/menu.prisma.repository.test.ts` â€” `describe.skipIf(!DATABASE_URL)`: create, findPublicadosBySlug with hora filter, countItemsDisponibles

**Checkpoint**: MenÃºs y su ciclo de vida funcionales. Clientes externos pueden ver menÃºs publicados. Listo para US3.

---

## Phase 5: User Story 3 â€” Reservas de Clientes (Priority: P1)

**Goal**: Clientes (registrados u ocasionales) crean reservas desde el menÃº pÃºblico. Meseros gestionan el flujo de estados hasta el pago, que crea una venta en caja.

**Independent Test**: Cliente ocasional crea reserva con 2 platos, recibe cÃ³digo `RST-YYYYMMDD-XXXX`. Mesero la confirma, el estado cambia y todos los usuarios conectados lo ven en â‰¤ 2s. Al pagar, se crea una venta en caja; sin caja abierta retorna 422.

### Implementation for User Story 3

- [X] T047 [P] [US3] Create `src/modules/restaurante/domain/reserva.entity.ts` â€” entity with state machine: `RESERVADAâ†’CONFIRMADAâ†’EN_PREPARACIONâ†’LISTAâ†’ENTREGADAâ†’PAGADA`; branching: `CANCELADA` and `NO_ASISTIO` from pre-PAGADA states; code generation logic `RST-YYYYMMDD-XXXX`
- [X] T048 [P] [US3] Create `src/modules/restaurante/domain/reserva-detalle.entity.ts` â€” entity with cocina state machine: `PENDIENTEâ†’EN_PREPARACIONâ†’LISTO` (CHEF); `LISTOâ†’ENTREGADO` (MESERO only); price snapshot immutable
- [X] T049 [P] [US3] Create `src/modules/restaurante/domain/ports/IReservaRepository.ts` with methods: `findAllByRestaurante(restauranteId, params)`, `findById(id)`, `findByCodigo(restauranteId, codigo)`, `countByRestauranteAndFecha(restauranteId, fecha)`, `create(data)`, `update(id, data)`, `findByClienteEmail(restauranteId, email)`
- [X] T050 [P] [US3] Create `src/modules/restaurante/domain/ports/IReservaDetalleRepository.ts` with methods: `findByReserva(reservaId)`, `create(data)`, `updateEstadoCocina(id, estado)`, `countByEstadoCocina(reservaId, estado)`, `findById(id)`
- [X] T051 [US3] Create `src/modules/restaurante/infrastructure/reserva.prisma.repository.ts` implementing `IReservaRepository` â€” includes `PedidoEstadoLog` creation on state change, query with `@@index([restauranteId, fechaLlegada])`
- [X] T052 [US3] Create `src/modules/restaurante/infrastructure/reserva-detalle.prisma.repository.ts` implementing `IReservaDetalleRepository`
- [X] T053 [US3] Create `src/modules/restaurante/application/reserva/crear-reserva-publica.usecase.ts` â€” resolves Cliente by email or creates occasional client record, generates code with retry on `@@unique` conflict, validates items are `disponible=true`, creates Reserva + ReservaDetalle with price snapshots, emits `reservaCreada` via notificador
- [X] T054 [P] [US3] Create `src/modules/restaurante/application/reserva/listar-reservas.usecase.ts` â€” uses `makeQueryParamsSchema` (ArtÃ­culo IV); filterables: `estado`, `fecha`, `search` (codigo, clienteNombre)
- [X] T055 [P] [US3] Create `src/modules/restaurante/application/reserva/obtener-reserva.usecase.ts` â€” returns Reserva with `detalles[]` and `estadosLog[]`
- [X] T056 [US3] Create `src/modules/restaurante/application/reserva/cambiar-estado-reserva.usecase.ts` â€” validates state machine transition, role-based permission check per target state, creates `PedidoEstadoLog`, emits `reservaActualizada` via notificador
- [X] T057 [US3] Create `src/modules/restaurante/application/reserva/pagar-reserva.usecase.ts` â€” validates `estado !== PAGADA` (throws `ReservaYaPagada`), calls `IRestauranteVentaService.crearVenta` (throws `CajaNoAbierta` if service raises it), updates `Reserva.ventaId` and `estado = PAGADA`, emits `reservaActualizada`
- [X] T058 [P] [US3] Create `src/modules/restaurante/application/reserva/listar-reservas-cliente.usecase.ts` â€” lookup by email (and optional codigo), returns reservas of that cliente for the restaurante (public, no full auth)
- [X] T059 [US3] Create `src/modules/restaurante/adapters/reserva.rest.ts` â€” staff routes: `GET|GET/:id /restaurante/reservas`, `PATCH /restaurante/reservas/:id/estado`, `POST /restaurante/reservas/:id/pagar`
- [X] T060 [US3] Create `src/modules/restaurante/adapters/reserva-publica.rest.ts` â€” public routes (no auth): `POST /public/restaurante/:slug/reservas`, `GET /public/restaurante/:slug/mis-reservas`

### Tests for User Story 3

- [ ] T061 [P] [US3] Create `tests/restaurante/unit/domain/reserva.entity.test.ts` â€” code generation format, state machine valid/invalid transitions, `ReservaYaPagada` guard
- [ ] T062 [P] [US3] Create `tests/restaurante/unit/application/crear-reserva-publica.usecase.test.ts` â€” in-memory fakes: success path with 2 items, `ItemNoDisponible` when `disponible=false`, notificador spy asserts `reservaCreada` called
- [ ] T063 [P] [US3] Create `tests/restaurante/unit/application/cambiar-estado-reserva.usecase.test.ts` â€” valid transitions, `TransicionInvalida` on bad transition, `RolSinPermiso` for CHEF trying to confirm arrival
- [ ] T064 [P] [US3] Create `tests/restaurante/unit/application/pagar-reserva.usecase.test.ts` â€” success path creates venta, `CajaNoAbierta` from VentaService propagates, `ReservaYaPagada` guard
- [ ] T065 [US3] Create `tests/restaurante/integration/reserva.prisma.repository.test.ts` â€” `describe.skipIf(!DATABASE_URL)`: create reserva + detalles, countByRestauranteAndFecha, findByCodigo unique

**Checkpoint**: Flujo completo de reservas end-to-end. Tiempo real para cambios de estado activo. IntegraciÃ³n caja validada. Listo para US4.

---

## Phase 6: User Story 4 â€” Panel de Cocina en Tiempo Real (Priority: P2)

**Goal**: CHEF ve todas las reservas activas plato a plato. Actualiza estados de cocina en tiempo real. Al entregar todos los platos, la reserva avanza automÃ¡ticamente a LISTA. MESERO puede marcar platos como entregados.

**Independent Test**: Con dos conexiones Socket.IO abiertas (CHEF y MESERO), al marcar un plato como LISTO en la vista de cocina, el MESERO recibe el evento `cocina:plato-actualizado` en â‰¤ 2s sin recargar pÃ¡gina.

### Implementation for User Story 4

- [X] T066 [US4] Create `src/modules/restaurante/application/cocina/listar-panel-cocina.usecase.ts` â€” returns reservas activas (CONFIRMADA | EN_PREPARACION) with their detalles; ordered by `fechaLlegada asc`; includes `estadoCocina` per Ã­tem
- [X] T067 [US4] Create `src/modules/restaurante/application/cocina/actualizar-estado-cocina.usecase.ts` â€” validates state machine: CHEF can transition `PENDIENTEâ†’EN_PREPARACIONâ†’LISTO`; MESERO can transition `LISTOâ†’ENTREGADO` only; updates `ReservaDetalle.estadoCocina`; logs state change in `PedidoEstadoLog` with `nota = "ITEM:${detalleId}:${estadoNuevo}"`; if all detalles ENTREGADO â†’ calls `cambiarEstadoReservaUseCase` with LISTA; emits `cocina:plato-actualizado` via notificador
- [X] T068 [US4] Create `src/modules/restaurante/adapters/cocina.rest.ts` â€” `GET /restaurante/cocina` (panel view), `PATCH /restaurante/cocina/items/:detalleId/estado`; CHEF join hook for Socket.IO room `tenant:${id}:cocina` on authenticated WS connection
- [ ] T069 [P] [US4] Update Socket.IO handshake handler to join users with role CHEF to room `tenant:${tenantId}:cocina` in addition to `tenant:${tenantId}:restaurante` â€” location: existing WS auth middleware in `src/infrastructure/socket/` or `src/modules/autenticacion/`

### Tests for User Story 4

- [ ] T070 [US4] Create `tests/restaurante/unit/application/actualizar-estado-cocina.usecase.test.ts` â€” CHEF success PENDIENTEâ†’EN_PREPARACION, `RolSinPermiso` for CHEF trying LISTOâ†’ENTREGADO, notificador spy asserts `platoCocinaActualizado` and auto-advance to LISTA when all items ENTREGADO

**Checkpoint**: Panel de cocina en tiempo real funcional. CHEF y MESERO coordinados.

---

## Phase 7: User Story 5 â€” PublicaciÃ³n AutomÃ¡tica en Redes (Priority: P3)

**Goal**: ADMIN programa publicaciÃ³n del menÃº del dÃ­a en Instagram y/o Facebook a una hora definida. El sistema genera PNG 1080Ã—1080, llama a la Graph API y registra el resultado. Fallos notifican al ADMIN.

**Independent Test**: Al crear una publicaciÃ³n con `fechaProgramada`, el job BullMQ se encola. Al ejecutar el worker manualmente, el PNG se genera, el estado cambia a `PUBLICADA` (o `FALLIDA` con error) y el historial refleja el resultado.

### Implementation for User Story 5

- [X] T071 [P] [US5] Create `src/modules/restaurante/domain/publicacion-rrss.entity.ts` â€” entity with state machine: `BORRADORâ†’PROGRAMADAâ†’PUBLICANDOâ†’PUBLICADA|FALLIDA`; `CANCELADA` only from PROGRAMADA; validates plataforma âˆˆ {INSTAGRAM, FACEBOOK}
- [X] T072 [P] [US5] Create `src/modules/restaurante/domain/ports/IPublicacionRRSSRepository.ts` with methods: `findAllByRestaurante(restauranteId, params)`, `findById(id)`, `create(data)`, `update(id, data)`, `findProgramadasPendientes()`
- [X] T073 [P] [US5] Create `src/modules/restaurante/domain/ports/IImagenGeneradorService.ts` â€” interface: `generarMenuPNG(menuId: string, items: MenuItem[]): Promise<Buffer>` â€” no infrastructure details in domain
- [X] T074 [US5] Create `src/modules/restaurante/infrastructure/publicacion-rrss.prisma.repository.ts` implementing `IPublicacionRRSSRepository`
- [X] T075 [US5] Create `src/modules/restaurante/infrastructure/imagen.satori.generador.ts` implementing `IImagenGeneradorService` â€” uses `satori` (JSX template with menu items) + `@resvg/resvg-js` to render PNG 1080Ã—1080; uploads to Cloudflare R2; returns public URL
- [X] T076 [P] [US5] Create `src/modules/restaurante/application/publicacion-rrss/listar-publicaciones.usecase.ts` â€” uses `makeQueryParamsSchema` (ArtÃ­culo IV); filterables: `redSocial`, `estado`
- [X] T077 [US5] Create `src/modules/restaurante/application/publicacion-rrss/programar-publicacion.usecase.ts` â€” validates menu is PUBLICADO, validates credentials configured in `Restaurante.configuracion`, creates `PublicacionMenuRRSS`, enqueues BullMQ delayed job with `delay = fechaProgramada - now()`
- [X] T078 [P] [US5] Create `src/modules/restaurante/application/publicacion-rrss/obtener-publicacion.usecase.ts`
- [X] T079 [US5] Create `src/modules/restaurante/application/publicacion-rrss/cancelar-publicacion.usecase.ts` â€” validates estado === PROGRAMADA (throws `PublicacionYaProcesada`); cancels BullMQ job by jobId; updates estado to CANCELADA
- [X] T080 [US5] Create `src/modules/restaurante/application/publicacion-rrss/ejecutar-publicacion.usecase.ts` â€” invoked by BullMQ worker: loads publicacion + menu items, calls `IImagenGeneradorService.generarMenuPNG`, calls Meta Graph API (Instagram or Facebook per `redSocial`), updates estado, schedules metrics refresh job for +1h; on any error: sets estado FALLIDA + errorMensaje + creates `Notificacion` for ADMIN
- [X] T081 [US5] Create `src/modules/restaurante/adapters/publicacion-rrss.rest.ts` â€” `GET|POST /restaurante/publicaciones`, `GET|DELETE /restaurante/publicaciones/:id`
- [X] T082 [US5] Create `src/modules/restaurante/infrastructure/publicacion-rrss.bullmq.worker.ts` â€” registers queue `restaurante-rrss`; job handler calls `EjecutarPublicacionUseCase`; configures `attempts: 3, backoff: { type: 'exponential', delay: 60000 }`; registers in Background Worker entry point

**Checkpoint**: PublicaciÃ³n automÃ¡tica funcional. Historia de publicaciones con mÃ©tricas disponible.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: IntegraciÃ³n final del router, OpenAPI export, validaciÃ³n end-to-end.

- [X] T083 Mount `restaurante.router.ts` in the main Hono app entry point (Web Service) and Background Worker entry point â€” location: `src/app.ts` or equivalent main router file
- [ ] T084 [P] Run `GET /api/spec` (or equivalent OpenAPI export command) and verify all restaurante endpoints appear in the OpenAPI spec with correct Zod schemas; fix any schema gaps
- [ ] T085 [P] Run quickstart scenarios from `specs/008-restaurante/quickstart.md` against the running server: Escenario 1 (configuraciÃ³n completa), Escenario 3 (tiempo real), Escenario 5 (caja no abierta), Escenario 6 (guard 403)
- [ ] T086 [P] Verify `SC-008`: confirm that a tenant with `esRestaurante=false` receives 403 on every `/restaurante/*` endpoint (unit test on the guard middleware)
- [X] T087 [P] Review and fix any TypeScript strict mode errors across all new files: run `pnpm tsc --noEmit` and resolve all errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies â€” can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 â€” BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2
- **US2 (Phase 4)**: Depends on Phase 2 + Phase 3 (perfil/tiempos needed for menu context)
- **US3 (Phase 5)**: Depends on Phase 4 (reservas reference menus and menu items)
- **US4 (Phase 6)**: Depends on Phase 5 (cocina panel is a view into reservas)
- **US5 (Phase 7)**: Depends on Phase 4 (publicaciÃ³n references menus); independent of US3/US4
- **Polish (Phase 8)**: Depends on all desired user stories complete

### User Story Dependencies

```
Phase 1 (Setup)
    â†“
Phase 2 (Foundational)
    â†“
Phase 3 (US1 â€” Perfil + Tiempos de Comida)
    â†“
Phase 4 (US2 â€” MenÃºs) â†â”€â”€â”€â”€ tambiÃ©n Phase 7 (US5 â€” RRSS) puede avanzar en paralelo aquÃ­
    â†“
Phase 5 (US3 â€” Reservas)
    â†“
Phase 6 (US4 â€” Panel Cocina)
    â†“
Phase 8 (Polish)
```

### Within Each Phase

- Tasks marked `[P]` within a phase can be executed in parallel
- Domain entities and ports (`[P]`) before repositories
- Repositories before use cases
- Use cases before adapters/REST
- Tests can be written alongside or immediately after implementation

### Parallel Opportunities

**Phase 2**: T003, T004, T005, T007, T008 all parallel  
**Phase 3**: T011, T012, T013, T014, T017, T018, T019, T020, T021, T022 all parallel  
**Phase 4**: T028, T029, T030, T031, T034, T035, T036, T037, T039, T040, T041 all parallel  
**Phase 5**: T047, T048, T049, T050, T054, T055, T058 all parallel  
**Phase 7**: T071, T072, T073, T076, T078 all parallel; T075 (imagen.satori) parallel with T074

---

## Parallel Example: User Story 3 (Reservas)

```bash
# Launch all parallel domain + ports together:
Task T047: reserva.entity.ts
Task T048: reserva-detalle.entity.ts
Task T049: IReservaRepository.ts
Task T050: IReservaDetalleRepository.ts

# Then parallel use cases after repos T051+T052:
Task T053: crear-reserva-publica.usecase.ts
Task T054: listar-reservas.usecase.ts
Task T055: obtener-reserva.usecase.ts
Task T058: listar-reservas-cliente.usecase.ts

# Tests parallel with implementation:
Task T061: reserva.entity.test.ts
Task T062: crear-reserva-publica.usecase.test.ts
Task T063: cambiar-estado-reserva.usecase.test.ts
Task T064: pagar-reserva.usecase.test.ts
```

---

## Implementation Strategy

### MVP First (User Stories 1â€“3 Only)

1. Complete Phase 1 + Phase 2 (Setup + Foundational)
2. Complete Phase 3 (US1 â€” Perfil y Tiempos)
3. Complete Phase 4 (US2 â€” MenÃºs)
4. Complete Phase 5 (US3 â€” Reservas)
5. **STOP and VALIDATE**: Flujo completo reserva â†’ pago â†’ venta en caja
6. Deploy/demo si listo

### Full Delivery

1. MVP (US1â€“US3) â†’ validar
2. Phase 6 (US4 â€” Panel Cocina) â†’ validar tiempo real
3. Phase 7 (US5 â€” RRSS) â†’ validar publicaciÃ³n automÃ¡tica
4. Phase 8 (Polish) â†’ TypeScript strict, OpenAPI export, quickstart validation

---

## Notes

- `[P]` = diferentes archivos, sin dependencias entre sÃ­ en la misma fase
- `[Story]` mapea cada tarea a su user story para trazabilidad
- Los tests de integraciÃ³n usan `describe.skipIf(!process.env.DATABASE_URL)` (no Testcontainers)
- Schema `70-restaurante.prisma` NO se modifica (instrucciÃ³n del usuario)
- El cross-module port `IRestauranteVentaService` sigue el patrÃ³n establecido en el mÃ³dulo consultorio (`IVentaService`)
- El Background Worker para BullMQ se registra en el proceso worker del build de Render (no en el Web Service)
- La generaciÃ³n de imagen (`imagen.satori.generador.ts`) es la Ãºnica tarea con dependencias externas nuevas (satori, @resvg/resvg-js instaladas en T002)
