# Feature Specification: Movimientos de inventario de productos con y sin variante

**Feature Branch**: `027-movimientos-producto-sin-variante`
**Created**: 2026-10-05
**Status**: Draft
**Input**: Defecto reportado desde el frontend: se registró la venta `cmuvno8xj0002gsdnanas5hf1` (1 × "Coca-cola original 300 ml", producto sin variantes) y no existe ningún movimiento de inventario del producto vendido. El stock tampoco bajó. Al revisarlo apareció que el defecto no es de esa venta: **la tabla `almacen.MovimientoInventario` está vacía por completo** en el tenant, aunque hay 26 ventas, productos creados y ajustes intentados.

## Resumen

Todo producto sin variantes queda fuera del inventario sin que nadie se entere. La causa
es una sola, repetida en seis lugares, y la tapa un patrón que hace que el error no
llegue a ningún lado:

1. **La escritura del movimiento falla siempre cuando el producto no tiene variante.**
   Cada operación que registra un movimiento (venta, aprobación de ajuste, aprobación de
   recuento, inicialización de stock) lo hace con un `upsert` cuyo criterio de búsqueda
   es la clave única compuesta `(tenantId, productoId, varianteId, tipo, referenciaId)`.
   En un producto sin variante ese `varianteId` es `null`, y **Prisma rechaza `null` en
   un componente de una clave única compuesta** antes de llegar a la base:
   `Argument varianteId must not be null` (reproducido con una consulta de solo lectura
   equivalente, 2026-10-05). La transacción entera se revierte: no hay movimiento **ni
   tampoco descuento de stock**.

2. **La inicialización de stock de productos sin variante filtra por un campo que no
   existe.** `inicializarProductoIndividual` e `inicializarStockBulk` buscan
   `producto.inventarioActivado = false`, pero el modelo `Producto` no tiene
   `inventarioActivado` (solo `ProductoVariante` lo tiene). La consulta falla por
   validación, siempre.

3. **Los errores se descartan.** La salida por venta y la inicialización se disparan sin
   esperar el resultado y con `.catch(() => {})`. La venta responde 201, el producto se
   crea, y el fallo de inventario no deja ni una línea en el log. Así sobrevivió el
   defecto: nada falla a la vista.

4. **Hay dos caminos para descontar el stock de una venta, y el que sirve para variantes
   nunca se ejecuta.** `POST /ventas/{id}/confirmar` descuenta stock y escribe el
   movimiento, pero rechaza las ventas ya `PAGADO`, y el POS las crea `PAGADO`. Ninguna
   de las 26 ventas pasó por ahí. Si los dos caminos llegaran a funcionar a la vez, una
   misma venta descontaría dos veces.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Una venta descuenta stock y deja su movimiento, tenga o no variante el producto (Priority: P1)

Quien vende necesita que cada venta baje el stock de lo vendido y que el movimiento quede
registrado, para que el inventario diga la verdad y para poder auditar después qué salió
y por qué. Hoy, en un producto sin variantes, la venta se registra pero el stock queda
igual y no hay rastro.

**Why this priority**: es el defecto reportado y el de mayor impacto: afecta a cada venta
de cada producto simple, que en una tienda de barrio son la mayoría. El stock deja de
significar algo.

**Independent Test**: registrar una venta de un producto sin variantes y otra de una
variante con inventario activado; consultar los movimientos del negocio y el stock de
los dos.

**Acceptance Scenarios**:

1. **Given** un producto sin variantes con stock 10, **When** se registra una venta de 3
   unidades, **Then** el stock del producto queda en 7 y existe un movimiento de tipo
   SALIDA que referencia a la venta, con stock antes 10 y después 7.
2. **Given** una variante con inventario activado y stock 5, **When** se registra una
   venta de 2 unidades de esa variante, **Then** la variante queda en 3, el stock del
   producto padre se recalcula, y existe un movimiento SALIDA con la variante indicada.
3. **Given** una venta con dos líneas —una de producto simple y una de variante—, **When**
   se registra, **Then** se descuentan las dos y hay un movimiento por línea.
4. **Given** una venta ya registrada con su movimiento, **When** la operación de salida
   se repite para la misma venta (reintento), **Then** no se descuenta dos veces ni se
   duplica el movimiento.
5. **Given** que la escritura del movimiento falla por cualquier motivo, **When** se
   registra la venta, **Then** el fallo queda registrado en el log del servidor con la
   venta y el producto involucrados.

---

### User Story 2 - Ajustes y recuentos de productos sin variante se pueden aprobar (Priority: P1)

Quien administra el inventario necesita corregir el stock de un producto simple con un
ajuste o un recuento. Hoy aprobar uno que incluya un producto sin variante falla siempre
(el mismo `upsert` con `null`), así que el único stock que se puede corregir es el de las
variantes.

**Why this priority**: misma causa y misma gravedad que la US1; además es la vía para
reparar a mano el stock que las ventas dejaron mal.

**Independent Test**: crear y aprobar un ajuste de +5 y un recuento con stock físico 12
sobre un producto sin variantes; verificar stock y movimientos.

**Acceptance Scenarios**:

1. **Given** un producto sin variantes con stock 7, **When** se aprueba un ajuste de +5,
   **Then** el stock queda en 12 y hay un movimiento AJUSTE que referencia al ajuste.
2. **Given** un producto sin variantes con stock 12, **When** se aprueba un recuento con
   stock físico 9, **Then** el stock queda en 9 y hay un movimiento RECUENTO con
   diferencia −3.
3. **Given** un ajuste mixto (producto simple y variante), **When** se aprueba, **Then**
   ambos se aplican en la misma transacción, o ninguno.

---

### User Story 3 - Inicializar el stock de un producto sin variante (Priority: P2)

Al crear un producto, o al inicializar el inventario del negocio, cada producto debe
quedar con su movimiento de CREACION, que es el punto de partida del historial. Hoy la
rama de productos sin variante falla siempre por filtrar un campo inexistente.

**Why this priority**: sin el movimiento inicial el historial empieza a mitad de camino,
pero el stock en sí ya arranca en 0 por defecto, así que el daño es menor que en US1–US2.

**Independent Test**: crear un producto sin variantes y consultar sus movimientos; correr
la inicialización masiva y verificar que no falla y que no duplica.

**Acceptance Scenarios**:

1. **Given** un producto sin variantes recién creado, **When** se consultan sus
   movimientos, **Then** hay exactamente uno, de tipo CREACION.
2. **Given** la inicialización masiva ya corrida, **When** se corre otra vez, **Then** no
   crea movimientos duplicados ni reinicia stock ya cargado.

---

### User Story 4 - Un solo camino descuenta el stock de una venta (Priority: P2)

El stock de una venta debe descontarse exactamente una vez. Hoy existen dos caminos
(salida al crear la venta, y `confirmar`) con lógica distinta —uno contempla productos
simples, el otro solo variantes; uno guarda la cantidad con signo, el otro sin signo—.

**Why this priority**: hoy no produce daño porque `confirmar` nunca se ejecuta, pero
apenas alguien lo use, descuenta dos veces. Es una trampa armada.

**Independent Test**: registrar una venta y, si `confirmar` sigue expuesto, invocarlo;
el stock baja una sola vez.

**Acceptance Scenarios**:

1. **Given** una venta registrada como pagada, **When** se intenta confirmar, **Then** el
   stock no se descuenta otra vez.
2. **Given** una venta registrada en espera de pago, **When** se confirma, **Then** el
   stock se descuenta una sola vez en total, sumando registro y confirmación.

---

### Edge Cases

- **Producto con variantes vendido sin indicar variante.** Hoy ninguna de las 61 líneas
  de venta del tenant trae `varianteId`. Si el producto tiene variantes, descontar del
  stock del producto padre es incorrecto: la próxima recalculación del padre (suma de
  sus variantes) lo pisa. La venta debe indicar la variante, o el servidor debe
  rechazar la línea con un error que lo diga.
- **Stock que quedaría negativo por una venta.** Hoy se permite. Esta spec no cambia esa
  regla (ver Assumptions), pero el movimiento debe registrar el stock resultante real,
  aunque sea negativo.
- **Variante sin inventario activado.** El camino de `confirmar` la saltea con una
  advertencia; el de la venta descuenta igual. Con un solo camino (US4) la regla debe ser
  una sola y explícita.
- **Reintento de la misma operación.** La idempotencia que hoy da el `upsert` sobre la
  clave compuesta debe conservarse también para productos sin variante (`varianteId`
  nulo), donde la base no la garantiza: en PostgreSQL una clave única con un componente
  nulo **no** impide filas repetidas.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Toda operación que modifica el stock de un producto o variante (venta,
  aprobación de ajuste, aprobación de recuento, inicialización) DEBE registrar su
  movimiento de inventario **en la misma transacción** que el cambio de stock, tenga o no
  variante el producto.
- **FR-002**: La escritura del movimiento NO DEBE depender de buscar por la clave única
  compuesta con un componente nulo. Para productos sin variante DEBE usarse un criterio
  que el ORM acepte y que no dependa de que la base trate los nulos como iguales.
- **FR-003**: La idempotencia por `(producto, variante, tipo, referencia)` DEBE
  conservarse para productos sin variante: repetir la operación no duplica el movimiento
  ni vuelve a mover el stock.
- **FR-004**: La inicialización de stock (individual y masiva) DEBE funcionar para
  productos sin variante, sin filtrar por campos que el modelo `Producto` no tiene.
- **FR-005**: Ningún fallo de inventario DEBE descartarse en silencio. Si la operación de
  inventario sigue siendo asíncrona respecto de la respuesta, su fallo DEBE quedar en el
  log con la operación, la referencia (venta, producto) y el error.
- **FR-006**: El stock de una venta DEBE descontarse por un único camino. El otro DEBE
  retirarse o dejar de mover stock, de modo que ninguna secuencia de llamadas descuente
  dos veces.
- **FR-007**: El signo de `cantidad` en los movimientos DEBE seguir una sola convención,
  documentada en el contrato, para todos los tipos. Hoy la salida por venta guarda
  `-cantidad` y `confirmar` guarda `+cantidad`.
- **FR-008**: Una línea de venta de un producto que tiene variantes DEBE indicar la
  variante; si no, el servidor DEBE rechazarla con un error específico, en lugar de
  descontar del producto padre.
- **FR-009**: Las pruebas de integración de venta, ajuste, recuento e inicialización
  DEBEN cubrir el caso de producto **sin** variante. El defecto sobrevivió porque las
  existentes solo cubrían variantes.

### Key Entities

- **MovimientoInventario**: registro de un cambio de stock de un producto o de una de sus
  variantes. `varianteId` es nulo para productos simples. Lleva tipo (CREACION, ENTRADA,
  SALIDA, AJUSTE, RECUENTO), cantidad, stock antes y después, y la referencia a la
  operación que lo causó.
- **Producto** / **ProductoVariante**: dueños del stock. Un producto sin variantes guarda
  su stock en sí mismo; uno con variantes, en cada variante, y el del padre es la suma.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de las ventas registradas después del cambio tiene un movimiento
  de salida por línea, con o sin variante.
- **SC-002**: El stock de un producto sin variantes después de N ventas es exactamente el
  inicial menos lo vendido.
- **SC-003**: Aprobar un ajuste o un recuento que incluya productos sin variante se
  completa sin error.
- **SC-004**: Repetir cualquiera de estas operaciones con la misma referencia no altera
  stock ni movimientos.
- **SC-005**: Un fallo provocado en la escritura del movimiento aparece en el log del
  servidor; hoy no deja rastro.

## Assumptions

- **No se reparan las ventas pasadas en esta spec.** Las 26 ventas registradas no tienen
  movimiento y su stock no se descontó. Repararlas cambia stock real de un negocio en uso
  y necesita una decisión aparte (¿se descuenta retroactivamente o se corrige con un
  recuento?). La recomendación es un recuento después de desplegar esta spec.
- **El camino que se conserva es la salida al registrar la venta** (el puerto de
  almacén), porque es el que ya ejecuta el POS y el que contempla productos simples.
  `confirmar` queda para ventas en espera de pago, sin lógica de stock propia, o se
  retira; lo define el plan.
- **No cambia la regla de stock negativo en ventas**: hoy una venta puede dejar stock
  negativo. Bloquearla es una decisión de producto que esta spec no toma.
- Contraparte frontend: el formulario **Nuevo ajuste de inventario** no ofrece productos
  porque el container pasa `variantes={[]}` fijo, y además arma un cuerpo
  (`items`, `cantidad`, `motivo` por ítem) que no es el del contrato
  (`detalles: [{ productoId, varianteId?, cantidadAjuste }]`, `motivo` general). Eso se
  corrige en `vendora-frontend`; esta spec solo garantiza que, una vez armado bien, el
  ajuste de un producto sin variante **se pueda aprobar** (US2). Sin esta spec, aunque el
  frontend se arregle, aprobarlo fallaría.

## Contexto: cómo se encontró

- Venta `cmuvno8xj0002gsdnanas5hf1`: `estadoPago PAGADO`, `updatedAt null` (nunca pasó
  por `confirmar`), una línea con `varianteId null`. Producto sin variantes,
  `cantidadStock 0` (no se descontó).
- `almacen.MovimientoInventario`: 0 filas en total.
- `ventas.VentaDetalle`: 61 líneas, 0 con `varianteId`.
- Prueba de solo lectura con el cliente Prisma del backend:
  `movimientoInventario.findUnique({ where: { tenantId_productoId_varianteId_tipo_referenciaId: { …, varianteId: null } } })`
  → `PrismaClientValidationError: Argument varianteId must not be null`. Y
  `producto.findFirst({ select: { inventarioActivado: true } })` → validación: el campo
  no existe en `Producto`.
- Sitios afectados en `inventario-producto.prisma.repository.ts`: `aprobarAjuste`,
  `aprobarRecuento`, `inicializarStockBulk`, `inicializarProductoIndividual`,
  `registrarMovimientoSalidaIdempotente`; y los `.catch(() => {})` en
  `crear-venta.usecase.ts`, `convertir-pedido-en-venta.usecase.ts` y `producto.rest.ts`.
