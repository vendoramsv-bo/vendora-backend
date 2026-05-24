# Feature Specification: Sistema de Ventas y Caja

**Feature Branch**: `006-ventas-caja`  
**Created**: 2026-05-24  
**Status**: Draft  
**Input**: User description: "Construir el sistema de ventas y caja del tenant, compartido por todas las verticales."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configuración de Puntos de Venta y Turnos (Priority: P1)

Un administrador define los puntos de venta físicos del tenant (cajas registradoras, sucursales) y los turnos de atención (mañana, tarde, noche). Esta configuración es la base sobre la que operan las cajas y se registran las ventas.

**Why this priority**: Sin puntos de venta y turnos definidos, no es posible abrir cajas ni registrar ventas. Es el prerrequisito de todo el sistema.

**Independent Test**: Un administrador puede crear un punto de venta, luego un turno de atención, y ambos aparecen en sus respectivos listados con estado ACTIVO.

**Acceptance Scenarios**:

1. **Given** un tenant sin puntos de venta, **When** el administrador crea un punto de venta "Caja Principal" de tipo CAJA, **Then** aparece en el listado con estado ACTIVO y puede ser seleccionado al abrir una caja.
2. **Given** un punto de venta activo, **When** se cambia su estado a INACTIVO, **Then** no puede ser seleccionado para nuevas aperturas de caja.
3. **Given** un tenant sin turnos, **When** el administrador crea el turno "Mañana", **Then** aparece disponible para asignarlo a aperturas de caja.
4. **Given** un punto de venta existente con el mismo nombre en el tenant, **When** se intenta crear otro con el mismo nombre, **Then** el sistema rechaza la operación con un error de duplicado.

---

### User Story 2 - Apertura y Cierre de Caja (Priority: P2)

Un miembro del tenant abre una caja al inicio de su turno en un punto de venta, registrando el monto inicial. Durante el turno registra ingresos y egresos de efectivo con su motivo. Al finalizar, realiza un arqueo ingresando el monto contado, y el sistema calcula la diferencia contra el efectivo esperado.

**Why this priority**: La caja es el contexto obligatorio en el que ocurren las ventas. Sin una caja abierta, no se puede registrar una venta.

**Independent Test**: Un miembro puede abrir una caja, registrar un ingreso y un egreso, y cerrarla con un arqueo que muestra la diferencia correcta entre efectivo esperado y contado.

**Acceptance Scenarios**:

1. **Given** un punto de venta activo y un turno activo, **When** un miembro abre la caja con monto inicial $500, **Then** la caja queda en estado APERTURADA y el miembro puede registrar ventas en ella.
2. **Given** una caja aperturada, **When** se registra un ingreso de $200 por "Depósito del dueño", **Then** el total de ingresos de la caja aumenta en $200.
3. **Given** una caja aperturada con ventas en efectivo registradas, **When** el miembro cierra la caja ingresando $730 como monto contado, **Then** el sistema calcula la diferencia (efectivo esperado = monto_inicial + ingresos - egresos + ventas_efectivo) y registra el cierre con estado CERRADA.
4. **Given** una caja ya cerrada, **When** se intenta registrar una venta en ella, **Then** el sistema rechaza la operación.
5. **Given** ya existe una caja aperturada en el mismo punto de venta y turno por el mismo miembro el mismo día, **When** se intenta abrir otra, **Then** el sistema rechaza la duplicación.

---

### User Story 3 - Registro y Confirmación de Ventas (Priority: P3)

Un miembro registra una venta en una caja abierta. La venta puede ser para un cliente registrado en el sistema o para un cliente ocasional (con datos ingresados manualmente). Se seleccionan productos con cantidad, precio y descuento. Al confirmar, el stock de los productos vendidos disminuye automáticamente, y si el producto tiene insumos (receta), también disminuye el stock de los insumos correspondientes.

**Why this priority**: El registro de ventas es la funcionalidad central del módulo y el mayor generador de valor para el tenant.

**Independent Test**: Un miembro con una caja abierta puede registrar una venta con dos productos, confirmarla, y verificar que el stock de ambos disminuyó por la cantidad vendida.

**Acceptance Scenarios**:

1. **Given** una caja aperturada y productos con stock, **When** el miembro registra una venta con 3 unidades del producto A a $100 c/u y 1 unidad del producto B a $250, **Then** la venta muestra totalCantidad=4, totalVenta=550, y queda en estado de pago correspondiente.
2. **Given** una venta con tipo de pago EFECTIVO y monto $550 con efectivo entregado $600, **Then** el sistema calcula diferencia=$50 de cambio.
3. **Given** una venta confirmada con producto que tiene inventario activado, **When** se confirma la venta, **Then** el stock del producto/variante disminuye por la cantidad vendida y se registra un movimiento de tipo SALIDA.
4. **Given** una venta confirmada con un producto que tiene receta de insumos, **When** se confirma, **Then** el stock de cada insumo de la receta disminuye por (cantidad_vendida × cantidad_insumo_por_unidad).
5. **Given** una venta para cliente ocasional, **When** el miembro ingresa nombre y documento manualmente, **Then** la venta se registra con esos datos sin requerir un cliente pre-registrado.
6. **Given** una venta con descuento del 10% en un ítem de $100, **Then** el total del ítem es $90 y el descuento se refleja en el total de la venta.

---

### User Story 4 - Gestión de Pedidos en Línea (Priority: P4)

Un cliente puede armar un pedido seleccionando productos con cantidades. El pedido tiene estados (pendiente, en proceso, completado, cancelado). El staff puede convertir un pedido en una venta al procesarlo.

**Why this priority**: Los pedidos permiten anticipar la demanda y agilizar la atención. Son un canal de ingreso complementario a la venta directa.

**Independent Test**: Se puede crear un pedido con dos productos, cambiar su estado a "En proceso", y convertirlo en una venta que genera los movimientos de stock correspondientes.

**Acceptance Scenarios**:

1. **Given** un pedido en estado PENDIENTE, **When** el staff lo convierte en venta, **Then** se crea una venta con los mismos productos y cantidades del pedido, y el pedido queda vinculado a esa venta.
2. **Given** un pedido PENDIENTE, **When** se cancela, **Then** su estado cambia a CANCELADO y no puede ser procesado.
3. **Given** un pedido en cualquier estado excepto CANCELADO, **When** se consultan los pedidos activos, **Then** aparece en el listado filtrable por estado, fecha y cliente.
4. **Given** un cliente que accede al portal público del tenant, **When** selecciona productos y confirma su pedido, **Then** el pedido queda en estado PENDIENTE y el staff lo ve en el listado de pedidos activos para su procesamiento.

---

### User Story 5 - Registro de Gastos (Priority: P5)

El tenant registra gastos operativos (alquiler, servicios, insumos) con motivo, monto y fecha. Los gastos son visibles en los reportes financieros del tenant.

**Why this priority**: Los gastos completan el panorama financiero del tenant, permitiendo calcular la rentabilidad real del negocio.

**Independent Test**: Un administrador puede registrar un gasto de $1500 por "Alquiler mensual", y aparece en el listado de gastos del mes correspondiente.

**Acceptance Scenarios**:

1. **Given** un tenant activo, **When** el administrador registra un gasto con motivo, monto y fecha, **Then** el gasto aparece en el listado filtrable por fecha.
2. **Given** gastos registrados en distintas fechas, **When** se filtra por rango de fechas, **Then** solo aparecen los gastos del período seleccionado.

---

### User Story 6 - Reportes Consolidados de Ventas (Priority: P6)

El tenant puede consultar un reporte unificado de todas sus ventas, independientemente del punto de venta, turno, miembro o vertical del negocio de donde provengan. El reporte es filtrable y paginable.

**Why this priority**: Brinda visibilidad financiera integral al propietario del tenant para la toma de decisiones.

**Independent Test**: Un administrador puede ver en una sola vista todas las ventas del mes, con totales por día, tipo de pago y punto de venta.

**Acceptance Scenarios**:

1. **Given** ventas registradas en múltiples puntos de venta y turnos, **When** el administrador consulta el reporte consolidado, **Then** aparecen todas las ventas con sus totales, filtradas por fecha, punto de venta, turno y estado de pago.
2. **Given** el reporte consolidado, **When** se aplica filtro por tipo de pago EFECTIVO, **Then** solo aparecen las ventas con ese tipo de pago y el total corresponde.
3. **Given** ventas registradas en el módulo de ventas y cobros registrados en otras verticales del tenant (ej. citas de consultorio), **When** el administrador consulta el reporte consolidado, **Then** aparecen todos los ingresos del tenant unificados, con indicación de la fuente (vertical) de cada transacción.

---

### User Story 7 - Notificaciones en Tiempo Real (Priority: P7)

Todos los miembros conectados del tenant reciben notificaciones instantáneas cuando ocurren eventos relevantes: creación de ventas, apertura/cierre de cajas, y cambios en pedidos.

**Why this priority**: El tiempo real permite que el equipo reaccione inmediatamente ante eventos del negocio sin necesidad de recargar pantallas.

**Independent Test**: Dos miembros conectados al mismo tenant; cuando uno crea una venta, el otro recibe la notificación en menos de 2 segundos.

**Acceptance Scenarios**:

1. **Given** dos miembros conectados al mismo tenant, **When** uno crea una venta, **Then** ambos reciben el evento `ventas:venta:creada` con los datos de la venta.
2. **Given** un miembro conectado, **When** se abre o cierra una caja, **Then** recibe los eventos `ventas:caja:abierta` o `ventas:caja:cerrada`.
3. **Given** un miembro conectado, **When** el estado de un pedido cambia, **Then** recibe el evento `ventas:pedido:actualizado`.

---

### Edge Cases

- ¿Qué sucede si se intenta confirmar una venta con un producto cuyo stock es 0?
- ¿Qué sucede si la caja ya está cerrada y se intenta agregar un ingreso/egreso?
- ¿Qué sucede si un pedido tiene productos que ya no existen o están inactivos al momento de convertirlo en venta?
- ¿Qué sucede si el tipo de cambio es negativo (el cliente pagó menos del total)?
- ¿Qué sucede si dos miembros intentan abrir la misma caja simultáneamente?
- ¿Qué sucede si se intenta registrar una venta sin una caja abierta en el punto de venta seleccionado?

## Requirements *(mandatory)*

### Functional Requirements

**Puntos de Venta y Turnos**
- **FR-001**: El sistema DEBE permitir crear, editar, activar/desactivar puntos de venta con nombre, tipo (CAJA/SUCURSAL), dirección y teléfono opcionales.
- **FR-002**: El sistema DEBE garantizar que el nombre del punto de venta sea único dentro del tenant.
- **FR-003**: El sistema DEBE permitir crear, editar, activar/desactivar turnos de atención con nombre y descripción.
- **FR-004**: El nombre del turno DEBE ser único dentro del tenant.

**Apertura y Cierre de Caja**
- **FR-005**: El sistema DEBE permitir a un miembro abrir una caja especificando punto de venta, turno y monto inicial.
- **FR-006**: El sistema DEBE registrar ingresos y egresos de caja durante el turno, con motivo y monto.
- **FR-007**: Al cerrar la caja, el sistema DEBE calcular automáticamente el efectivo esperado y compararlo con el monto contado ingresado por el miembro.
- **FR-008**: Una caja cerrada NO DEBE poder recibir nuevas ventas, ingresos ni egresos.
- **FR-009**: Los listados de cajas DEBEN ser filtrables por estado, fecha y punto de venta, con paginación.

**Ventas**
- **FR-010**: Una venta DEBE estar asociada a una caja aperturada, un punto de venta, un turno y un miembro.
- **FR-011**: La venta DEBE aceptar cliente registrado (por ID) o cliente ocasional (nombre, documento ingresados manualmente).
- **FR-012**: El detalle de venta DEBE incluir producto/variante, etiqueta de variante, precio de venta, cantidad, descuento y total calculado.
- **FR-013**: El sistema DEBE calcular automáticamente totalCantidad, totalVenta y totalDescuento al agregar o modificar ítems.
- **FR-014**: Al confirmar una venta, el stock de cada variante con inventario activado DEBE decrementarse por la cantidad vendida.
- **FR-015**: Al confirmar una venta, si el producto tiene receta de insumos, el stock de cada insumo DEBE decrementarse por (cantidad_vendida × cantidad_por_unidad).
- **FR-016**: Los tipos de pago soportados son: EFECTIVO, QR, TARJETA_CREDITO, TARJETA_DEBITO, OTRO.
- **FR-017**: Los listados de ventas DEBEN ser filtrables por fecha, estado, cliente, tipo de pago y punto de venta, con paginación.
- **FR-018**: Las ventas DEBEN registrar quién las realizó (auditoría).

**Pedidos**
- **FR-019**: Un pedido DEBE permitir asociar un cliente y una lista de productos con cantidades.
- **FR-020**: Los pedidos DEBEN tener ciclo de vida: PENDIENTE → EN_PROCESO → COMPLETADO o CANCELADO.
- **FR-021**: Un pedido COMPLETADO o CANCELADO NO DEBE poder modificarse.
- **FR-022**: El sistema DEBE permitir convertir un pedido en una venta, creando automáticamente el detalle correspondiente.
- **FR-023**: Los listados de pedidos DEBEN ser filtrables por estado, fecha y cliente, con paginación.

**Gastos**
- **FR-024**: El sistema DEBE permitir registrar gastos con motivo, monto y fecha.
- **FR-025**: Los gastos DEBEN registrar quién los registró (auditoría).
- **FR-026**: Los listados de gastos DEBEN ser filtrables por fecha y estado, con paginación.

**Reportes**
- **FR-027**: El sistema DEBE proveer un reporte consolidado de ingresos del tenant filtrable por fecha, punto de venta, turno, tipo de pago y estado de pago, incluyendo ventas del módulo de ventas y cobros de otras verticales (ej. consultorio), con indicación de la fuente de cada transacción.

**Tiempo Real**
- **FR-028**: Al crear una venta, todos los miembros conectados del tenant DEBEN recibir el evento en tiempo real.
- **FR-029**: Al abrir o cerrar una caja, todos los miembros conectados DEBEN recibir el evento en tiempo real.
- **FR-030**: Al cambiar el estado de un pedido, todos los miembros conectados DEBEN recibir el evento en tiempo real.

### Key Entities

- **PuntoDeVenta**: Representa una ubicación física o virtual donde se realizan ventas. Atributos: nombre (único en tenant), tipo (CAJA/SUCURSAL), dirección, teléfono, estado.
- **TurnoDeAtencion**: Bloque temporal de trabajo (mañana, tarde, noche). Atributos: nombre (único en tenant), descripción, estado.
- **AperturaCierreDeCaja**: Sesión de trabajo de una caja en un turno. Atributos: punto de venta, turno, miembro, monto inicial, ingresos, egresos, ventas en efectivo, monto arqueo, estado (APERTURADA/CERRADA), fecha.
- **IngresosCaja**: Entrada de efectivo fuera de ventas durante una sesión de caja. Atributos: motivo, monto.
- **EgresosCaja**: Salida de efectivo durante una sesión de caja. Atributos: motivo, monto.
- **Venta**: Transacción comercial completa. Atributos: punto de venta, turno, caja, miembro, cliente (registrado u ocasional), total, descuento, efectivo, diferencia, tipo de pago, estado de pago, fecha.
- **VentaDetalle**: Línea de una venta. Atributos: producto, variante, etiqueta, precio, cantidad, descuento, total.
- **Pedido**: Solicitud anticipada de productos por un cliente. Atributos: cliente, estado, total, fecha.
- **PedidoDetalle**: Línea de un pedido. Atributos: producto, variante, precio, cantidad, total.
- **Gastos**: Gasto operativo del tenant. Atributos: motivo, monto, fecha, estado, quién registró.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un miembro puede completar el registro y confirmación de una venta estándar (cliente + 2 productos + pago) en menos de 3 minutos.
- **SC-002**: El arqueo de cierre de caja se calcula automáticamente sin errores en el 100% de los cierres.
- **SC-003**: El stock de productos e insumos se actualiza correctamente en el 100% de las ventas confirmadas.
- **SC-004**: Las notificaciones de eventos (venta creada, caja abierta/cerrada, pedido actualizado) llegan a los usuarios conectados en menos de 2 segundos.
- **SC-005**: Los reportes consolidados de ventas cargan en menos de 5 segundos para períodos de hasta 3 meses con hasta 10,000 ventas.
- **SC-006**: Los listados de ventas, pedidos y cajas responden con resultados paginados en menos de 2 segundos para datasets de hasta 50,000 registros.

## Clarifications

### Session 2026-05-24

- Q: ¿Los pedidos son creados por clientes desde una interfaz pública (portal de cliente) o exclusivamente por el staff del tenant desde el panel de administración? → A: Los pedidos son creados por clientes desde un portal público del tenant.
- Q: ¿El reporte consolidado debe incluir únicamente ventas del módulo de ventas, o también incorporar ingresos de otras verticales (ej. cobros de citas del consultorio)? → A: El reporte incluye ventas y cobros de todas las verticales del tenant (reporte financiero unificado).

## Assumptions

- Los puntos de venta y turnos son configuraciones del tenant que rara vez cambian; no se requiere historial de cambios.
- El stock negativo está permitido como comportamiento por defecto (el tenant puede vender bajo pedido); la validación de stock suficiente es opcional.
- El precio de venta en el detalle puede diferir del precio catálogo del producto (el vendedor puede ajustarlo al momento de la venta).
- El descuento se aplica por línea de detalle, no como descuento global a la venta completa (aunque el total de descuentos se acumula en la venta).
- El sistema multivertical (consultorio, catálogo, almacén) ya existe; este módulo se integra con el stock existente de productos y variantes.
- Los reportes consolidados son de solo lectura; no incluyen operaciones de escritura.
- La autenticación y control de acceso multi-tenant ya están implementados en el sistema base.
- Un miembro solo puede tener una caja aperturada a la vez en un punto de venta y turno para una fecha dada.
- Las ventas con pago EN_ESPERA (QR, tarjeta) pueden registrarse y confirmarse independientemente de la confirmación del pago externo.
