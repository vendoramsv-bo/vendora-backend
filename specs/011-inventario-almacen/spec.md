# Feature Specification: Inventario de Productos y Almacén de Insumos

**Feature Branch**: `011-inventario-almacen`  
**Created**: 2026-05-26  
**Status**: Draft  
**Input**: User description: "Construir el control de inventario de productos y el almacén de insumos del tenant."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Stock de Productos y Variantes (Priority: P1)

Cada producto y cada variante del catálogo tiene su propio registro de stock actual y stock mínimo. Los operadores pueden consultar el stock de cualquier producto o variante y ver su historial completo de movimientos. Todo cambio de stock queda registrado como un movimiento de inventario con tipo, cantidad, motivo y referencia a la operación que lo originó.

**Why this priority**: Es la base de todo el módulo. Sin stock de productos no existe inventario, y todas las demás funciones dependen de esta.

**Independent Test**: Consultar el stock actual de un producto y de una de sus variantes; registrar una entrada; verificar que el stock se actualiza y que el movimiento queda en el historial con tipo, cantidad, motivo y responsable.

**Acceptance Scenarios**:

1. **Given** un producto y una variante existentes en el catálogo, **When** el operador consulta su stock, **Then** el sistema devuelve su stock actual y stock mínimo individualmente.

2. **Given** una variante con stock = 20, **When** se registra un movimiento de entrada de 10 unidades con motivo "compra", **Then** el stock queda en 30 y el movimiento aparece en el historial con tipo ENTRADA, cantidad 10, motivo y responsable.

3. **Given** un movimiento ya registrado para la combinación producto + variante + tipo + referencia de operación, **When** se intenta registrar otro movimiento con la misma combinación, **Then** el sistema actualiza el movimiento existente en lugar de crear uno nuevo (idempotencia).

4. **Given** el historial de movimientos de un producto, **When** se consulta con filtro por tipo y paginación, **Then** el sistema devuelve únicamente los movimientos del tipo solicitado, en el orden indicado, con la cantidad por página solicitada (máximo 100).

---

### User Story 2 - Ajustes y Recuentos de Inventario (Priority: P2)

Los operadores pueden corregir el stock de un producto o variante mediante ajustes manuales (con motivo) o recuentos físicos (comparando el conteo real contra el stock del sistema). Ambos se crean primero en estado borrador sin afectar el stock, y solo se aplican al aprobarse. Si la operación dejaría algún stock en negativo, se rechaza identificando el elemento afectado.

**Why this priority**: Los ajustes y recuentos son el mecanismo de corrección formal que mantiene el inventario sincronizado con la realidad. Depende del stock base (US1) y habilita la integridad del inventario.

**Independent Test**: Crear un ajuste de -5 unidades en borrador para un producto con stock = 3; intentar aprobarlo — debe rechazarse por stock negativo. Luego crear un ajuste de +10 con motivo "reposición" y aprobarlo; verificar que el stock se actualiza y que queda un movimiento de tipo AJUSTE.

**Acceptance Scenarios**:

1. **Given** un ajuste en borrador de -5 unidades para una variante con stock = 3, **When** el operador lo aprueba, **Then** el sistema rechaza la operación con un error que identifica la variante que quedaría en negativo, y el stock no cambia.

2. **Given** un ajuste en borrador de +10 unidades con motivo "inventario inicial" para un producto con stock = 5, **When** el operador lo aprueba, **Then** el stock queda en 15 y se registra un movimiento de tipo AJUSTE con cantidad 10, motivo y responsable; la aprobación es atómica.

3. **Given** un recuento en borrador con cantidad física = 47 para un producto con stock del sistema = 50, **When** el operador lo aprueba, **Then** el stock queda en 47, se registra un movimiento de tipo RECUENTO con diferencia -3, responsable y fecha.

4. **Given** un recuento sobre una variante con stock del sistema = 10, cantidad física = 7, **When** se aprueba el recuento, **Then** el stock de la variante se actualiza a 7 y el stock del producto padre se recalcula como la suma de los stocks de todas sus variantes activas.

5. **Given** un recuento aprobado que no genera diferencia (cantidad física = stock del sistema), **When** se aprueba, **Then** no se registra movimiento de ajuste de stock, pero el recuento queda en estado aprobado con diferencia = 0.

---

### User Story 3 - Gestión de Insumos del Almacén (Priority: P3)

El tenant gestiona un catálogo de insumos (materias primas, ingredientes) con nombre, unidad de medida, stock, stock mínimo, costo unitario y fecha de vencimiento. Los operadores pueden crear y consultar insumos, ver su historial de movimientos y recibir alertas cuando el stock cae por debajo del mínimo.

**Why this priority**: El almacén de insumos es un dominio paralelo al inventario de productos que no depende de él. Puede funcionar de forma independiente.

**Independent Test**: Crear un insumo "Harina de trigo" con unidad "kg", stock mínimo = 10; verificar que aparece en el listado; comprobar que cuando su stock cae a 8 (por debajo del mínimo), el sistema lo señaliza como stock crítico.

**Acceptance Scenarios**:

1. **Given** un tenant sin insumos, **When** el operador crea un insumo con nombre, unidad de medida, stock mínimo, costo unitario y fecha de vencimiento, **Then** el insumo queda registrado y disponible para recibir ingresos y salidas.

2. **Given** un insumo con stock = 5 y stock mínimo = 10, **When** se consulta el listado de insumos, **Then** el insumo aparece señalizado como "stock crítico".

3. **Given** múltiples insumos del tenant, **When** se consulta el listado con filtros y paginación, **Then** el sistema aplica los filtros y devuelve los resultados paginados correctamente (máximo 100 por página).

4. **Given** un producto del catálogo, **When** el operador define su composición indicando insumos y cantidades por unidad, **Then** la receta queda asociada al producto y puede ser consultada.

---

### User Story 4 - Ingresos y Salidas de Almacén (Priority: P4)

Los operadores registran ingresos de almacén (especificando proveedor y número de lote) y salidas manuales de insumos. Ambas operaciones se crean en estado borrador y solo afectan el stock al aprobarse. Si la aprobación de una salida dejaría algún insumo con stock negativo, se rechaza identificando el insumo afectado. Toda aprobación es atómica.

**Why this priority**: Depende del catálogo de insumos (US3). Completa el ciclo operativo del almacén con su patrón borrador-aprobación.

**Independent Test**: Crear un ingreso en borrador con proveedor "Molino ABC", lote "L001", 50 kg de harina; aprobarlo; verificar que el stock aumenta en 50 y que el movimiento de tipo INGRESO queda registrado. Luego crear una salida de 60 kg en borrador; intentar aprobarla — debe rechazarse por stock insuficiente.

**Acceptance Scenarios**:

1. **Given** un ingreso en borrador con proveedor "Molino ABC", lote "L001", 50 kg de harina a $2.50/kg, **When** el operador lo aprueba, **Then** el stock del insumo aumenta en 50 kg y se registra un movimiento de tipo INGRESO con todos los datos del proveedor, lote y costo; la aprobación es atómica.

2. **Given** una salida en borrador de 60 kg de harina y el insumo tiene stock = 50, **When** el operador intenta aprobarla, **Then** el sistema rechaza la operación con un error que identifica el insumo que quedaría negativo, y el stock no cambia.

3. **Given** una salida en borrador de 30 kg de harina con insumo en stock = 50, **When** se aprueba, **Then** el stock queda en 20 kg y se registra un movimiento de tipo SALIDA con motivo y responsable; ningún cambio parcial persiste si ocurre un error durante la aprobación.

4. **Given** un ingreso ya aprobado para la misma combinación de insumo + lote + proveedor que se reintenta procesar, **When** el sistema detecta que ya existe, **Then** actualiza el movimiento existente en lugar de duplicarlo.

---

### User Story 5 - Alertas de Stock en Tiempo Real (Priority: P5)

Cuando el stock de un producto, variante o insumo cae por debajo de su stock mínimo, todos los usuarios del tenant conectados reciben una notificación en tiempo real con el elemento afectado, el stock actual y el stock mínimo. Los usuarios de otros tenants no reciben las alertas.

**Why this priority**: Depende de todos los módulos anteriores que generan movimientos de stock. Agrega visibilidad operativa colaborativa en tiempo real.

**Independent Test**: Dos sesiones del mismo tenant conectadas. Aprobar un ajuste que lleve un producto a stock crítico. Verificar que ambas sesiones reciben la alerta. Conectar una sesión de otro tenant y verificar que no recibe la alerta.

**Acceptance Scenarios**:

1. **Given** dos usuarios del tenant A conectados y un producto con stock mínimo = 5, **When** se aprueba un ajuste que deja el stock en 3, **Then** ambos usuarios reciben inmediatamente una notificación de stock crítico con nombre del elemento, stock actual (3) y stock mínimo (5).

2. **Given** un usuario del tenant B conectado, **When** ocurre un evento de stock crítico en tenant A, **Then** el usuario de tenant B no recibe ninguna notificación (aislamiento total entre tenants).

3. **Given** un insumo que estaba en stock crítico y se registra un ingreso que lo lleva al nivel mínimo o superior, **When** se aprueba el ingreso, **Then** el sistema emite una notificación de "stock normalizado" a los usuarios conectados del tenant.

---

### Edge Cases

- ¿Qué pasa si se aprueba un ajuste o recuento que deja el stock de un producto o variante en negativo? El sistema rechaza la operación e identifica el producto/variante afectado; no se aplica ningún cambio.
- ¿Qué pasa si se aprueba una salida de almacén que deja un insumo en negativo? El sistema rechaza la operación e identifica el insumo afectado; ningún cambio parcial persiste.
- ¿Qué pasa si el ajuste/recuento es sobre una variante? El cambio se aplica a la variante y el stock del producto padre se recalcula como la suma de los stocks de todas sus variantes activas.
- ¿Qué pasa si un movimiento de inventario se intenta registrar dos veces con la misma combinación de producto + variante + tipo + referencia de operación? El sistema actualiza el movimiento existente (idempotencia) en lugar de crear uno nuevo.
- ¿Qué pasa si falla algún paso de una aprobación (por ejemplo, el registro del movimiento falla tras actualizar el stock)? La transacción completa se revierte; no queda ningún cambio parcial aplicado.
- ¿Qué pasa si se intenta aprobar un ajuste/ingreso/salida que ya fue aprobado? El sistema rechaza la operación indicando que ya está en estado aprobado.
- ¿Qué pasa si se intenta editar un documento que ya fue aprobado? El sistema rechaza la modificación; los documentos aprobados son inmutables (FR-022).
- ¿Qué pasa si dos operadores intentan aprobar distintos ajustes sobre el mismo producto simultáneamente? El sistema usa bloqueo optimista: la segunda aprobación recibe un error de conflicto indicando que el stock fue modificado; el operador refresca y reintenta si corresponde (FR-023).
- ¿Qué pasa si el recuento físico coincide exactamente con el stock del sistema? No se genera movimiento de stock, pero el recuento queda registrado con diferencia = 0.
- ¿Qué pasa con los productos que se añaden al catálogo después de que el módulo de inventario ya está activo? El sistema crea automáticamente su registro de stock con valores iniciales en 0 al momento de la creación en el catálogo (FR-021).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE mantener un registro de stock actual y stock mínimo por producto y por variante de producto de forma independiente.

- **FR-002**: El sistema DEBE registrar cada cambio de stock de producto como un movimiento de inventario con: tipo (CREACION | ENTRADA | SALIDA | AJUSTE | RECUENTO), cantidad (positiva o negativa), motivo, referencia a la operación de origen, responsable y fecha.

- **FR-003**: Los movimientos de inventario DEBEN ser idempotentes respecto a su operación de origen: si ya existe un movimiento para la misma combinación de producto + variante + tipo + referencia de operación, el sistema DEBE actualizarlo en lugar de crear uno nuevo.

- **FR-004**: Los ajustes de inventario (corrección manual con motivo) DEBEN crearse primero en estado borrador y solo afectar el stock al aprobarse. Un ajuste borrador aprobado aplica su cantidad al stock y registra un movimiento de tipo AJUSTE.

- **FR-005**: Los recuentos de inventario DEBEN crearse en estado borrador comparando el stock físico contado contra el stock del sistema. Al aprobarse, el sistema aplica la diferencia (stock físico menos stock del sistema) y registra un movimiento de tipo RECUENTO. Si la diferencia es cero, el movimiento no modifica el stock pero el recuento queda aprobado.

- **FR-006**: Si la aprobación de un ajuste o recuento dejaría el stock de un producto o variante en valor negativo, el sistema DEBE rechazar la operación con un error que identifica el elemento afectado, sin aplicar ningún cambio.

- **FR-007**: Cuando el ajuste o recuento afecta una variante, el sistema DEBE actualizar el stock de la variante y luego recalcular el stock del producto padre como la suma de los stocks de todas sus variantes activas.

- **FR-008**: Cuando el stock de un producto o variante cae por debajo de su stock mínimo, el sistema DEBE generar una notificación en tiempo real a todos los usuarios conectados del mismo tenant.

- **FR-009**: El sistema DEBE mantener un catálogo de insumos por tenant con: nombre, unidad de medida, stock actual, stock mínimo, costo unitario y fecha de vencimiento.

- **FR-010**: Un producto DEBE poder tener una composición (receta) definida por el operador, indicando qué insumos lo componen y en qué cantidades por unidad de producto.

- **FR-011**: El sistema DEBE registrar cada cambio de stock de insumo como un movimiento de almacén con: tipo (INGRESO | SALIDA), cantidad, motivo, proveedor (solo en ingresos), número de lote (solo en ingresos), costo unitario (solo en ingresos), responsable y fecha.

- **FR-012**: Los ingresos de almacén (con proveedor y lote) y las salidas de almacén DEBEN crearse en estado borrador y solo afectar el stock al aprobarse. Al aprobarse, cada línea del ingreso incrementa el stock del insumo y cada línea de la salida lo decrementa, registrando el movimiento correspondiente.

- **FR-013**: Si la aprobación de una salida de almacén dejaría algún insumo con stock negativo, el sistema DEBE rechazar la operación completa con un error que identifica el insumo afectado, sin aplicar ningún cambio parcial.

- **FR-014**: Toda aprobación que afecte stock y registre movimientos DEBE ejecutarse de forma atómica: si cualquier paso falla, no se aplica ningún cambio.

- **FR-015**: Cada ajuste, recuento, ingreso de almacén y salida de almacén DEBE registrar quién realizó la operación (auditoría de responsable).

- **FR-016**: Los listados de movimientos de inventario, movimientos de almacén, insumos, ajustes y recuentos DEBEN aceptar: cantidad por página (máximo 100), filtro por campos relevantes, orden ascendente o descendente por campo acotado, y paginación por cursor.

- **FR-017**: Cuando el stock de un insumo cae por debajo de su stock mínimo, el sistema DEBE generar una notificación en tiempo real a todos los usuarios conectados del mismo tenant.

- **FR-018**: Las notificaciones de stock de productos e insumos DEBEN estar aisladas por tenant: los usuarios de un tenant no reciben las alertas de otro tenant.

- **FR-019**: Cuando el módulo de ventas (Feature 006) registra una venta, el sistema DEBE crear automáticamente un movimiento de tipo SALIDA en el inventario de cada producto vendido, usando el identificador de la venta como referencia de operación. La regla de idempotencia (FR-003) aplica a estos movimientos, evitando duplicados cuando una venta se reprocesa.

- **FR-020**: Al activar el módulo de inventario para un tenant, el sistema DEBE crear automáticamente registros de stock para todos los productos y variantes existentes en el catálogo, con stockActual = 0 y stockMínimo = 0. Los registros creados de esta forma quedan con un movimiento de tipo CREACION con cantidad = 0. El operador configura los valores de stock mínimo en cualquier momento posterior.

- **FR-021**: Cuando se añade un nuevo producto o variante al catálogo del tenant (después de la activación del módulo de inventario), el sistema DEBE crear automáticamente su registro de stock con stockActual = 0 y stockMínimo = 0, registrando un movimiento CREACION inicial.

- **FR-022**: Los documentos en estado borrador (AjusteInventario, RecuentoInventario, IngresoAlmacen, SalidaAlmacen) DEBEN ser totalmente editables antes de su aprobación: el operador puede modificar cualquier campo, incluidos cantidades, motivo y líneas de insumos. Una vez aprobado, el documento es inmutable.

- **FR-023**: Las aprobaciones DEBEN utilizar bloqueo optimista sobre el registro de stock afectado: si el stock fue modificado por otra operación entre que el operador cargó el documento y lo aprobó, el sistema DEBE rechazar la aprobación con un error de conflicto indicando que el stock fue modificado; el operador debe refrescar los datos y reintentar si corresponde.

- **FR-024**: Los movimientos de almacén (MovimientoAlmacen) DEBEN ser idempotentes respecto a su documento de origen: si ya existe un movimiento para la misma combinación de insumo + tipo + referencia de operación (ID del IngresoAlmacen o SalidaAlmacen), el sistema DEBE actualizarlo en lugar de crear uno nuevo. Esto previene duplicados ante fallos parciales durante la aprobación.

### Key Entities

- **StockProducto**: Registro de stock por producto; campos: productoId, stockActual, stockMínimo, estado (normal, crítico).
- **StockVariante**: Registro de stock por variante; campos: varianteId, productoId, stockActual, stockMínimo, estado (normal, crítico).
- **MovimientoInventario**: Cambio de stock de producto o variante; campos: tipo (CREACION | ENTRADA | SALIDA | AJUSTE | RECUENTO), cantidad, motivo, referenciaOperacion, stockAntes, stockDespues, responsable, fecha.
- **AjusteInventario**: Corrección manual de stock de un producto/variante; campos: productoId, varianteId (opcional), cantidad, motivo, estado (borrador | aprobado), responsable, fecha.
- **RecuentoInventario**: Comparación de stock físico vs sistema; campos: productoId, varianteId (opcional), cantidadFísica, stockSistema, diferencia, estado (borrador | aprobado), responsable, fecha.
- **Insumo**: Ítem del almacén del tenant; campos: nombre, unidadMedida, stockActual, stockMínimo, costoUnitario, fechaVencimiento, estado.
- **ComposicionProducto**: Receta de un producto; campos: productoId, líneas con insumoId y cantidadPorUnidad.
- **MovimientoAlmacen**: Cambio de stock de insumo; campos: tipo (INGRESO | SALIDA), insumoId, cantidad, motivo, proveedor, lote, costoUnitario, stockAntes, stockDespues, responsable, fecha.
- **IngresoAlmacen**: Documento de ingreso de insumos con proveedor y lote; campos: proveedor, lote, estado (borrador | aprobado), líneas con insumoId y cantidad, responsable, fecha.
- **SalidaAlmacen**: Documento de salida de insumos; campos: motivo, estado (borrador | aprobado), líneas con insumoId y cantidad, responsable, fecha.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Los operadores pueden registrar un ajuste de inventario completo (crear borrador y aprobar) en menos de 1 minuto.
- **SC-002**: Los operadores pueden completar y aprobar un recuento de hasta 50 productos, con ajustes de stock reflejados al finalizar, en menos de 15 minutos.
- **SC-003**: Las notificaciones de stock crítico llegan a todos los usuarios conectados del tenant en menos de 2 segundos desde que se aprueba la operación causante.
- **SC-004**: El historial de movimientos de cualquier producto, variante o insumo puede consultarse y filtrarse en menos de 3 segundos para períodos de hasta 12 meses.
- **SC-005**: Ninguna aprobación de ajuste, recuento, ingreso o salida deja el sistema en estado parcialmente modificado ante un fallo durante la operación.
- **SC-006**: Ninguna notificación de stock del tenant A llega a usuarios del tenant B (aislamiento total).
- **SC-007**: El sistema gestiona catálogos de hasta 1.000 insumos y 10.000 movimientos de almacén mensuales sin degradación visible en los tiempos de respuesta de los listados.
- **SC-008**: El intento de aprobar una operación que dejaría stock negativo es rechazado antes de modificar cualquier dato, en todos los casos.

## Assumptions

- Los productos y variantes ya existen en el catálogo comercial del tenant (Feature 010); el módulo de inventario añade la dimensión de stock sin duplicar las entidades de catálogo.
- Feature 006 (ventas-caja) integra con este módulo: al registrar una venta, llama al módulo de inventario para crear movimientos SALIDA automáticos de los productos vendidos; la regla de idempotencia (FR-003) previene duplicados en caso de reprocesamiento.
- Al activar el módulo de inventario para un tenant, todos los productos y variantes del catálogo reciben automáticamente un registro de stock inicializado en 0; el operador configura los valores mínimos en cualquier momento posterior. Los nuevos productos añadidos al catálogo después de la activación también reciben su registro automáticamente.
- El stock del producto padre se calcula siempre como la suma de los stocks de sus variantes activas; no existe un stock "independiente" a nivel de producto separado del de sus variantes.
- La composición (receta) de un producto es informativa en este feature: permite definir qué insumos componen el producto, pero el descuento automático de insumos al vender es responsabilidad de módulos futuros (ventas, pedidos).
- Los ingresos y salidas de almacén gestionan únicamente insumos del almacén, no productos del catálogo.
- La unidad de medida de los insumos proviene del catálogo de unidades de medida del tenant ya existente.
- Los ajustes, recuentos, ingresos y salidas solo pueden aprobarse una vez; un documento ya aprobado no puede volver a borrador ni re-aprobarse.
- Los listados de ajustes, recuentos, ingresos y salidas son de solo lectura para usuarios con rol de consulta; crear y aprobar operaciones requiere rol PROPIETARIO o ADMIN.
- Las alertas de stock crítico se emiten por evento de movimiento; no se reemiten de forma continua mientras el stock sigue bajo el mínimo sin nuevos movimientos que lo modifiquen.
- El módulo está aislado por tenant: cada tenant ve únicamente su propio inventario, insumos y movimientos.

## Clarifications

### Session 2026-05-26

- Q: Cuando se registra una venta en Feature 006, ¿el sistema crea automáticamente un movimiento SALIDA en el inventario del producto vendido, o los movimientos de stock de productos son siempre explícitos? → A: Automático — Feature 006 integra con el módulo de inventario y crea movimientos SALIDA automáticos al registrar una venta; la idempotencia (FR-003) previene duplicados al reprocesar.
- Q: ¿Cómo se inicializan los registros de stock para los productos existentes en el catálogo al activar el módulo de inventario? → A: Automático al activar el módulo — todos los productos y variantes del catálogo reciben un registro de stock con stockActual = 0 y stockMínimo = 0; los nuevos productos añadidos después también reciben su registro automáticamente (FR-020, FR-021).
- Q: ¿Los documentos en estado borrador (ajustes, recuentos, ingresos, salidas) pueden editarse antes de aprobarse? → A: Totalmente editables — el operador puede modificar cualquier campo mientras el documento esté en borrador; una vez aprobado, el documento es inmutable (FR-022).
- Q: Si dos operadores aprueban simultáneamente ajustes distintos sobre el mismo producto, ¿cómo resuelve el sistema el conflicto? → A: Bloqueo optimista — la segunda aprobación falla con error de conflicto si el stock fue modificado entre que el operador cargó el documento y lo aprobó; el operador refresca y reintenta (FR-023).
- Q: ¿La regla de idempotencia aplica también a los movimientos de almacén (MovimientoAlmacen), o solo a los movimientos de inventario de productos? → A: Misma regla — los movimientos de almacén también son idempotentes usando insumo + tipo + referencia del documento como clave; si ya existe, se actualiza en vez de duplicar, previniendo duplicados ante fallos parciales (FR-024).
