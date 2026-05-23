# Feature Specification: Inventario y Almacén

**Feature Branch**: `004-inventario-almacen`
**Created**: 2026-05-22
**Status**: Draft
**Input**: User description: "Construir el control de inventario de productos y el almacén de insumos del tenant."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Control de Stock de Productos (Priority: P1)

El operador del tenant puede consultar el stock actual de cada producto y variante, registrar ajustes manuales de inventario con motivo (correcciones, mermas, devoluciones), y ver el historial completo de movimientos. Cuando el stock cae por debajo del mínimo configurado, el sistema registra el evento para alertas en tiempo real.

**Why this priority**: Es la funcionalidad central que habilita visibilidad de inventario. Sin stock base no tiene sentido ninguna otra función de inventario.

**Independent Test**: Crear un producto con stock mínimo configurado, registrar un ajuste de salida que lo deje por debajo del mínimo, verificar que el movimiento queda registrado con motivo y responsable, y que se genera la señal de stock crítico.

**Acceptance Scenarios**:

1. **Given** una variante existente en el catálogo aún no inicializada, **When** el operador la inicializa en inventario con stock inicial = 50 y stock mínimo = 10, **Then** se crea su registro de stock y queda disponible para recibir movimientos.

2. **Given** una variante inicializada con stock actual = 10 y stock mínimo = 5, **When** el operador registra una salida de 8 unidades con motivo "venta directa", **Then** el stock queda en 2, el movimiento queda registrado con tipo "salida", cantidad 8, motivo y responsable, y el sistema detecta que está por debajo del mínimo.

3. **Given** una variante no inicializada en inventario, **When** se intenta registrar un movimiento sobre ella, **Then** el sistema rechaza la operación con mensaje indicando que debe inicializarse primero.

4. **Given** historial de movimientos de una variante, **When** se consulta la lista con filtro de tipo "ajuste" y paginación, **Then** se devuelve solo movimientos de ese tipo, ordenados y paginados correctamente.

5. **Given** un ajuste con datos incompletos (sin motivo), **When** se intenta registrar, **Then** el sistema rechaza la operación con mensaje descriptivo.

---

### User Story 2 - Recuento de Inventario de Productos (Priority: P2)

El operador realiza un recuento físico: ingresa la cantidad real contada para un producto o variante. El sistema compara ese valor contra el stock registrado, calcula la diferencia (sobrante o faltante), y registra automáticamente un movimiento de tipo "recuento" que ajusta el stock al valor físico real. Todo el proceso queda trazable con el responsable del recuento.

**Why this priority**: El recuento es la herramienta de corrección formal que resuelve desviaciones acumuladas. Depende del sistema de stock (US1) pero no de los demás módulos.

**Independent Test**: Con un producto con stock registrado = 50, registrar un recuento con valor físico = 47, verificar que el stock se ajusta a 47 y que el movimiento tipo "recuento" registra diferencia = -3 y al responsable.

**Acceptance Scenarios**:

1. **Given** un producto con stock en sistema = 50, **When** el operador registra un recuento con cantidad física = 47, **Then** el stock se actualiza a 47, se crea un movimiento tipo "recuento" con diferencia -3, y se registra el responsable y la fecha.

2. **Given** un recuento en el que el stock físico coincide con el sistema, **When** se registra el recuento, **Then** no se genera movimiento de ajuste (diferencia = 0) pero el recuento queda registrado igualmente como "sin diferencia".

3. **Given** múltiples recuentos del mismo producto en distintas fechas, **When** se lista el historial de recuentos, **Then** se pueden filtrar por rango de fecha y ordenar por fecha descendente.

---

### User Story 3 - Gestión de Insumos y Almacén (Priority: P3)

El tenant gestiona su catálogo de insumos (materias primas, ingredientes). Cada insumo tiene nombre, unidad de medida, stock actual, stock mínimo, costo unitario y fecha de vencimiento. El operador puede registrar ingresos de almacén (con proveedor, número de lote y costo por unidad del ingreso) y salidas manuales, y consultar el historial de movimientos por insumo. Cuando el stock de un insumo cae por debajo del mínimo, se genera una alerta.

**Why this priority**: El almacén de insumos es un dominio paralelo al inventario de productos. Puede implementarse sin depender de recetas (US4).

**Independent Test**: Crear un insumo "Harina de trigo" con unidad "kg", stock mínimo = 10. Registrar ingreso de 50 kg desde proveedor "Molino ABC" lote "L001" a $2.50/kg. Luego registrar salida manual de 45 kg. Verificar stock = 5, ambos movimientos en historial, e insumo marcado como stock crítico.

**Acceptance Scenarios**:

1. **Given** un insumo nuevo sin stock, **When** el operador registra un ingreso de almacén con 50 kg, proveedor "Molino ABC", lote "L001" y costo $2.50/kg, **Then** el stock del insumo pasa a 50 kg y el movimiento tipo "ingreso" queda registrado con todos los datos del proveedor, lote y costo.

2. **Given** un insumo con stock = 5 y stock mínimo = 10, **When** se consulta el listado de insumos, **Then** el insumo aparece marcado como "stock crítico".

3. **Given** un insumo con varios movimientos, **When** se filtra el historial por tipo "ingreso" con paginación, **Then** solo se muestran los ingresos, paginados y con responsable visible.

4. **Given** un ajuste de insumo sin motivo, **When** se intenta guardar, **Then** el sistema rechaza la operación con error descriptivo.

---

### User Story 4 - Recetas y Consumo de Insumos por Producto (Priority: P4)

El tenant define recetas a nivel de producto o de variante individual. Al registrar un consumo, el sistema aplica la receta de la variante si existe; si no, usa la del producto base. Cuando se registra un consumo, el sistema descuenta automáticamente los insumos según la receta aplicable. Si los insumos son insuficientes, el sistema advierte y espera confirmación del operador antes de proceder.

**Why this priority**: Requiere que tanto el inventario de productos (US1) como el almacén de insumos (US3) estén operativos. Entrega el mayor valor compuesto del módulo.

**Independent Test**: Definir receta de "Empanada" = 0.1 kg de harina + 0.05 kg de carne. Con harina stock = 10 kg y carne stock = 5 kg, registrar consumo de 10 empanadas. Verificar que harina queda en 9 kg y carne en 4.5 kg, con movimientos de salida automáticos para cada insumo.

**Acceptance Scenarios**:

1. **Given** producto "Empanada" con receta (0.1 kg harina, 0.05 kg carne) y stocks suficientes, **When** se registra consumo de 10 unidades, **Then** se descuenta 1 kg de harina y 0.5 kg de carne, y se crean movimientos automáticos de tipo "salida por receta" para cada insumo.

2. **Given** la misma receta con harina disponible = 0.5 kg, **When** se intenta registrar consumo de 10 unidades, **Then** el sistema advierte que los insumos son insuficientes y espera confirmación del operador; si confirma, el consumo se registra y los insumos pueden quedar en negativo.

3. **Given** un producto sin receta definida, **When** se registra consumo, **Then** solo se descuenta el stock del producto sin afectar insumos.

4. **Given** una receta ya definida, **When** el operador actualiza la cantidad de un insumo en la receta, **Then** los consumos futuros usan la nueva cantidad, sin afectar el historial pasado.

---

### User Story 5 - Notificaciones de Stock Crítico en Tiempo Real (Priority: P5)

Todos los usuarios del tenant conectados reciben notificaciones en tiempo real cuando el stock de un producto o insumo cae por debajo del mínimo configurado. Las alertas indican el elemento afectado, el stock actual y el stock mínimo. Usuarios de distintos tenants no reciben las alertas del otro.

**Why this priority**: Depende de todos los módulos anteriores (que generan los movimientos). Agrega visibilidad operativa colaborativa sobre funcionalidad ya completa.

**Independent Test**: Dos sesiones del mismo tenant conectadas. Registrar una salida que lleve un producto a stock crítico. Verificar que ambas sesiones reciben la alerta en tiempo real. Verificar que una sesión de otro tenant no recibe la alerta.

**Acceptance Scenarios**:

1. **Given** dos usuarios del tenant A conectados y un producto con stock mínimo = 5, **When** se registra una salida que deja el stock en 3, **Then** ambos usuarios reciben inmediatamente una notificación de stock crítico con nombre del producto, stock actual (3) y stock mínimo (5).

2. **Given** un usuario del tenant B conectado, **When** ocurre el mismo evento de stock crítico en tenant A, **Then** el usuario del tenant B no recibe ninguna notificación.

3. **Given** un insumo con stock crítico que luego se repone mediante un ingreso de almacén, **When** el stock vuelve al nivel mínimo o superior, **Then** el sistema emite una notificación de "stock normalizado" a los usuarios del tenant conectados.

---

### Edge Cases

- ¿Qué pasa si se intenta registrar un movimiento sobre una variante no inicializada en inventario? El sistema rechaza la operación e indica que el operador debe inicializar primero esa variante.
- ¿Qué pasa si se registra un ajuste con cantidad que deja el stock en negativo? El sistema lo permite previa confirmación del operador, registrando el valor negativo en el historial.
- ¿Qué pasa si se intenta eliminar o desactivar un insumo que está referenciado en una receta activa? El sistema bloquea ambas operaciones con mensaje indicando los productos afectados; el operador debe quitar el insumo de todas las recetas antes de poder eliminarlo o desactivarlo.
- ¿Qué pasa si dos operadores hacen recuentos simultáneos del mismo producto? El segundo recuento se basa en el stock resultado del primero; ambos quedan registrados en el historial.
- ¿Qué pasa si una receta contiene un insumo sin stock y el operador no confirma el consumo? La operación entera se cancela y no se modifica ningún stock.
- ¿Qué pasa si la fecha de vencimiento de un insumo ya pasó? El sistema lo marca como "vencido" y muestra advertencia al registrar movimientos de salida o consumo, pero no bloquea la operación.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE mantener un registro de stock actual y stock mínimo por variante de producto. Cada variante tiene su propio stock independiente; no existe stock a nivel de producto base compartido entre variantes. El operador DEBE inicializar explícitamente cada variante en el módulo de inventario (definiendo su stock inicial y stock mínimo) antes de poder registrar movimientos sobre ella; el sistema rechaza movimientos sobre variantes no inicializadas.

- **FR-002**: El sistema DEBE registrar cada cambio de stock de producto como un movimiento de inventario con tipo (CREACION, ENTRADA, SALIDA, AJUSTE, RECUENTO), cantidad, motivo, stock antes, stock después, y responsable.

- **FR-003**: Los operadores DEBEN poder registrar ajustes manuales de stock de productos (positivos o negativos) con motivo obligatorio.

- **FR-004**: Los operadores DEBEN poder registrar un recuento físico para un producto o variante indicando la cantidad contada; el sistema calcula la diferencia con el stock registrado y aplica el ajuste automáticamente, registrando el responsable y la fecha.

- **FR-005**: El sistema DEBE detectar y señalizar cuando el stock de un producto o variante cae por debajo de su stock mínimo configurado.

- **FR-006**: El sistema DEBE mantener un catálogo de insumos del tenant con nombre, unidad de medida, stock actual, stock mínimo, costo unitario, fecha de vencimiento y estado.

- **FR-007**: Los operadores DEBEN poder registrar ingresos de almacén para insumos especificando proveedor, número de lote y costo unitario del ingreso.

- **FR-008**: Los operadores DEBEN poder registrar salidas manuales de insumos con motivo obligatorio.

- **FR-009**: El sistema DEBE registrar cada cambio de stock de insumo como un movimiento con tipo (INGRESO, SALIDA, AJUSTE, RECUENTO), cantidad, motivo, datos de proveedor/lote/costo cuando aplique, stock antes, stock después y responsable.

- **FR-010**: El sistema DEBE detectar y señalizar cuando el stock de un insumo cae por debajo de su stock mínimo configurado.

- **FR-011**: Los operadores DEBEN poder definir una receta a nivel de producto (aplica a todas sus variantes) o a nivel de variante individual (aplica solo a esa variante). Al registrar un consumo, el sistema usa la receta de la variante si existe; si no, usa la receta del producto base. Si ninguna tiene receta, el consumo solo descuenta stock del producto sin afectar insumos.

- **FR-012**: Al registrar un consumo de un producto, el sistema DEBE descontar automáticamente los insumos de su receta en las cantidades proporcionales a las unidades consumidas, creando movimientos de tipo "salida por receta" para cada insumo.

- **FR-013**: Cuando los insumos disponibles son insuficientes para cubrir un consumo registrado, el sistema DEBE advertir al operador y requerir confirmación explícita antes de proceder; si no confirma, la operación se cancela completamente.

- **FR-014**: Los listados de movimientos de productos, movimientos de insumos, historial de recuentos e insumos DEBEN soportar filtros (tipo, rango de fechas, estado), cantidad de resultados, orden y paginación por cursor.

- **FR-015**: Insumos con fecha de vencimiento anterior a la fecha actual DEBEN marcarse automáticamente como "vencido" y mostrar advertencia al registrar movimientos de salida o consumo.

- **FR-016**: El sistema DEBE impedir tanto la eliminación como la desactivación de insumos que estén referenciados en recetas activas de algún producto, informando cuáles productos se verían afectados. El operador debe primero quitar el insumo de todas las recetas activas antes de poder eliminarlo o desactivarlo.

- **FR-017**: Los usuarios del tenant conectados DEBEN recibir notificaciones en tiempo real cuando se genera una señal de stock crítico (producto o insumo) o cuando el stock se normaliza por encima del mínimo.

### Key Entities

- **StockVariante**: Registro de stock de una variante de producto; cada variante tiene exactamente un StockVariante; campos: varianteId, stockActual, stockMínimo, estado (normal, crítico). No existe stock a nivel de producto base.
- **MovimientoInventario**: Registro de un cambio de stock de producto; campos: tipo (CREACION | ENTRADA | SALIDA | AJUSTE | RECUENTO), cantidad, motivo, stockAntes, stockDespues, referencia externa, responsable, fecha.
- **RecuentoProducto**: Sesión de conteo físico de un producto/variante; campos: cantidadFísica, diferencia, stockAntes, observaciones, responsable, fecha.
- **Insumo**: Ítem del almacén del tenant; campos: nombre, unidadMedida, stockActual, stockMínimo, costoUnitario, fechaVencimiento, estado.
- **MovimientoInsumo**: Cambio de stock de insumo; campos: tipo (INGRESO | SALIDA | AJUSTE | RECUENTO), cantidad, motivo, proveedor (para ingresos), lote (para ingresos), costoUnitario (para ingresos), stockAntes, stockDespues, responsable, fecha.
- **RecetaProducto**: Composición de un producto o variante; campos: productoId, varianteId (opcional — si presente, la receta aplica solo a esa variante; si ausente, aplica a todas las variantes del producto que no tengan receta propia), líneas de receta con insumoId y cantidadPorUnidad.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Los operadores pueden registrar un ajuste de inventario completo (con motivo y responsable) en menos de 1 minuto.
- **SC-002**: Los operadores pueden completar un recuento de hasta 50 productos con ajuste automático reflejado al finalizar, en menos de 15 minutos.
- **SC-003**: Las notificaciones de stock crítico llegan a los usuarios conectados del tenant en menos de 2 segundos desde que se registra el movimiento causante.
- **SC-004**: El historial de movimientos de cualquier producto o insumo se puede consultar y filtrar en menos de 3 segundos para períodos de hasta 12 meses.
- **SC-005**: El consumo de un producto con receta descuenta correctamente los insumos en el 100% de los casos cuando los stocks son suficientes.
- **SC-006**: Ninguna notificación de stock crítico del tenant A llega a usuarios del tenant B (aislamiento total entre tenants).
- **SC-007**: El sistema gestiona catálogos de hasta 1.000 insumos y 10.000 movimientos mensuales sin degradación visible en los tiempos de respuesta de los listados.

## Assumptions

- Los productos y variantes ya existen en el módulo de Catálogo Comercial (Feature 003); el módulo de inventario agrega la dimensión de stock a esas entidades sin duplicarlas.
- El "consumo de producto" es un registro explícito realizado por el operador o disparado por un módulo de ventas futuro; no existe aún integración automática con punto de venta.
- Los insumos son independientes del catálogo de productos: un tenant puede gestionar insumos sin que ningún producto tenga receta definida (almacén puro).
- El stock puede quedar en negativo si el operador confirma explícitamente una operación con insumos insuficientes.
- La unidad de medida de los insumos proviene del catálogo de unidades de medida del módulo de Catálogo Comercial (Feature 003).
- Los listados de insumos, movimientos y recuentos son de solo lectura para usuarios con rol de consulta; los ajustes, ingresos, salidas y definición de recetas requieren rol PROPIETARIO o ADMIN.
- La fecha de vencimiento de los insumos es informativa: el sistema advierte pero no bloquea automáticamente los movimientos (el operador decide).
- El módulo de inventario está aislado por tenant: cada tenant ve únicamente su propio stock, insumos y movimientos.
- Las alertas de stock crítico se emiten una vez por evento de movimiento; no se reemiten mientras el stock sigue bajo el mínimo sin nuevos movimientos que lo modifiquen.

## Clarifications

### Session 2026-05-22

- Q: ¿El consumo de insumos por receta es automático (disparado por un módulo de ventas externo) o manual? → A: Manual por el operador o vía llamada de módulo futuro; no hay integración automática en este feature.
- Q: ¿Los registros de stock son independientes por variante o existe un stock compartido a nivel de producto base? → A: Independiente por variante (Opción A): cada variante tiene su propio stock independiente; no existe stock a nivel de producto base.
- Q: ¿Cuándo se crea el registro de inventario de una variante — automáticamente al crearla en el catálogo, al primer movimiento, o manualmente? → A: Manual (Opción C): el operador debe inicializar explícitamente la variante en inventario (con stock inicial y stock mínimo) antes de poder registrar movimientos.
- Q: ¿Qué sucede cuando el operador desactiva un insumo que forma parte de una receta activa? → A: Se bloquea la desactivación (Opción B): igual restricción que la eliminación; el operador debe quitar el insumo de todas las recetas activas primero.
- Q: ¿Una receta aplica a todo el producto o puede definirse por variante? → A: Por variante, opcional con herencia (Opción B): si la variante tiene receta propia se usa esa; si no, hereda la receta del producto base; si ninguna tiene receta, el consumo solo descuenta stock del producto.
- Q: ¿El stock de insumos insuficiente bloquea el consumo o solo advierte? → A: Solo advierte y espera confirmación del operador; puede proceder dejando stock negativo.
- Q: ¿La fecha de vencimiento de insumos genera alertas proactivas automáticas? → A: No; solo muestra advertencia al operar el insumo vencido; fuera del alcance de este feature.
