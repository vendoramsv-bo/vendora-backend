# Tasks: Inventario de Productos y Almacén de Insumos

**Input**: Design documents from `specs/011-inventario-almacen/`  
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Contexto**: El módulo `almacen` ya existe con 49 archivos. Esta lista cubre únicamente el delta: 9 capacidades nuevas sobre la base existente. Los use cases de insumos, receta, notificador y listados se conservan sin cambios.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias incompletas)
- **[Story]**: User Story al que pertenece la tarea

---

## Phase 1: Setup — Migración de Schema

**Purpose**: Agregar los campos `version` y `motivo` necesarios para el bloqueo optimista y el patrón borrador-aprobación.

- [ ] T001 Modificar `prisma/40-almacen.prisma`: agregar `version Int @default(0)` a `AjusteInventario`, `RecuentoInventario`, `IngresoAlmacen` y `SalidaAlmacen`; agregar `motivo String?` a `SalidaAlmacen`
- [ ] T002 Ejecutar `npx prisma migrate dev --name inventario-version-motivo` y verificar que la migración se aplica sin errores

---

## Phase 2: Foundational — Errores de Dominio y Puertos

**Purpose**: Errores y contratos de puerto que TODOS los use cases nuevos necesitan. Debe completarse antes de cualquier user story.

**⚠️ CRÍTICO**: No puede comenzar ninguna user story hasta completar esta fase.

- [ ] T003 Modificar `src/modules/almacen/domain/almacen.errors.ts`: agregar `StockNegativoError(productoId, varianteId?)` HTTP 422, `ConflictoVersionError` HTTP 409, `DocumentoYaAprobadoError` HTTP 409, `DocumentoNoEncontradoError(tipo, id)` HTTP 404
- [ ] T004 [P] Modificar `src/modules/almacen/domain/ports/IInventarioProductoRepository.ts`: eliminar `registrarAjuste` y `registrarRecuento`; agregar `crearAjuste`, `obtenerAjuste`, `actualizarAjuste`, `aprobarAjuste`, `crearRecuento`, `obtenerRecuento`, `actualizarRecuento`, `aprobarRecuento`, `inicializarStockBulk(tenantId)`, `registrarMovimientoSalidaIdempotente`
- [ ] T005 [P] Modificar `src/modules/almacen/domain/ports/IIngresoAlmacenRepository.ts`: agregar `obtenerIngreso`, `actualizarIngreso`, `aprobarIngreso` (con verificación de idempotencia de MovimientoAlmacen). Modificar `src/modules/almacen/domain/ports/ISalidaAlmacenRepository.ts`: agregar `obtenerSalida`, `actualizarSalida`, `aprobarSalida`

**Checkpoint**: Compilación TypeScript limpia con puertos actualizados — user stories pueden comenzar en paralelo.

---

## Phase 3: User Story 1 — Stock de Productos y Variantes (Priority: P1) 🎯 MVP

**Goal**: Todos los productos/variantes del tenant tienen registro de stock desde el primer día; las ventas de Feature 006 descuentan stock automáticamente con idempotencia.

**Independent Test**: POST `/api/almacen/inventario/inicializar` → stock inicializado en todos los productos. Registrar venta en Feature 006 → aparece MovimientoInventario SALIDA con referenciaId=ventaId. Repetir la misma venta → solo UN movimiento existe (upsert idempotente).

- [ ] T006 Crear `src/modules/ventas/domain/ports/IAlmacenInventarioPort.ts`: interfaz con métodos `registrarSalidaVenta(ventaId, tenantId, detalles[])` y `inicializarProducto(tenantId, productoId, varianteId?)`
- [ ] T007 [P] [US1] Crear `src/modules/almacen/application/inventario/auto-inicializar-stock.usecase.ts`: obtiene todos los productos y variantes del tenant vía `IInventarioProductoRepository.inicializarStockBulk`; para cada ítem no inicializado, pone `inventarioActivado=true`, `cantidadStock=0` y registra MovimientoInventario CREACION; retorna `{ productosInicializados, variantesInicializadas }`
- [ ] T008 [P] [US1] Crear `src/modules/almacen/infrastructure/almacen-inventario.port.adapter.ts`: implementa `IAlmacenInventarioPort`; `registrarSalidaVenta` usa `inventario-producto.prisma.repository.registrarMovimientoSalidaIdempotente` (upsert en MovimientoInventario con `referenciaId=ventaId`); `inicializarProducto` inicializa un producto/variante individual
- [ ] T009 [US1] Modificar `src/modules/almacen/infrastructure/inventario-producto.prisma.repository.ts`: implementar `inicializarStockBulk` (iteración de productos/variantes del tenant con $transaction batch) y `registrarMovimientoSalidaIdempotente` (upsert via `@@unique` existente); implementar recálculo de `Producto.cantidadStock = SUM(ProductoVariante.cantidadStock)` como función privada `recalcularStockPadre(tx, productoId)`
- [ ] T010 [US1] Modificar `src/modules/ventas/application/venta/crear-venta.usecase.ts` y `src/modules/ventas/application/pedido/convertir-pedido-en-venta.usecase.ts`: inyectar `IAlmacenInventarioPort` como dependencia opcional; tras crear la venta, llamar `await almacenPort?.registrarSalidaVenta(venta.id, tenantId, detalles)` de forma fire-and-forget con manejo de errores que no bloquea la venta
- [ ] T011 [US1] Modificar `src/modules/almacen/adapters/inventario.rest.ts`: eliminar la ruta `POST /variantes/:varianteId/inicializar` y la importación de `InicializarVarianteUseCase`; agregar `POST /inventario/inicializar` (rol PROPIETARIO) que llama a `AutoInicializarStockUseCase`; eliminar archivo `src/modules/almacen/application/inventario/inicializar-variante.usecase.ts`
- [ ] T012 [US1] Crear `tests/almacen/unit/application/auto-inicializar-stock.usecase.test.ts`: verificar que inicializa todos los ítems no inicializados y omite los ya inicializados
- [ ] T013 [P] [US1] Modificar `src/modules/almacen/adapters/almacen.schema.ts`: agregar schema Zod vacío para `POST /inventario/inicializar` (body vacío); actualizar importaciones en los routers que referencian `InicializarVarianteSchema`

**Checkpoint**: POST /inventario/inicializar funciona; ventas generan movimientos SALIDA idempotentes; TypeScript compila sin errores.

---

## Phase 4: User Story 2 — Ajustes y Recuentos de Inventario (Priority: P2)

**Goal**: Los ajustes y recuentos se crean en borrador, pueden editarse, y al aprobarse aplican el stock de forma atómica con rechazo de negativo y bloqueo optimista.

**Independent Test**: Crear ajuste borrador → verificar stock sin cambio → aprobar → verificar stock actualizado y MovimientoInventario AJUSTE creado. Intentar aprobar con stock resultante negativo → 422 STOCK_NEGATIVO. Dos aprobaciones concurrentes con misma version → segunda recibe 409 CONFLICTO_VERSION.

- [ ] T014 [P] [US2] Crear `src/modules/almacen/application/inventario/crear-ajuste.usecase.ts`: valida detalles no vacíos; crea `AjusteInventario` con `estado=PENDIENTE, version=0`; retorna `{ ajusteId, estado, version, detalles }`
- [ ] T015 [P] [US2] Crear `src/modules/almacen/application/inventario/obtener-ajuste.usecase.ts`: obtiene `AjusteInventario` con detalles por id y tenantId; lanza `DocumentoNoEncontradoError` si no existe
- [ ] T016 [P] [US2] Crear `src/modules/almacen/application/inventario/actualizar-ajuste.usecase.ts`: verifica que el ajuste existe y está en `PENDIENTE`; lanza `DocumentoYaAprobadoError` si está `APROBADO`; actualiza motivo y/o detalles; retorna ajuste actualizado
- [ ] T017 [US2] Crear `src/modules/almacen/application/inventario/aprobar-ajuste.usecase.ts`: (1) obtiene ajuste con su `version`; (2) verifica que `input.version === ajuste.version`, si no: `ConflictoVersionError`; (3) verifica que no está `APROBADO`; (4) para cada detalle: carga stock actual y calcula resultado; si alguno < 0: `StockNegativoError(productoId, varianteId)`; (5) en `$transaction`: actualiza `cantidadStock` de variante, llama `recalcularStockPadre`, hace upsert de `MovimientoInventario` (tipo AJUSTE, referenciaId=ajusteId), marca ajuste como `APROBADO, version+1`; (6) emite eventos `stockCritico`/`stockNormalizado` via `IAlmacenNotificador`
- [ ] T018 [P] [US2] Crear `src/modules/almacen/application/inventario/crear-recuento.usecase.ts`: valida detalles no vacíos; captura `stockSistema` actual de cada variante en el momento de creación; crea `RecuentoInventario` con `estado=PENDIENTE, version=0` y detalles con `stockSistema`, `stockFisico` y `diferencia=stockFisico-stockSistema`
- [ ] T019 [P] [US2] Crear `src/modules/almacen/application/inventario/obtener-recuento.usecase.ts`: obtiene `RecuentoInventario` con detalles; lanza `DocumentoNoEncontradoError` si no existe
- [ ] T020 [P] [US2] Crear `src/modules/almacen/application/inventario/actualizar-recuento.usecase.ts`: verifica PENDIENTE; actualiza observacion y/o detalles (recaptura `stockSistema` actualizado para cada variante modificada); lanza `DocumentoYaAprobadoError` si APROBADO
- [ ] T021 [US2] Crear `src/modules/almacen/application/inventario/aprobar-recuento.usecase.ts`: misma estructura de aprobación que `aprobar-ajuste`; aplica la `diferencia` (stockFisico − stockSistema) como cantidad; si diferencia=0, no modifica stock pero sí marca APROBADO; registra MovimientoInventario tipo RECUENTO; recalcula stock padre si es variante; emite eventos
- [ ] T022 [US2] Refactorizar `src/modules/almacen/infrastructure/inventario-producto.prisma.repository.ts`: eliminar métodos `registrarAjuste` y `registrarRecuento`; implementar `crearAjuste`, `obtenerAjuste`, `actualizarAjuste`, `aprobarAjuste` (con `$transaction` atómico y `productoVariante.update + movimientoInventario.upsert + ajusteInventario.update`), `crearRecuento`, `obtenerRecuento`, `actualizarRecuento`, `aprobarRecuento`
- [ ] T023 [US2] Modificar `src/modules/almacen/adapters/inventario.rest.ts`: reemplazar `POST /ajustes` (que llamaba `RegistrarAjusteUseCase`) con rutas `POST /ajustes` (crear borrador), `GET /ajustes/:ajusteId`, `PATCH /ajustes/:ajusteId`, `POST /ajustes/:ajusteId/aprobar`; igual para recuentos; manejar errores `StockNegativoError` (422), `ConflictoVersionError` (409), `DocumentoYaAprobadoError` (409), `DocumentoNoEncontradoError` (404); eliminar importaciones de `RegistrarAjusteUseCase`, `RegistrarRecuentoUseCase`, `InicializarVarianteSchema`
- [ ] T024 [P] [US2] Modificar `src/modules/almacen/adapters/almacen.schema.ts`: agregar schemas Zod: `CrearAjusteSchema` (motivo?, detalles[{productoId, varianteId?, cantidadAjuste}]), `ActualizarAjusteSchema`, `AprobarDocumentoSchema` ({version: number}), `CrearRecuentoSchema` (observacion?, detalles[{productoId, varianteId?, stockFisico}]), `ActualizarRecuentoSchema`
- [ ] T025 [US2] Crear `tests/almacen/unit/application/aprobar-ajuste.usecase.test.ts`: casos: stock insuficiente → StockNegativoError; versión obsoleta → ConflictoVersionError; ya aprobado → DocumentoYaAprobadoError; aprobación exitosa → stock actualizado + movimiento creado + notificador llamado
- [ ] T026 [P] [US2] Crear `tests/almacen/unit/application/aprobar-recuento.usecase.test.ts`: casos: diferencia negativa que deja stock negativo → error; diferencia=0 → aprobado sin cambio de stock; aprobación exitosa con diferencia positiva y negativa

**Checkpoint**: Todos los endpoints de ajustes y recuentos (CRUD borrador + aprobación) funcionan; los tests de US2 pasan; TypeScript sin errores.

---

## Phase 5: User Story 3 — Gestión de Insumos del Almacén (Priority: P3)

**Goal**: El catálogo de insumos y la composición de productos ya está implementado. Esta fase conecta la auto-inicialización para nuevos productos y valida la alineación con el spec.

**Independent Test**: Crear insumo → aparece en listado. Definir composición de producto → puede consultarse. Stock de insumo cae bajo mínimo → señalizado como "stock crítico".

- [ ] T027 [US3] Modificar `src/modules/catalogo/adapters/` (el router o use case que crea productos y variantes): inyectar `IAlmacenInventarioPort` opcional; tras crear un producto o variante, llamar `almacenPort?.inicializarProducto(tenantId, productoId, varianteId?)` de forma fire-and-forget; esto implementa FR-021 (nuevos productos se inicializan automáticamente)
- [ ] T028 [P] [US3] Verificar que `src/modules/almacen/adapters/insumo.rest.ts` expone `GET /insumos/:insumoId/movimientos` usando `ListarMovimientosInsumoUseCase`; si no existe esta ruta, agregarla con la paginación estándar

**Checkpoint**: Nuevos productos creados en catálogo reciben stock=0 automáticamente; historial de movimientos de insumo accesible.

---

## Phase 6: User Story 4 — Ingresos y Salidas de Almacén (Priority: P4)

**Goal**: Los ingresos y salidas de almacén siguen el patrón borrador-aprobación: la creación no afecta el stock; solo la aprobación aplica cambios de forma atómica con rechazo de negativo.

**Independent Test**: Crear ingreso borrador → stock de insumo sin cambio → aprobar → stock incrementa + MovimientoAlmacen INGRESO creado. Crear salida borrador con cantidad > stock → aprobar → 422 STOCK_NEGATIVO_INSUMO. Aprobar mismo ingreso dos veces → segundo intento 409 DOCUMENTO_YA_APROBADO.

- [ ] T029 [US4] Refactorizar `src/modules/almacen/application/almacen/crear-ingreso.usecase.ts`: eliminar la validación de proveedor + incremento de stock + movimientos; ahora solo valida que los insumos existen en el tenant, crea `IngresoAlmacen` con `estado=PENDIENTE, version=0` y sus detalles, retorna `{ ingresoId, estado, version, detalles }` sin aplicar stock
- [ ] T030 [P] [US4] Crear `src/modules/almacen/application/almacen/obtener-ingreso.usecase.ts`: obtiene `IngresoAlmacen` con detalles e insumos; lanza `DocumentoNoEncontradoError` si no existe
- [ ] T031 [P] [US4] Crear `src/modules/almacen/application/almacen/actualizar-ingreso.usecase.ts`: verifica PENDIENTE; permite actualizar proveedor, descripcion, detalles; lanza `DocumentoYaAprobadoError` si APROBADO
- [ ] T032 [US4] Crear `src/modules/almacen/application/almacen/aprobar-ingreso.usecase.ts`: (1) obtiene ingreso + verifica version; (2) verifica PENDIENTE; (3) en `$transaction`: para cada detalle: incrementa `Insumo.cantidadStock`, hace upsert de `MovimientoAlmacen` (tipo INGRESO, referenciaId=ingresoId), marca ingreso APROBADO, version+1; (4) emite eventos `insumoStockNormalizado` via `IAlmacenNotificador` cuando corresponda
- [ ] T033 [US4] Refactorizar `src/modules/almacen/application/almacen/crear-salida.usecase.ts`: eliminar validación de stock + decremento + movimientos; ahora solo valida que los insumos existen, crea `SalidaAlmacen` con `estado=PENDIENTE, version=0, motivo` y sus detalles, retorna `{ salidaId, estado, version, detalles }` sin aplicar stock
- [ ] T034 [P] [US4] Crear `src/modules/almacen/application/almacen/obtener-salida.usecase.ts`: obtiene `SalidaAlmacen` con detalles; lanza `DocumentoNoEncontradoError` si no existe
- [ ] T035 [P] [US4] Crear `src/modules/almacen/application/almacen/actualizar-salida.usecase.ts`: verifica PENDIENTE; permite actualizar motivo y detalles; lanza `DocumentoYaAprobadoError` si APROBADO
- [ ] T036 [US4] Crear `src/modules/almacen/application/almacen/aprobar-salida.usecase.ts`: (1) obtiene salida + verifica version; (2) verifica PENDIENTE; (3) pre-check de stock: para cada insumo calcula `stockActual - cantidad`; si alguno < 0: `StockInsuficienteError` con identificación del insumo afectado; (4) en `$transaction`: decrementa `Insumo.cantidadStock`, hace upsert de `MovimientoAlmacen` (tipo SALIDA, referenciaId=salidaId), marca salida APROBADO, version+1; (5) emite eventos `insumoStockCritico` via `IAlmacenNotificador` cuando corresponda
- [ ] T037 [US4] Modificar `src/modules/almacen/infrastructure/ingreso-almacen.prisma.repository.ts`: refactorizar `create` (ya no aplica stock); implementar `obtenerIngreso`, `actualizarIngreso`, `aprobarIngreso` (con `$transaction` atómico: `insumo.update` + `movimientoAlmacen.upsert` + `ingresoAlmacen.update`)
- [ ] T038 [US4] Modificar `src/modules/almacen/infrastructure/salida-almacen.prisma.repository.ts`: misma estructura que ingreso; implementar `obtenerSalida`, `actualizarSalida`, `aprobarSalida` con verificación de stock negativo a nivel de repositorio
- [ ] T039 [US4] Modificar `src/modules/almacen/adapters/almacen-operaciones.rest.ts`: agregar `GET /ingresos/:ingresoId`, `PATCH /ingresos/:ingresoId`, `POST /ingresos/:ingresoId/aprobar`; agregar `GET /salidas/:salidaId`, `PATCH /salidas/:salidaId`, `POST /salidas/:salidaId/aprobar`; manejar errores nuevos; actualizar `POST /ingresos` y `POST /salidas` para que ya no llamen a la lógica de stock directamente (solo crean borrador)
- [ ] T040 [P] [US4] Modificar `src/modules/almacen/adapters/almacen.schema.ts`: agregar `CrearSalidaSchema` con campo `motivo String`, `ActualizarIngresoSchema`, `ActualizarSalidaSchema`; schemas de aprobación (`AprobarDocumentoSchema` ya existe de T024)
- [ ] T041 [US4] Crear `tests/almacen/unit/application/aprobar-ingreso.usecase.test.ts`: verificar atomicidad, idempotencia del movimiento (upsert), emisión de evento normalizado
- [ ] T042 [P] [US4] Crear `tests/almacen/unit/application/aprobar-salida.usecase.test.ts`: stock insuficiente → StockInsuficienteError; versión obsoleta → ConflictoVersionError; aprobación exitosa → stock decrementado + movimiento upsert + evento crítico emitido

**Checkpoint**: Ingresos y salidas de almacén siguen el patrón borrador-aprobación completo; tests de US4 pasan.

---

## Phase 7: User Story 5 — Alertas de Stock en Tiempo Real (Priority: P5)

**Goal**: Los eventos de stock crítico/normalizado se emiten correctamente desde los use cases de aprobación, aislados por tenant.

**Independent Test**: Aprobar ajuste que lleva producto a stock crítico → dos clientes del mismo tenant reciben `almacen:stock-critico` en < 2s. Cliente de otro tenant no recibe el evento.

- [ ] T043 [US5] Verificar que `aprobar-ajuste.usecase.ts` y `aprobar-recuento.usecase.ts` llaman a `IAlmacenNotificador.stockCritico` y `stockNormalizado` para cada variante afectada (usando `evaluar-stock-critico.ts` existente); agregar las llamadas si faltan
- [ ] T044 [P] [US5] Verificar que `aprobar-ingreso.usecase.ts` y `aprobar-salida.usecase.ts` llaman a `IAlmacenNotificador.insumoStockCritico` y `insumoStockNormalizado` para cada insumo afectado; agregar las llamadas si faltan
- [ ] T045 [P] [US5] Verificar en `src/modules/almacen/infrastructure/almacen.socket.notificador.ts` que los eventos usan `io.to(\`tenant:${tenantId}\`)` — confirmar aislamiento por tenant (ya existe en el notificador; verificar que los 4 eventos nuevos usan el mismo patrón)

**Checkpoint**: Escenarios 8 del quickstart.md pasan; eventos llegan en < 2s solo a usuarios del mismo tenant.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T046 Ejecutar `npx tsc --noEmit` en el repositorio y resolver todos los errores de tipo resultantes del refactor (interfaces de repositorios actualizadas)
- [ ] T047 [P] Eliminar archivos obsoletos: `src/modules/almacen/application/inventario/registrar-ajuste.usecase.ts`, `src/modules/almacen/application/inventario/registrar-recuento.usecase.ts`, `src/modules/almacen/application/inventario/inicializar-variante.usecase.ts`
- [ ] T048 [P] Ejecutar todos los tests existentes del módulo `almacen` (`npx vitest run tests/almacen/`) y verificar que no se rompen los tests previos
- [ ] T049 Validar escenarios del `quickstart.md` manualmente (escenarios 1–10) contra el servidor en ejecución
- [ ] T050 Actualizar `specs/011-inventario-almacen/checklists/requirements.md` marcando todos los ítems como completados

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** (Schema): Sin dependencias — empezar inmediatamente
- **Phase 2** (Foundational): Depende de Phase 1 — **bloquea todas las user stories**
- **Phase 3** (US1): Depende de Phase 2
- **Phase 4** (US2): Depende de Phase 2; puede ejecutarse en paralelo con US1
- **Phase 5** (US3): Depende de Phase 3 (necesita `IAlmacenInventarioPort`)
- **Phase 6** (US4): Depende de Phase 2; puede ejecutarse en paralelo con US1 y US2
- **Phase 7** (US5): Depende de Phase 4 y Phase 6 (los use cases de aprobación deben existir)
- **Phase 8** (Polish): Depende de todas las fases anteriores

### User Story Dependencies

- **US1 (P1)**: Puede comenzar tras Phase 2 — sin dependencias de otras US
- **US2 (P2)**: Puede comenzar tras Phase 2 — sin dependencias de otras US
- **US3 (P3)**: Depende de US1 (IAlmacenInventarioPort debe existir)
- **US4 (P4)**: Puede comenzar tras Phase 2 — sin dependencias de otras US
- **US5 (P5)**: Depende de US2 y US4 (los use cases de aprobación)

### Parallelismo dentro de cada User Story

**US2** — máximo paralelismo:
- T014, T015, T016, T018, T019, T020 [todos P] pueden ejecutarse en paralelo
- T017 y T021 (aprobar) dependen de T014-T016 y T018-T020 respectivamente
- T024 [P] (schemas Zod) puede ejecutarse en paralelo con las implementaciones
- T025 y T026 (tests) pueden ejecutarse en paralelo entre sí

**US4** — máximo paralelismo:
- T030, T031, T034, T035 [todos P] pueden ejecutarse en paralelo
- T032 (aprobar-ingreso) depende de T029-T031
- T036 (aprobar-salida) depende de T033-T035
- T041 y T042 (tests) pueden ejecutarse en paralelo

---

## Parallel Example: User Story 2 (Ajustes y Recuentos)

```bash
# Lanzar en paralelo — archivos distintos, sin dependencias entre sí:
Task T014: crear-ajuste.usecase.ts
Task T015: obtener-ajuste.usecase.ts
Task T016: actualizar-ajuste.usecase.ts
Task T018: crear-recuento.usecase.ts
Task T019: obtener-recuento.usecase.ts
Task T020: actualizar-recuento.usecase.ts
Task T024: schemas Zod nuevos en almacen.schema.ts

# Luego (dependen de los anteriores):
Task T017: aprobar-ajuste.usecase.ts
Task T021: aprobar-recuento.usecase.ts
Task T022: refactor inventario-producto.prisma.repository.ts

# Luego:
Task T023: actualizar inventario.rest.ts

# En paralelo con T023:
Task T025: tests aprobar-ajuste
Task T026: tests aprobar-recuento
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Schema migration
2. Completar Phase 2: Foundational — puertos y errores
3. Completar Phase 3: US1 — auto-init + ventas integration
4. **PARAR Y VALIDAR**: Quickstart escenario 1 + escenario 9
5. Stock funciona para todos los productos; ventas descuentan inventario

### Incremental Delivery

1. Phase 1 + 2 → Schema + puertos listos
2. US1 → Stock inicializado; ventas integradas con movimientos SALIDA (MVP)
3. US2 → Ajustes y recuentos con borrador-aprobación (correcciones formales)
4. US3 → Auto-init para nuevos productos
5. US4 → Ingresos y salidas de almacén con borrador-aprobación
6. US5 → Alertas tiempo real conectadas a las aprobaciones
7. Polish → Limpieza y validación completa

---

## Notes

- **Total de tareas**: 50 (T001–T050)
- **Tareas por user story**: US1=8, US2=13, US3=2, US4=14, US5=3, Polish=5, Foundational=5, Setup=2
- **Oportunidades de paralelismo**: 22 tareas marcadas [P]
- [P] = archivos distintos, sin dependencias de tareas incompletas
- [Story] label mapea a user stories del spec.md
- Cada US es independientemente completable y testeable
- Los use cases existentes (insumos, receta, notificador, listados) no se tocan
- **Eliminar archivos obsoletos solo en Phase 8** (T047) para no romper compilación durante el desarrollo
- El campo `version` en la respuesta de aprobación permite que el cliente actualice su estado local sin hacer un GET adicional
