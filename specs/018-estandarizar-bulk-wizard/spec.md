# Feature Specification: Estandarización de los Procesos BULK del Wizard de Tenant

**Feature Branch**: `018-estandarizar-bulk-wizard`
**Created**: 2026-07-20
**Status**: Draft
**Input**: User description: "Se requiere analizar todos los procesos BULK para la creacion de un Tenant, ya que como el de Productos, no elimina productos que el usuario quito al pasar al paso siguiente y retornar al paso de edicion de Productos en el frontend. Realizar la revision de todos los procesos BULK para que su comportamiento sea standard, en todos los pasos de creacion del TENANT."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quitar un producto seleccionado se refleja al volver al paso (Priority: P1)

Durante el wizard de creación de tienda, el propietario selecciona varios productos del catálogo global en el paso "Productos", avanza al siguiente paso y luego regresa al paso de Productos para quitar uno de los que había elegido. Al guardar y avanzar nuevamente, el producto quitado ya no debe existir en el catálogo de su tenant.

**Why this priority**: Es el defecto reportado explícitamente — hoy el producto quitado permanece en la base de datos aunque el usuario lo haya deseleccionado, generando un catálogo inicial con ítems no deseados.

**Independent Test**: Puede probarse de forma aislada llamando dos veces al paso de selección masiva de productos (primero con un conjunto A, luego con un subconjunto de A) y verificando que el catálogo del tenant termina con exactamente el segundo conjunto.

**Acceptance Scenarios**:

1. **Given** el tenant tiene 3 productos guardados desde una selección previa del wizard, **When** el propietario reenvía el paso de Productos con solo 2 de esos 3 productos, **Then** el catálogo del tenant queda con exactamente esos 2 productos (el tercero ya no aparece).
2. **Given** el tenant no tiene productos guardados aún, **When** el propietario envía el paso de Productos con una selección de N productos, **Then** el catálogo del tenant queda con exactamente esos N productos.
3. **Given** el tenant tiene productos guardados que ya registran movimientos operativos (p. ej. ventas o ajustes de stock), **When** el propietario quita esos productos de su selección y reenvía el paso, **Then** el producto se conserva sin cambios (no se elimina) en lugar de perder ese historial silenciosamente.

---

### User Story 2 - Todos los pasos BULK del wizard se comportan igual (Priority: P1)

Un propietario que arma su tienda, consultorio o restaurante navega por varios pasos del wizard que permiten seleccionar múltiples elementos (actividades económicas, proveedores, servicios médicos, turnos de atención, seguros, especialidades, tipos de cocina, zonas y mesas). En cualquiera de esos pasos, si agrega y luego quita elementos antes de finalizar, espera que el comportamiento sea el mismo en todos: lo que finalmente selecciona es lo que queda guardado, ni más ni menos.

**Why this priority**: El usuario pidió explícitamente que la revisión cubra "todos los procesos BULK" y "todos los pasos de creación del tenant", no solo Productos. Sin esta historia, el arreglo quedaría parcial y el problema reaparecería en otro paso.

**Independent Test**: Puede probarse recorriendo cada paso BULK del wizard (uno por uno, para cada tipo de negocio aplicable) con una secuencia agregar → quitar → reenviar, y confirmando que el estado final coincide con la última selección enviada en todos los casos.

**Acceptance Scenarios**:

1. **Given** cualquier paso BULK del wizard (actividades económicas, proveedores, servicios médicos, turnos de atención, seguros, especialidades, tipos de cocina o zonas), **When** el propietario envía una selección que agrega elementos nuevos y omite elementos previamente guardados, **Then** el resultado guardado contiene exactamente los elementos de la última selección enviada.
2. **Given** un propietario que reenvía el mismo paso BULK dos veces con la selección idéntica, **When** se procesa el segundo envío, **Then** no se generan duplicados ni cambios adicionales.
3. **Given** un propietario que regresa a un paso BULK ya completado, **When** el frontend necesita mostrar la selección actual, **Then** existe una forma de consultar el estado guardado de ese paso para pre-cargar la selección correctamente.

---

### User Story 3 - Los elementos ya usados no se pierden silenciosamente (Priority: P2)

Si el propietario retrocede en el wizard y quita un elemento que el sistema ya utilizó en otro lugar de su tenant (por ejemplo, un producto con movimientos de stock, o un punto de venta con ventas registradas), el sistema no debe destruir ese historial sin más: debe aplicar el mismo criterio de protección que ya existe hoy para Puntos de Venta.

**Why this priority**: Es una extensión natural de estandarizar el comportamiento — ya existe un precedente (Puntos de Venta) que evita borrar en cascada historial operativo real; el resto de los pasos BULK deben seguir el mismo criterio para ser consistentes.

**Independent Test**: Puede probarse creando un elemento vía un paso BULK, generándole datos dependientes (según el tipo de elemento) y luego quitándolo de una nueva selección, verificando que el sistema sigue la política de protección definida en vez de eliminarlo sin condiciones.

**Acceptance Scenarios**:

1. **Given** un elemento creado por un paso BULK que ya tiene datos dependientes asociados, **When** el propietario lo quita de una nueva selección enviada al mismo paso, **Then** el elemento se conserva sin cambios en vez de eliminarse incondicionalmente.
2. **Given** un elemento creado por un paso BULK que NO tiene datos dependientes asociados, **When** el propietario lo quita de una nueva selección, **Then** el elemento se elimina normalmente.

---

### Edge Cases

- ¿Qué ocurre cuando el propietario envía un paso BULK con una lista vacía? El resultado esperado es que se vacíe la selección de ese paso, salvo los elementos con datos dependientes, que se conservan (ver FR-004).
- ¿Qué ocurre si dos envíos del mismo paso BULK llegan casi simultáneamente (dos pestañas del wizard abiertas)? El último envío procesado exitosamente determina el estado final; no deben quedar duplicados ni estados intermedios inconsistentes.
- ¿Qué ocurre si un elemento fue quitado del catálogo global (fuente del cual se seleccionan productos/proveedores/etc.) entre que el usuario lo seleccionó y lo reenvía? El paso BULK no debe fallar por elementos que ya no están disponibles en el origen; el comportamiento debe ser consistente con cómo se manejan hoy los IDs no encontrados en cada paso.
- ¿Qué ocurre si el propietario modifica la selección de un paso BULK después de que el wizard ya fue marcado como `FINALIZADO`? Ver Asunciones — el wizard no es la vía prevista para edición post-alta; este comportamiento estándar aplica mientras el tenant está en proceso de creación.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Cada paso BULK del wizard de creación de tenant (actividades económicas, productos, servicios médicos, proveedores, turnos de atención, seguros, especialidades, tipos de cocina/categorías y zonas) DEBE tratar cada envío como la selección definitiva y completa para ese paso: el estado guardado después del envío debe coincidir exactamente con el conjunto enviado.
- **FR-002**: El sistema DEBE agregar los elementos incluidos en el envío que no estuvieran guardados previamente para ese tenant.
- **FR-003**: El sistema DEBE quitar los elementos guardados previamente para ese tenant que ya no estén incluidos en el envío, salvo que apliquen las protecciones de FR-004.
- **FR-004**: El sistema DEBE aplicar la misma política de protección de datos en uso definida para Puntos de Venta a los demás elementos gestionados por un paso BULK: un elemento con datos dependientes asociados se conserva sin cambios (no se elimina) cuando el usuario lo quita de su selección; un elemento sin datos dependientes se elimina normalmente.
- **FR-005**: El sistema NO DEBE crear duplicados cuando un elemento ya guardado se reenvía en un envío BULK posterior para el mismo paso.
- **FR-006**: El sistema DEBE permitir enviar una selección vacía para vaciar por completo lo guardado en un paso (sujeto a FR-004).
- **FR-007**: Cada paso BULK DEBE ofrecer una forma de consultar la selección actualmente guardada, de modo que el wizard pueda reconstruir el estado al regresar a un paso ya completado.
- **FR-008**: El comportamiento estandarizado de sincronización DEBE aplicarse de manera uniforme sin importar el tipo de negocio del tenant (tienda, consultorio o restaurante).
- **FR-009**: El sistema DEBE seguir informando errores claros cuando el envío BULK incluye identificadores que no existen en el catálogo/origen correspondiente, de forma consistente entre todos los pasos.

### Key Entities

Esta funcionalidad estandariza el comportamiento de sincronización sobre entidades ya existentes del wizard; no introduce entidades nuevas:

- **Selección de paso BULK**: el conjunto de elementos (IDs) que el propietario elige en un paso del wizard (p. ej. productos, servicios médicos, turnos, proveedores, actividades económicas, especialidades, tipos de cocina, zonas). Representa el estado "deseado" que debe reflejarse exactamente en lo guardado tras cada envío.
- **Elemento con datos dependientes**: cualquier elemento gestionado por un paso BULK que ya tiene información operativa asociada generada fuera del propio paso BULK (p. ej. movimientos de stock de un producto, una cita que usa un servicio médico, un turno ya asignado). Es la condición que activa la política de protección de FR-004.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de los pasos BULK del wizard (todos los tipos de negocio) muestran el mismo comportamiento de "agregar lo nuevo, quitar lo deseleccionado" al ser probados con la misma secuencia agregar → quitar → reenviar.
- **SC-002**: Un usuario que quita un elemento sin datos dependientes en cualquier paso BULK y vuelve a consultar ese paso ve el elemento ausente el 100% de las veces (cero elementos "fantasma").
- **SC-003**: Cero incidentes de pérdida de historial operativo (ventas, movimientos de stock, citas, aperturas de caja, etc.) causados por una edición de selección en el wizard, para elementos con datos dependientes.
- **SC-004**: Un propietario puede ir y volver libremente entre pasos del wizard cambiando su selección, sin necesidad de limpieza manual posterior, en el 100% de los pasos BULK existentes.

## Assumptions

- Puntos de Venta ya implementa el patrón objetivo (crear los que faltan + eliminar de forma segura los sobrantes sin datos dependientes) y sirve como referencia del comportamiento estándar a extender al resto de los pasos BULK.
- El alcance de "paso BULK" se limita a los endpoints de selección múltiple del wizard de creación de tenant (`/api/tenant/...`); no incluye otros procesos de carga masiva del sistema fuera del wizard (p. ej. importaciones de catálogo posteriores al alta), salvo que se decida extenderlo más adelante.
- El wizard se usa durante el alta inicial del tenant (antes o alrededor del paso `FINALIZADO`); una vez operativo, la gestión contínua de estos elementos se realiza desde las pantallas CRUD dedicadas, no desde el wizard.
- Esta especificación cubre el comportamiento del backend (qué debe quedar guardado y cómo debe poder consultarse); los ajustes de frontend necesarios para aprovechar la consulta de estado (FR-007) se consideran trabajo complementario fuera de este alcance específico.

## Clarifications

### Session 2026-07-20

- **Q**: ¿Qué política de protección deben aplicar todos los pasos BULK del wizard cuando el usuario quita un elemento que ya tiene datos dependientes asociados (ventas, movimientos de stock, citas, etc.)? → **A**: Eliminación protegida (igual que Puntos de Venta) — si el elemento tiene datos dependientes se conserva tal cual (no se borra); si no tiene datos dependientes, se elimina normalmente.
