# Feature Specification: Gestión de Clientes, Proveedores y Compras

**Feature Branch**: `005-clientes-proveedores-compras`
**Created**: 2026-05-23
**Status**: Draft
**Input**: Construir la gestión de clientes, proveedores y compras del tenant.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gestión de Clientes (Priority: P1)

El usuario gestiona la cartera de clientes del tenant: crea nuevos clientes con sus datos de contacto y fecha de cumpleaños, los busca, actualiza su información y los desactiva.

**Why this priority**: Los clientes son el primer punto de contacto del negocio. Un directorio de clientes es prerequisito para relacionar ventas y fidelizar clientela.

**Independent Test**: Crear cliente "María García" con email maria@test.com y cumpleaños día 15 mes 8; buscar por nombre "María" → aparece; intentar crear otro cliente con el mismo email en el mismo tenant → error de duplicado; actualizar teléfono → cambio reflejado en tiempo real para usuarios conectados.

**Acceptance Scenarios**:

1. **Given** un tenant activo, **When** el usuario crea un cliente con nombre, email, teléfono, dirección y fecha de cumpleaños (día y mes), **Then** el cliente queda registrado en estado ACTIVO y visible en el listado.
2. **Given** un cliente existente con email "a@b.com", **When** otro usuario intenta crear un cliente con el mismo email en el mismo tenant, **Then** el sistema rechaza con error `ClienteEmailDuplicado`.
3. **Given** un cliente existente con nombre "Juan Pérez", **When** otro usuario intenta crear un cliente con el mismo nombre en el mismo tenant, **Then** el sistema rechaza con error `ClienteNombreDuplicado`.
4. **Given** un cliente existente, **When** el usuario actualiza sus datos, **Then** los cambios se reflejan en tiempo real para todos los usuarios del tenant conectados.
5. **Given** un listado con múltiples clientes, **When** el usuario filtra por nombre "Ana", **Then** solo aparecen clientes cuyo nombre contiene "Ana".
6. **Given** un cliente activo, **When** el usuario lo desactiva, **Then** el cliente pasa a estado INACTIVO y puede reactivarse posteriormente.

---

### User Story 2 - Gestión de Proveedores (Priority: P2)

El usuario gestiona el directorio de proveedores del tenant: registra proveedores con su información fiscal y de contacto, los busca, actualiza y desactiva.

**Why this priority**: Los proveedores son prerequisito para registrar compras. Sin al menos un proveedor activo no se puede registrar ninguna compra.

**Independent Test**: Crear proveedor "Distribuidora ABC" con NIT "900123456-1"; buscar por nombre "ABC" → aparece en listado; intentar crear otro con mismo NIT en mismo tenant → error; intentar eliminar proveedor con compras asociadas → error.

**Acceptance Scenarios**:

1. **Given** un tenant activo, **When** el usuario crea un proveedor con nombre, NIT, dirección, teléfono, departamento, sitio web y descripción de productos que ofrece, **Then** el proveedor queda registrado en estado ACTIVO.
2. **Given** un proveedor existente con nombre "Molino ABC", **When** otro usuario intenta crear un proveedor con el mismo nombre en el mismo tenant, **Then** el sistema rechaza con error `ProveedorNombreDuplicado`.
3. **Given** un proveedor existente con NIT "900123456-1", **When** otro usuario intenta crear un proveedor con el mismo NIT en el mismo tenant, **Then** el sistema rechaza con error `ProveedorNITDuplicado`.
4. **Given** un proveedor con al menos una compra registrada, **When** el usuario intenta eliminar ese proveedor, **Then** el sistema rechaza indicando que tiene compras asociadas (`ProveedorEnUsoError`).
5. **Given** un proveedor activo, **When** el usuario lo desactiva, **Then** el proveedor pasa a INACTIVO y no aparece en el selector de proveedor para nuevas compras.

---

### User Story 3 - Registro y Gestión de Compras (Priority: P3)

El usuario registra compras a proveedores en estado PENDIENTE, especificando los productos comprados con cantidades y precios, y opcionalmente agrega costos adicionales (flete, impuestos).

**Why this priority**: El registro de la compra en borrador/pendiente es el paso previo a la confirmación. Sin este flujo no hay compras que confirmar.

**Independent Test**: Crear compra al proveedor "Distribuidora ABC" con 2 líneas de productos (10 × producto A a $5.000 c/u con precio estimado venta $8.000; 5 × variante B a $12.000 c/u con precio estimado venta $18.000) + costo adicional "Flete" $3.000 → compra guardada en estado PENDIENTE; stock de productos sin cambio; editar cantidad del primer detalle → totalCompra recalculado.

**Acceptance Scenarios**:

1. **Given** al menos un proveedor activo y productos en el catálogo, **When** el usuario crea una compra con proveedor, fecha, descripción y detalles de productos, **Then** la compra queda en estado PENDIENTE con su totalCompra calculado y sin cambios en el inventario.
2. **Given** una compra PENDIENTE, **When** el usuario agrega, edita o elimina líneas de detalle, **Then** los cambios se guardan y el total se actualiza sin afectar el inventario.
3. **Given** una compra PENDIENTE, **When** el usuario agrega un costo adicional con motivo "Flete" y monto $3.000, **Then** el costo queda asociado a la compra y el totalCostoAdicional se actualiza.
4. **Given** una compra PENDIENTE, **When** el usuario la elimina, **Then** la compra y todos sus detalles y costos adicionales quedan eliminados.

---

### User Story 4 - Confirmación de Compra (Priority: P4)

Al confirmar una compra PENDIENTE, el sistema incrementa automáticamente el stock de cada producto o variante incluido en el detalle y cambia el estado de la compra a CONFIRMADA.

**Why this priority**: La confirmación es el acto que materializa la recepción de mercancía y actualiza el inventario; es el momento de mayor valor de negocio en este flujo.

**Independent Test**: Compra pendiente con "Camisa Talla M" (varianteId X) × 20 unidades → confirmar → stock de variante X aumenta en 20 y compra pasa a CONFIRMADA; intentar confirmar de nuevo → error `CompraYaConfirmadaError`; variante sin inventario activado en esa misma compra → línea se omite con advertencia pero la confirmación continúa.

**Acceptance Scenarios**:

1. **Given** una compra PENDIENTE con N líneas de detalle, **When** el usuario confirma la compra, **Then** el stock de cada variante (o producto, si no hay variante) en el detalle aumenta según la cantidad comprada y la compra pasa a estado CONFIRMADA.
2. **Given** una compra ya CONFIRMADA, **When** el usuario intenta confirmarla de nuevo, **Then** el sistema rechaza con error `CompraYaConfirmadaError`.
3. **Given** una compra PENDIENTE con una línea cuya variante no tiene inventario activado, **When** el usuario confirma, **Then** la compra se confirma de todos modos, el stock de las demás líneas se actualiza y se registra una advertencia para la línea sin inventario.
4. **Given** una compra CONFIRMADA, **When** el usuario intenta eliminarla, **Then** el sistema rechaza con error.

---

### User Story 5 - Notificaciones en Tiempo Real (Priority: P5)

Los cambios en clientes, proveedores y compras se propagan instantáneamente a todos los usuarios del tenant que estén conectados, sin necesidad de recargar la página.

**Why this priority**: Mejora la colaboración en equipos donde varios operadores trabajan simultáneamente con el mismo tenant.

**Independent Test**: Dos usuarios del tenant A conectados; usuario A crea un nuevo proveedor → usuario B lo ve aparecer sin recargar; usuario A confirma una compra → usuario B recibe evento con datos de la compra confirmada.

**Acceptance Scenarios**:

1. **Given** dos usuarios del mismo tenant conectados, **When** el usuario A crea o modifica un cliente, **Then** el usuario B recibe el evento en menos de 2 segundos sin recargar.
2. **Given** dos usuarios del mismo tenant conectados, **When** el usuario A confirma una compra, **Then** el usuario B recibe un evento `ventas:compra:confirmada` con el id de la compra.
3. **Given** usuarios de tenants distintos conectados, **When** el usuario A realiza cambios en su tenant, **Then** los usuarios de otros tenants no reciben esas notificaciones.

---

### Edge Cases

- Crear cliente con email duplicado en mismo tenant → `ClienteEmailDuplicado` (HTTP 409)
- Crear cliente con nombre duplicado en mismo tenant → `ClienteNombreDuplicado` (HTTP 409)
- Crear proveedor con nombre duplicado en mismo tenant → `ProveedorNombreDuplicado` (HTTP 409)
- Crear proveedor con NIT duplicado en mismo tenant → `ProveedorNITDuplicado` (HTTP 409)
- Eliminar proveedor con compras asociadas → `ProveedorEnUsoError` (HTTP 422)
- Confirmar compra ya CONFIRMADA → `CompraYaConfirmadaError` (HTTP 422)
- Eliminar compra CONFIRMADA → error (HTTP 422)
- Confirmar compra con variante sin inventario activado → advertencia, línea omitida, confirmación continúa
- Proveedor desactivado referenciado en compra existente: la compra puede confirmarse igual; el proveedor solo bloquea nuevas compras en el selector

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir crear, leer, actualizar y cambiar el estado (ACTIVO/INACTIVO) de clientes dentro del tenant.
- **FR-002**: El nombre del cliente DEBE ser único dentro del tenant; el email del cliente también DEBE ser único dentro del tenant.
- **FR-003**: Los clientes DEBEN tener: nombre, email (opcional), dirección (opcional), teléfono (opcional), día de cumpleaños (1–31, opcional), mes de cumpleaños (1–12, opcional), estado (ACTIVO/INACTIVO), createdById, updatedById.
- **FR-004**: El sistema DEBE permitir buscar clientes por nombre y paginar, filtrar y ordenar los resultados.
- **FR-005**: El sistema DEBE permitir crear, leer, actualizar y cambiar el estado (ACTIVO/INACTIVO) de proveedores dentro del tenant.
- **FR-006**: El nombre del proveedor DEBE ser único dentro del tenant; el NIT del proveedor también DEBE ser único dentro del tenant.
- **FR-007**: Los proveedores DEBEN tener: nombre, NIT (opcional), dirección (opcional), teléfono (opcional), departamento (opcional), sitio web (opcional), descripción de productos que ofrece (texto libre, opcional), estado (ACTIVO/INACTIVO), createdById, updatedById.
- **FR-008**: El sistema NO DEBE permitir eliminar un proveedor que tenga compras asociadas.
- **FR-009**: El sistema DEBE permitir crear compras en estado PENDIENTE con: proveedor, fecha, descripción, detalles de productos (productoId, varianteId opcional, cantidad, precioCompra, precioEstimadoVenta) y costos adicionales (motivo, monto).
- **FR-010**: El sistema DEBE permitir actualizar compras en estado PENDIENTE: editar cabecera, agregar/editar/eliminar líneas de detalle y costos adicionales.
- **FR-011**: El sistema NO DEBE permitir modificar ni eliminar compras en estado CONFIRMADA.
- **FR-012**: Al confirmar una compra PENDIENTE, el sistema DEBE incrementar atómicamente el stock de cada variante (o producto base si no hay variante específica) en el detalle y cambiar el estado de la compra a CONFIRMADA.
- **FR-013**: Si una línea de detalle de compra referencia una variante sin inventario activado, la confirmación DEBE omitir esa línea con una advertencia y proceder con las demás.
- **FR-014**: El sistema NO DEBE permitir confirmar una compra ya CONFIRMADA.
- **FR-015**: Los listados de clientes, proveedores y compras DEBEN soportar: paginación, filtrado, ordenamiento y búsqueda por nombre.
- **FR-016**: Toda creación y modificación DEBE registrar el usuario que realizó la acción (createdById, updatedById).
- **FR-017**: Los cambios en clientes, proveedores y compras DEBEN emitirse en tiempo real exclusivamente al tenant propietario del recurso.

### Key Entities

- **Cliente**: persona o empresa que compra al tenant; campos: nombre (único en tenant), email (único en tenant, opcional), dirección, teléfono, diaNacimiento (1–31), mesNacimiento (1–12), estado (ACTIVO/INACTIVO); vinculado a un tenant.
- **Proveedor**: empresa que abastece al tenant; campos: nombre (único en tenant), nit (único en tenant, opcional), dirección, teléfono, departamento, sitioWeb, productosOfrece (texto libre), estado (ACTIVO/INACTIVO); vinculado a un tenant. El mismo proveedor es referenciado por los ingresos de almacén.
- **Compra**: registro de compra a proveedor; campos: fecha, descripcion, estado (PENDIENTE/CONFIRMADA), totalCantidad, totalCompra, totalCostoAdicional; relaciones: proveedor, detalles de compra, costos adicionales; createdById, updatedById.
- **DetalleCompra**: línea de detalle de una compra; campos: productoId, varianteId (opcional), etiquetaVariante, cantidad, precio (precioCompra), precioEstimadoVenta, total.
- **CostoAdicionalCompra**: costo adicional de una compra; campos: motivo (único por compra, ej. "Flete", "Impuesto"), costo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede registrar un nuevo cliente o proveedor en menos de 1 minuto.
- **SC-002**: La búsqueda por nombre en listados retorna resultados en menos de 1 segundo con hasta 10.000 registros en el tenant.
- **SC-003**: La confirmación de una compra actualiza el stock de todos los productos incluidos de forma atómica: si falla cualquier actualización, ninguna se aplica.
- **SC-004**: Los eventos en tiempo real llegan a los usuarios conectados del mismo tenant en menos de 2 segundos tras la operación.
- **SC-005**: El 100% de las compras creadas y confirmadas tienen createdById y updatedById identificables.

## Assumptions

- El catálogo de productos y variantes ya existe (Feature 003). Las compras referencian productos/variantes del catálogo del tenant.
- El control de inventario de variantes ya existe (Feature 004). La confirmación de compra utiliza el mecanismo de stock existente para variantes con `inventarioActivado=true`.
- Los "productos que ofrece" del proveedor es un campo de texto libre, no una relación con el catálogo de productos.
- El estado CONFIRMADA de las compras requiere agregar el valor `CONFIRMADA` al enum `Estado` del schema compartido.
- El estado CONFIRMADA es terminal: las compras confirmadas no pueden cancelarse ni revertirse en esta versión.
- Solo compras en estado PENDIENTE pueden modificarse o eliminarse.
- La fecha de cumpleaños del cliente almacena solo día y mes (no el año), por privacidad.
- Un proveedor desactivado puede seguir siendo referenciado en compras existentes y puede confirmarlas; solo queda excluido del selector para nuevas compras.
- La misma entidad `Proveedor` (schema `ventas`) es utilizada tanto por las compras como por los ingresos de almacén (Feature 004).
- No hay integración con sistemas externos de facturación o ERP en esta versión.
