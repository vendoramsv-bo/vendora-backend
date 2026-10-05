# Tasks: Movimientos de inventario de productos con y sin variante

**Input**: Design documents from `specs/027-movimientos-producto-sin-variante/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/movimientos-y-ventas.md, quickstart.md

**Tests**: SÍ. FR-009 exige pruebas de integración con producto **sin** variante, y el plan
(Constitution VIII.1/VIII.2) pide unit con fakes y tests de repositorio contra PostgreSQL real
(`describe.skipIf(!process.env.DATABASE_URL)`, patrón de `tests/consultorio/integration/paciente.prisma.repository.test.ts`).

**Organization**: por historia de usuario. US1 y US2 son P1; US3 y US4 son P2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizable (otro archivo, sin dependencias pendientes)
- **[Story]**: historia a la que pertenece (US1…US4)

## Notas transversales (leer antes de empezar)

- **Logger**: el patrón de los módulos es `import pino from "pino"` + `const logger = pino({ level: process.env.LOG_LEVEL ?? "info" })` (ver `src/modules/almacen/infrastructure/almacen.socket.notificador.ts:9-11`). `ventas` no debe importar `almacen` (Constitution II).
- **Convención de `cantidad`** (FR-007): `cantidad = stockDespues − stockAntes`, la calcula el helper; ningún llamador la pasa.
- **Idempotencia** (FR-003): en toda operación, primero `registrarMovimiento`, y **solo si `insertado`** se toca el stock.
- `src/modules/almacen/infrastructure/inventario-producto.prisma.repository.ts` se edita en US1, US2 y US3: esas tareas son secuenciales entre sí (no [P]).
- **Desvío del plan**: `ConvertirPedidoEnVentaUseCase` recibe `IPedidoRepository`, no `IVentaRepository`. Para aplicar FR-008 ahí, `productosQueRequierenVariante` se agrega también a `IPedidoRepository` (T013). Los tests unit siguen la convención plana existente `tests/unit/*.test.ts` en vez de `tests/unit/modules/ventas/`.

---

## Phase 1: Setup (migración)

**Purpose**: que la base garantice la unicidad del movimiento también con `varianteId` nulo.

- [X] T001 Crear `prisma/migrations/20261005000000_movimiento_inventario_nulls_not_distinct/migration.sql` con: `DROP INDEX "almacen"."MovimientoInventario_tenantId_productoId_varianteId_tipo_re_key";` y `CREATE UNIQUE INDEX "MovimientoInventario_tenantId_productoId_varianteId_tipo_re_key" ON "almacen"."MovimientoInventario" ("tenantId", "productoId", "varianteId", "tipo", "referenciaId") NULLS NOT DISTINCT;` (mismo nombre, para que Prisma siga reconociendo el `@@unique`). Verificar antes el nombre exacto del índice en la migración que creó la tabla (`grep -rn "MovimientoInventario_tenantId_productoId" prisma/migrations`)
- [X] T002 [P] En `prisma/40-almacen.prisma:31`, agregar sobre `@@unique([tenantId, productoId, varianteId, tipo, referenciaId])` un comentario `///` que diga que la restricción es `NULLS NOT DISTINCT` en la base (migración `20261005000000_movimiento_inventario_nulls_not_distinct`) y que Prisma no lo modela
- [X] T003 Aplicar la migración en la base de desarrollo (`pnpm prisma migrate deploy`), regenerar el cliente (`pnpm prisma generate`) y confirmar que `pnpm prisma migrate diff --from-schema-datasource prisma --to-schema-datamodel prisma --exit-code` no reporta drift

---

## Phase 2: Foundational (bloquea a todas las historias)

**Purpose**: el helper único de escritura y el andamiaje del test de integración.

- [X] T004 Crear `src/modules/almacen/infrastructure/movimiento-inventario.writer.ts` con `export async function registrarMovimiento(tx, datos: { tenantId; productoId; varianteId: string | null; etiquetaVariante?: string | null; tipo: "CREACION" | "ENTRADA" | "SALIDA" | "AJUSTE" | "RECUENTO"; stockAntes: number; stockDespues: number; motivo?: string | null; referenciaId: string; createdById?: string | null }): Promise<{ insertado: boolean }>`. Implementación: `const { count } = await tx.movimientoInventario.createMany({ data: [{ ...datos, cantidad: datos.stockDespues - datos.stockAntes }], skipDuplicates: true })` y `return { insertado: count === 1 }`. Tipar `tx` como `Prisma.TransactionClient` (o el tipo que ya use el repositorio para `tx`). Comentario breve: por qué no `upsert` (Prisma rechaza `null` en el `where` de la clave compuesta) y que la idempotencia depende de `NULLS NOT DISTINCT`
- [X] T005 Crear `tests/integration/almacen/movimientos-sin-variante.test.ts` con el andamiaje: `const hasDb = !!process.env.DATABASE_URL`, `describe.skipIf(!hasDb)`, cliente Prisma con `PrismaPg` como en `tests/consultorio/integration/paciente.prisma.repository.test.ts:26-30`; `beforeAll` que crea un tenant propio, un producto simple (sin variantes) y un producto con una variante `inventarioActivado: true`; helpers `stockDe(productoId, varianteId?)` y `movimientosDe(referenciaId)`; `afterAll` que borra en orden movimientos, detalles de ajuste/recuento, ajustes, recuentos, variantes, productos y tenant. Instanciar `InventarioProductoPrismaRepository` y `AlmacenInventarioPortAdapter` contra ese cliente
- [X] T006 [P] Agregar un test del helper en `tests/integration/almacen/movimientos-sin-variante.test.ts` (bloque `describe("registrarMovimiento")`): con `varianteId: null`, la primera llamada devuelve `insertado: true` y la segunda con la misma `(tipo, referenciaId)` devuelve `insertado: false` y deja una sola fila; `cantidad` = `stockDespues − stockAntes`

**Checkpoint**: helper probado contra la base real; las historias pueden empezar.

---

## Phase 3: User Story 1 — Una venta descuenta stock y deja su movimiento (Priority: P1) 🎯 MVP

**Goal**: cada línea de venta (producto simple o variante) descuenta stock una sola vez y deja su SALIDA; los fallos quedan en el log; una línea sin variante de un producto con variantes se rechaza con 422.

**Independent Test**: vender un producto simple y una variante; consultar stock y movimientos; repetir la salida para la misma venta y verificar que nada cambia.

### Tests for User Story 1

- [X] T007 [US1] En `tests/integration/almacen/movimientos-sin-variante.test.ts`, bloque `describe("salida por venta")`, cubrir los escenarios 1–4 de US1 llamando a `adapter.registrarSalidaVenta(ventaId, tenantId, detalles)`: (1) producto simple stock 10, venta de 3 → stock 7 y SALIDA con `cantidad -3`, `stockAntes 10`, `stockDespues 7`, `referenciaId = ventaId`, `varianteId null`; (2) variante stock 5, venta de 2 → variante 3, padre recalculado, SALIDA con `varianteId`; (3) venta mixta → dos movimientos; (4) repetir la misma llamada → stock y cantidad de movimientos sin cambios; además, venta que deja stock negativo registra `stockDespues` negativo
- [X] T008 [P] [US1] Crear `tests/unit/crear-venta-variante.usecase.test.ts` con fakes (`tests/helpers/fake-venta.repository.ts`, fake de caja/notificador/puerto de almacén): (a) línea sin `varianteId` de un producto devuelto por `productosQueRequierenVariante` → lanza `VarianteRequeridaError` con esos `productoIds` y **no** llama a `repo.crear`; (b) líneas válidas → `registrarSalidaVenta` se llama y se espera (`await`); (c) si `registrarSalidaVenta` rechaza, `execute` igual devuelve la venta (no relanza)
- [X] T009 [P] [US1] En `tests/unit/convertir-pedido-en-venta.usecase.test.ts`, agregar los mismos tres casos que T008 para `ConvertirPedidoEnVentaUseCase` usando `tests/helpers/fake-pedido.repository.ts`

### Implementation for User Story 1

- [X] T010 [US1] Reescribir `registrarMovimientoSalidaIdempotente` en `src/modules/almacen/infrastructure/inventario-producto.prisma.repository.ts` (~línea 624): dentro de `$transaction`, por cada detalle: (1) leer el stock con `tx.$queryRaw` `SELECT "cantidadStock" FROM "catalogo"."ProductoVariante" WHERE id = $1 AND … FOR UPDATE` (variante, filtrando tenant vía su producto) o `SELECT "cantidadStock" FROM "catalogo"."Producto" WHERE id = $1 AND "tenantId" = $2 FOR UPDATE` (simple) — confirmar los nombres de schema/tabla en `prisma/*.prisma`; si no hay fila, lanzar un `Error` con productoId/varianteId; (2) `registrarMovimiento(tx, { tipo: "SALIDA", stockAntes, stockDespues: stockAntes - cantidad, referenciaId: ventaId, varianteId: d.varianteId ?? null, etiquetaVariante })`; (3) solo si `insertado`: `decrement` del stock (variante o producto, `where` con `tenantId`) y, si es variante, `this.recalcularStockPadre(tx, productoId)`. Quitar el `upsert`
- [X] T011 [US1] En `src/modules/almacen/infrastructure/almacen-inventario.port.adapter.ts`, envolver `registrarSalidaVenta` e `inicializarProducto` en `try/catch` que haga `logger.error({ err, tenantId, ventaId | productoId, detalles: [{ productoId, varianteId }] }, "[almacen] registrarSalidaVenta falló")` (o `"[almacen] inicializarProducto falló"`) y **relance**. Logger según las notas transversales
- [X] T012 [P] [US1] Agregar `VarianteRequeridaError` en `src/modules/ventas/domain/ventas.errors.ts` siguiendo el patrón de las clases existentes: `code = "VARIANTE_REQUERIDA"`, `statusCode = 422`, `readonly productoIds: string[]`, mensaje que diga que esos productos tienen variantes y la línea debe indicar cuál
- [X] T013 [P] [US1] Declarar `productosQueRequierenVariante(tenantId: string, productoIds: string[]): Promise<string[]>` en `src/modules/ventas/domain/ports/IVentaRepository.ts` y en `src/modules/ventas/domain/ports/IPedidoRepository.ts`, con comentario: "productos de la lista con al menos una variante en estado ACTIVO"
- [X] T014 [US1] Implementar `productosQueRequierenVariante` en `src/modules/ventas/infrastructure/venta.prisma.repository.ts` y en `src/modules/ventas/infrastructure/pedido.prisma.repository.ts`: si `productoIds` está vacío devolver `[]`; si no, `producto.findMany({ where: { tenantId, id: { in: productoIds }, variantes: { some: { estado: "ACTIVO" } } }, select: { id: true } })` → ids. Confirmar el nombre de la relación y del enum de estado en `prisma/*.prisma`
- [X] T015 [P] [US1] Implementar `productosQueRequierenVariante` en los fakes `tests/helpers/fake-venta.repository.ts` y `tests/helpers/fake-pedido.repository.ts` (configurable, por defecto `[]`)
- [X] T016 [US1] En `src/modules/ventas/application/venta/crear-venta.usecase.ts`: antes de `repo.crear`, calcular los `productoId` de las líneas sin `varianteId`, llamar a `repo.productosQueRequierenVariante` y lanzar `VarianteRequeridaError(ids)` si devuelve alguno. Reemplazar el `.catch(() => {})` de la línea 84 por `try { await this.almacenPort.registrarSalidaVenta(...) } catch { /* ya logueado en el adaptador; la venta ya existe y un 500 provocaría un reintento duplicado */ }`
- [X] T017 [US1] En `src/modules/ventas/application/pedido/convertir-pedido-en-venta.usecase.ts`: después de los chequeos de pedido (línea 31) validar `pedido.detalles` con `this.repo.productosQueRequierenVariante` y lanzar `VarianteRequeridaError` antes de `convertirEnVenta`; reemplazar el `.catch(() => {})` de la línea 60 por `await` dentro de `try/catch` que no relanza, igual que T016
- [X] T018 [US1] En `src/modules/ventas/adapters/venta.rest.ts`, en el handler de creación (bloque con `CajaYaCerradaError` ~línea 194): `if (err instanceof VarianteRequeridaError) return c.json({ error: err.code, message: err.message, productoIds: err.productoIds }, 422)`, y declarar la respuesta 422 en el `createRoute` de esa ruta con ese cuerpo
- [X] T019 [US1] En `src/modules/ventas/adapters/pedido.rest.ts`, en el handler de conversión (~línea 176), mapear `VarianteRequeridaError` a 422 con el mismo cuerpo que T018 y declararlo en su `createRoute`

**Checkpoint**: T007, T008, T009 pasan. US1 funciona sola (MVP).

---

## Phase 4: User Story 2 — Ajustes y recuentos de productos sin variante se aprueban (Priority: P1)

**Goal**: aprobar un ajuste o recuento con productos simples aplica el stock y deja el movimiento, todo en una transacción.

**Independent Test**: aprobar un ajuste +5 y un recuento con stock físico 9 sobre un producto simple; verificar stock y movimientos.

### Tests for User Story 2

- [X] T020 [US2] En `tests/integration/almacen/movimientos-sin-variante.test.ts`, bloque `describe("ajuste y recuento")`, usando `repo.crearAjuste` / `repo.aprobarAjuste` y `repo.crearRecuento` / `repo.aprobarRecuento`: (1) simple stock 7, ajuste +5 aprobado → 12 y AJUSTE con `cantidad 5`, `referenciaId = ajusteId`; (2) recuento con stock físico 9 → 9 y RECUENTO con `cantidad -3`; (3) ajuste mixto (simple + variante) → ambos aplicados; además forzar un fallo en la segunda línea (p. ej. variante de otro tenant o id inexistente) y verificar que la primera **no** se aplicó

### Implementation for User Story 2

- [X] T021 [US2] En `aprobarAjuste` de `src/modules/almacen/infrastructure/inventario-producto.prisma.repository.ts` (~línea 183): reemplazar `tx.movimientoInventario.upsert` por `registrarMovimiento(tx, { tipo: "AJUSTE", referenciaId: ajusteId, varianteId: d.varianteId ?? null, stockAntes, stockDespues, motivo, createdById })` y mover la actualización de stock de esa línea a **después**, solo si `insertado`. Conservar el pre-chequeo de `estado`/`version` y el recálculo del padre
- [X] T022 [US2] En `aprobarRecuento` del mismo archivo (~línea 396): mismo cambio con `tipo: "RECUENTO"` y `referenciaId: recuentoId`

**Checkpoint**: T020 pasa; US1 sigue pasando.

---

## Phase 5: User Story 3 — Inicializar el stock de un producto sin variante (Priority: P2)

**Goal**: inicializar (individual y masivo) deja un CREACION por producto simple, sin pisar su stock, y es idempotente.

**Independent Test**: crear un producto simple y consultar sus movimientos; correr la inicialización masiva dos veces.

### Tests for User Story 3

- [X] T023 [US3] En `tests/integration/almacen/movimientos-sin-variante.test.ts`, bloque `describe("inicialización")`: (1) `repo.inicializarProductoIndividual(tenantId, productoSimpleId)` → exactamente un CREACION con `referenciaId = init-<productoId>`, `cantidad 0`; (2) producto simple con stock 7 → `inicializarStockBulk` no lo cambia; (3) correr `inicializarStockBulk` dos veces → la segunda no crea movimientos; (4) variante con `inventarioActivado: false` → queda activada, stock 0 y con su CREACION; (5) el producto padre de variantes no recibe CREACION

### Implementation for User Story 3

- [X] T024 [US3] Reescribir `inicializarProductoIndividual` en `src/modules/almacen/infrastructure/inventario-producto.prisma.repository.ts` (~línea 543), dentro de una `$transaction`: **rama variante** — buscar con `inventarioActivado: false` (como hoy), activar + `cantidadStock: 0`, `registrarMovimiento(tx, { tipo: "CREACION", referenciaId: \`init-${varianteId}\`, stockAntes: 0, stockDespues: 0 })`; **rama producto** — buscar `{ id: productoId, tenantId, variantes: { none: {} } }` (sin `inventarioActivado`), si no existe salir; `registrarMovimiento(tx, { tipo: "CREACION", referenciaId: \`init-${productoId}\`, varianteId: null, stockAntes: stock, stockDespues: stock })`. **No** actualizar `cantidadStock` del producto
- [X] T025 [US3] Reescribir `inicializarStockBulk` en el mismo archivo (~línea 458): productos = `producto.findMany({ where: { tenantId, variantes: { none: {} } } })`; variantes = las de `inventarioActivado: false` (como hoy). Productos: solo `registrarMovimiento` CREACION con `stockAntes = stockDespues = cantidadStock`, contar como inicializados los `insertado`. Variantes: igual que la rama de T024. Quitar los `upsert` y el `cantidadStock: 0` sobre productos. Mantener la forma de `InicializarBulkResultado`
- [X] T026 [P] [US3] En `src/modules/catalogo/adapters/producto.rest.ts` líneas 197 y 521, reemplazar `.catch(() => {})` por `.catch((err) => logger.error({ err, tenantId, productoId, varianteId }, "[catalogo] inicializarProducto falló"))`, con el logger según las notas transversales

**Checkpoint**: T023 pasa; US1 y US2 siguen pasando.

---

## Phase 6: User Story 4 — Un solo camino descuenta el stock de una venta (Priority: P2)

**Goal**: `confirmar` deja de mover stock de productos/variantes y de escribir `MovimientoInventario`.

**Independent Test**: registrar una venta en espera de pago, confirmarla, y verificar que el stock bajó una sola vez.

### Tests for User Story 4

- [X] T027 [US4] En `tests/integration/almacen/movimientos-sin-variante.test.ts`, bloque `describe("confirmar no descuenta")`: crear una venta `PENDIENTE` (o el estado de espera que use el dominio) con `VentaPrismaRepository.crear`, ejecutar la salida con el adaptador, luego `ventaRepo.confirmar(id, tenantId)` → el stock no cambia y sigue habiendo un solo movimiento SALIDA para esa venta. Requiere crear en `beforeAll` lo mínimo que exija `Venta` (punto de venta, turno, caja, miembro); si es demasiado acoplado, mover este caso a un test de repositorio aparte en el mismo archivo con su propio fixture
- [X] T028 [P] [US4] Revisar `tests/unit/confirmar-venta.usecase.test.ts` y quitar/ajustar cualquier aserción sobre la advertencia "sin inventario activado" o sobre descuento de stock

### Implementation for User Story 4

- [X] T029 [US4] En `confirmar` de `src/modules/ventas/infrastructure/venta.prisma.repository.ts` (~líneas 123-204): eliminar el bloque que lee la variante, decrementa su stock, escribe `tx.movimientoInventario.create` y agrega la advertencia "sin inventario activado". Conservar el descuento de insumos de receta (research §7, fuera de alcance), el cambio de `estadoPago` y la caja. `advertencias` sigue en la respuesta (puede quedar con las advertencias de insumos o vacía). Agregar un comentario: el stock de productos/variantes se descuenta al registrar la venta (puerto de almacén), spec 027

**Checkpoint**: todas las historias pasan.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T030 [P] Documentar la convención de `cantidad` (delta con signo, `stockDespues − stockAntes`, SALIDA negativa) en la `description` del campo `cantidad` del schema OpenAPI de movimientos en `src/modules/almacen/adapters/` (buscar el schema que usa `GET /api/almacen/movimientos` y `…/variantes/{id}/movimientos`)
- [X] T031 [P] Revisar `confirmar` de `src/modules/ventas/infrastructure/compra.prisma.repository.ts:266-321` (escribe ENTRADA con `movimientoInventario.create` y `cantidad` positiva = delta, sin `upsert`): confirmar que no tiene el defecto de `null` y que cumple la convención; si escribe `cantidad` que no sea `stockDespues − stockAntes`, migrarlo a `registrarMovimiento`. Corregir la fila ENTRADA de `data-model.md` si compras sí mueve stock de variantes
- [X] T032 Verificar que no quedan `movimientoInventario.upsert` ni `inventarioActivado` sobre `Producto` en `src/` (`grep -rn "movimientoInventario.upsert" src` vacío) ni `.catch(() => {})` en `crear-venta.usecase.ts`, `convertir-pedido-en-venta.usecase.ts` y `producto.rest.ts`
- [X] T033 Correr `pnpm tsc --noEmit` y `pnpm vitest run` (unit) sin errores; correr `DATABASE_URL=… pnpm vitest run tests/integration/almacen/movimientos-sin-variante.test.ts` contra la base de desarrollo migrada
- [ ] T034 Ejecutar la validación manual de `specs/027-movimientos-producto-sin-variante/quickstart.md` (pasos 1–8), incluido el log `[almacen] registrarSalidaVenta falló` del paso 8 (SC-005). Antes de desplegar, confirmar en `vendora-frontend` que el POS envía `varianteId` para productos con variantes (research §8, riesgo de 422)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001–T003)**: sin dependencias. T003 depende de T001.
- **Foundational (T004–T006)**: depende de Setup. Bloquea todas las historias.
- **US1 (T007–T019)**: depende de Foundational.
- **US2 (T020–T022)**: depende de Foundational. Independiente de US1 en comportamiento, pero edita el mismo repositorio que T010 → hacerla después de T010 para evitar conflictos.
- **US3 (T023–T026)**: depende de Foundational; mismo archivo que US1/US2 (T024, T025 secuenciales tras T022).
- **US4 (T027–T029)**: depende de US1 (el único camino que queda es el de T010/T016). T029 edita `venta.prisma.repository.ts`, igual que T014 → después de T014.
- **Polish (T030–T034)**: después de todas las historias.

### Within each story

- Tests primero (deben fallar), luego implementación.
- US1: T012, T013 → T014, T015 → T016, T017 → T018, T019. T010 → T011 en paralelo con la cadena de `ventas`.

### Story completion order

```
Setup → Foundational → US1 (MVP) → US2 → US3 → US4 → Polish
```

## Parallel Opportunities

- T002 en paralelo con T001.
- T006 en paralelo con cualquier tarea que no toque el test de integración.
- US1: T008, T009, T012, T013, T015 en paralelo (archivos distintos). T010–T011 (almacén) en paralelo con T012–T019 (ventas).
- US3: T026 (`producto.rest.ts`) en paralelo con T024–T025.
- US4: T028 en paralelo con T027.
- Polish: T030 y T031 en paralelo.

### Parallel example: User Story 1

```bash
# Rama almacén y rama ventas a la vez:
Task: "T010 Reescribir registrarMovimientoSalidaIdempotente en inventario-producto.prisma.repository.ts"
Task: "T012 Agregar VarianteRequeridaError en ventas.errors.ts"
Task: "T013 Declarar productosQueRequierenVariante en IVentaRepository.ts e IPedidoRepository.ts"
Task: "T008 Crear tests/unit/crear-venta-variante.usecase.test.ts"
Task: "T009 Extender tests/unit/convertir-pedido-en-venta.usecase.test.ts"
```

## Implementation Strategy

### MVP (US1)

1. Setup + Foundational (T001–T006): migración y helper probados contra la base.
2. US1 (T007–T019): la venta descuenta y registra; el defecto reportado queda resuelto.
3. Validar con T007–T009 y con los pasos 3–6 y 8 del quickstart. Desplegable.

### Incremental

- + US2: permite reparar a mano el stock de productos simples (recuento recomendado tras desplegar).
- + US3: historial con punto de partida; `/inicializar` deja de responder 500.
- + US4: desarma el doble descuento de `confirmar`.
- Polish: contrato documentado, verificación y validación manual.
