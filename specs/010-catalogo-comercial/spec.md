# Feature Specification: Catálogo Comercial del Tenant

**Feature Branch**: `010-catalogo-comercial`  
**Created**: 2026-05-26  
**Status**: Draft  
**Input**: Módulo de catálogo comercial transversal — gestión completa de productos para cualquier vertical de negocio.

---

## Clarifications

### Session 2026-05-26

- Q: ¿Cuáles son los valores exactos del enum `tipoDescuento`? → A: `SIN_DESCUENTO`, `PORCENTAJE`, `MONTO_FIJO`
- Q: ¿Cómo se crean las variantes — automático (cartesiano), manual, o híbrido? → A: Híbrido — el sistema propone el producto cartesiano de los atributos como punto de partida; el usuario puede eliminar combinaciones no deseadas antes de confirmar.
- Q: ¿Cómo interactúa este módulo con el de inventario para movimientos de "creacion"? → A: Acceso directo a la tabla — este módulo escribe y elimina registros de MovimientoInventario directamente usando el cliente de base de datos compartido, sin pasar por el módulo de inventario.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Gestión de Productos (Priority: P1)

Un miembro del tenant (PROPIETARIO, ADMIN o ENCARGADO) crea, consulta, edita y elimina productos en el catálogo de su negocio. Cada producto tiene código único, nombre único en su categoría, tipo (comercialización, servicio, plato, bebida, postre, complemento), precio, stock, unidad de medida, categoría y actividad económica. Antes de crear un producto puede verificar si el código ya existe para evitar duplicados. Al crear un producto de tipo "comercialización", el sistema registra automáticamente un movimiento de inventario inicial.

**Why this priority**: Es el núcleo del catálogo. Sin gestión de productos no hay catálogo. Todas las demás historias dependen de este flujo base.

**Independent Test**: Crear un producto de tipo comercialización con todos los campos obligatorios → verificar que aparece en el listado → editarlo → eliminar → verificar que el movimiento de inventario inicial también fue eliminado.

**Acceptance Scenarios**:

1. **Given** el staff autenticado quiere crear un producto, **When** consulta si el código "PROD-001" existe en el tenant, **Then** el sistema responde `{ exists: true, producto: { id, nombre, codigo } }` si existe, o `{ exists: false }` si no.
2. **Given** el código no existe, **When** crea un producto de tipo "COMERCIALIZACION" con código, nombre, unidad de medida, categoría, actividad económica, tipo de descuento y estado, **Then** el producto se crea en estado ACTIVO y se registra automáticamente un movimiento de inventario de tipo "creacion" con el stock inicial indicado.
3. **Given** se intenta crear con código ya existente en el mismo tenant, **When** se envía la solicitud, **Then** el sistema rechaza con error indicando el código duplicado.
4. **Given** se intenta crear con nombre ya existente en la misma categoría y tenant, **When** se envía la solicitud, **Then** el sistema rechaza con error indicando el nombre duplicado.
5. **Given** un producto de tipo "SERVICIO", **When** se crea el producto, **Then** no se genera ningún movimiento de inventario.
6. **Given** un producto de tipo comercialización con solo el movimiento de creación, **When** se cambia el stock inicial, **Then** el movimiento de creación se actualiza y el stock del producto refleja el nuevo valor.
7. **Given** un producto con movimientos reales (ventas, compras, ajustes), **When** se intenta modificar su stock inicial, **Then** el sistema rechaza la operación con error.
8. **Given** un producto de tipo comercialización con movimiento de creación, **When** se elimina el producto, **Then** el movimiento de inventario de tipo "creacion" también se elimina.
9. **Given** el staff consulta el listado de productos, **When** aplica filtros (nombre, código, tipo, estado, rango de precio, rango de stock, fechas), **Then** el listado responde paginado con metadata (total, página, límite, totalPáginas, tieneSiguiente, tieneAnterior) y solo los resultados que cumplen los filtros.

---

### User Story 2 — Variantes y Precios Especiales (Priority: P2)

Un miembro del tenant configura variantes de un producto (por ejemplo, talla S/M/L y color rojo/azul), cada una con precio, stock e imagen propios. También puede definir precios por volumen (descuento por cantidad mayor) y ofertas temporales con fecha de inicio y fin.

**Why this priority**: Amplía la utilidad del catálogo para negocios que manejan productos con múltiples presentaciones o estrategias de precio diferenciadas.

**Independent Test**: Crear producto → agregar dos atributos (talla, color) → generar variantes combinando valores → configurar precio de volumen → crear oferta por fechas → verificar que cada variante tiene precio y stock independiente.

**Acceptance Scenarios**:

1. **Given** un producto existente, **When** se definen atributos (nombre + valores) y se solicita la vista previa de variantes, **Then** el sistema devuelve todas las combinaciones posibles (producto cartesiano) para que el usuario revise y elimine las no deseadas antes de confirmar.
2. **Given** un producto con variantes, **When** se consulta el producto, **Then** la respuesta incluye la lista de variantes con sus precios y stocks individuales.
3. **Given** un producto, **When** se crea un precio por volumen (cantidad mínima, precio por unidad), **Then** el listado de precios de volumen refleja la nueva regla y puede editarse o eliminarse.
4. **Given** un producto, **When** se crea una oferta con precio especial, fecha de inicio y fecha de fin, **Then** la oferta queda registrada y el campo `creadoPor` / `modificadoPor` refleja al usuario que la creó.
5. **Given** un producto, **When** se consulta el historial de precios, **Then** el sistema devuelve los cambios de precio anteriores ordenados por fecha descendente.

---

### User Story 3 — Alta Masiva desde Catálogo Maestro (Priority: P3)

Un miembro del tenant selecciona una o más plantillas del catálogo maestro y crea múltiples productos de golpe. Si la categoría o la unidad de medida de la plantilla no existen en el tenant, se crean automáticamente. Los productos creados tienen stock inicial cero.

**Why this priority**: Acelera la carga inicial del catálogo para negocios nuevos o que adoptan líneas de productos estandarizadas.

**Independent Test**: Seleccionar 3 plantillas del catálogo maestro → ejecutar alta masiva → verificar que se crearon 3 productos con stock cero → verificar que las categorías y unidades de medida faltantes fueron creadas automáticamente.

**Acceptance Scenarios**:

1. **Given** el staff quiere crear productos masivamente, **When** envía una lista de IDs de plantillas del catálogo maestro (mínimo 1), **Then** el sistema crea un producto por cada plantilla y devuelve el listado de productos creados.
2. **Given** la plantilla referencia una categoría que no existe en el tenant, **When** se ejecuta el alta masiva, **Then** la categoría se crea automáticamente vinculada al maestro.
3. **Given** la plantilla referencia una unidad de medida que no existe en el tenant, **When** se ejecuta el alta masiva, **Then** la unidad de medida se crea automáticamente vinculada al maestro.
4. **Given** la lista de plantillas está vacía, **When** se envía la solicitud, **Then** el sistema rechaza con error indicando que se requiere al menos una plantilla.
5. **Given** el alta masiva se ejecuta correctamente, **When** se revisan los productos creados, **Then** todos tienen `stockActual = 0` y el campo `creadoPor` corresponde al usuario que ejecutó la operación.

---

### User Story 4 — Actualizaciones en Tiempo Real (Priority: P4)

Cuando un usuario del tenant crea, actualiza o elimina un producto, categoría u oferta, los demás usuarios conectados del mismo tenant lo ven reflejado en tiempo real sin necesidad de recargar.

**Why this priority**: Mejora la colaboración en equipos que gestionan el catálogo simultáneamente.

**Independent Test**: Dos sesiones activas del mismo tenant → en una sesión crear un producto → verificar que la otra sesión recibe el evento sin recargar.

**Acceptance Scenarios**:

1. **Given** dos usuarios del mismo tenant tienen el catálogo abierto, **When** uno crea un producto, **Then** el otro recibe una notificación en tiempo real con los datos del nuevo producto.
2. **Given** dos usuarios del mismo tenant tienen el catálogo abierto, **When** uno edita un producto, **Then** el otro recibe la notificación de actualización.
3. **Given** dos usuarios del mismo tenant tienen el catálogo abierto, **When** uno elimina un producto, **Then** el otro recibe la notificación de eliminación.
4. **Given** un usuario de un tenant diferente está conectado, **When** se crea un producto en otro tenant, **Then** el usuario del primer tenant NO recibe la notificación.

---

### Edge Cases

- ¿Qué ocurre si se elimina una categoría que tiene productos asociados? → Asumir que la eliminación de categoría se bloquea si tiene productos activos.
- ¿Qué pasa si el código del producto contiene caracteres especiales o espacios? → El código se normaliza (trim) pero se acepta cualquier cadena no vacía.
- ¿Qué sucede si se aplican filtros con valores fuera de rango (precio negativo, stock negativo)? → El sistema devuelve listado vacío sin error.
- ¿Puede un mismo producto tener activas múltiples ofertas simultáneas? → Sí, varias ofertas con rangos de fechas distintos pueden coexistir.
- ¿Qué pasa si el alta masiva referencia una plantilla inexistente? → La operación falla con error indicando las plantillas no encontradas; ningún producto se crea (operación atómica).
- ¿Qué pasa si al ordenar se especifica un campo no permitido? → El sistema rechaza con error indicando los campos válidos.

---

## Requirements *(mandatory)*

### Functional Requirements

**Gestión de Productos**

- **FR-001**: El sistema DEBE permitir verificar si un código de producto ya existe en el tenant antes de crear, devolviendo `{ exists: boolean, producto?: { id, nombre, codigo } }`.
- **FR-002**: El sistema DEBE crear productos con los campos obligatorios: código (único en tenant), nombre (único en categoría+tenant), unidad de medida, categoría, actividad económica, tipo de producto, tipo de descuento y estado. Descripción e imagen son opcionales.
- **FR-003**: El sistema DEBE soportar los tipos de producto: COMERCIALIZACION, SERVICIO, PLATO, BEBIDA, POSTRE, COMPLEMENTO.
- **FR-004**: Al crear un producto de tipo COMERCIALIZACION, el sistema DEBE registrar automáticamente un movimiento de inventario de tipo "creacion" con el stock inicial indicado (por defecto 0).
- **FR-005**: Los productos de tipo SERVICIO no DEBEN generar movimientos de inventario.
- **FR-006**: El stock inicial SOLO puede modificarse si el producto no tiene movimientos de inventario distintos al de "creacion". Intentar modificarlo con movimientos reales DEBE devolver un error.
- **FR-007**: Al eliminar un producto de tipo COMERCIALIZACION, el sistema DEBE eliminar también su movimiento de inventario de tipo "creacion".
- **FR-008**: El listado de productos DEBE soportar: paginación (por defecto 10, máximo 100 por página), filtros (nombre parcial, código parcial, precio mínimo/máximo, estado, tipo de producto, tipo de descuento, rango de stock, rango de fecha de creación), ordenamiento por campos fijos (nombre, código, precio, stockActual, createdAt, updatedAt), y búsqueda general. Orden por defecto: createdAt descendente.
- **FR-009**: La respuesta del listado DEBE incluir: `{ data, total, page, limit, totalPages, hasNext, hasPrev }`.
- **FR-010**: El intento de ordenar por un campo no permitido DEBE devolver error con la lista de campos válidos.

**Variantes y Precios**

- **FR-011**: El sistema DEBE permitir definir atributos de variante (nombre + valores). Al guardar los atributos, el sistema propone automáticamente todas las combinaciones posibles (producto cartesiano) como punto de partida. El usuario puede eliminar combinaciones no deseadas antes de confirmar. Las variantes confirmadas tienen precio, stock e imagen configurables de forma independiente.
- **FR-012**: El sistema DEBE permitir crear, editar y eliminar precios por volumen (cantidad mínima + precio por unidad).
- **FR-013**: El sistema DEBE permitir crear, editar y eliminar ofertas con precio especial, fecha de inicio y fecha de fin.
- **FR-014**: El sistema DEBE mantener un historial de cambios de precio por producto, ordenado por fecha descendente.

**Alta Masiva**

- **FR-015**: El sistema DEBE permitir crear múltiples productos a partir de plantillas del catálogo maestro en una sola operación. La lista de plantillas DEBE contener al menos un elemento.
- **FR-016**: Durante el alta masiva, si la categoría de una plantilla no existe en el tenant, DEBE crearse automáticamente vinculada al maestro.
- **FR-017**: Durante el alta masiva, si la unidad de medida de una plantilla no existe en el tenant, DEBE crearse automáticamente vinculada al maestro.
- **FR-018**: Los productos creados por alta masiva DEBEN tener `stockActual = 0`. El stock se carga posteriormente mediante movimientos de inventario.
- **FR-019**: El alta masiva con plantillas inexistentes DEBE fallar completamente (sin crear ningún producto) y devolver los IDs de plantillas no encontradas.

**Auditoría y Tiempo Real**

- **FR-020**: Cada producto, categoría y oferta DEBE registrar `creadoPor` (ID de usuario) y `modificadoPor` (ID de usuario del último cambio).
- **FR-021**: Al crear, actualizar o eliminar un producto, categoría u oferta, el sistema DEBE emitir un evento en tiempo real a todos los usuarios conectados del mismo tenant.

### Key Entities

- **Producto**: Unidad comercializable. Atributos clave: código (único en tenant), nombre (único en categoría+tenant), descripción, imagen, unidad de medida, precio, stockActual, stockMinimo, tipo, estado, tipoDescuento, categoría, actividadEconómica, creadoPor, modificadoPor.
- **Categoría**: Clasificación de productos dentro del tenant. Atributos: nombre, descripción, estado, orden, creadoPor, modificadoPor.
- **Actividad Económica**: Clasificación sectorial del producto (referencia maestra, no editable por el tenant).
- **VarianteAtributo**: Dimensión de variación de un producto (ej. "Talla"). Contiene valores (ej. S, M, L).
- **ProductoVariante**: Combinación específica de valores de atributos. Tiene precio, stock e imagen propios.
- **PrecioVolumen**: Regla de descuento por cantidad: cantidad mínima y precio por unidad.
- **Oferta**: Precio especial con vigencia (fechaInicio, fechaFin). Registra creadoPor.
- **HistorialPrecio**: Registro inmutable de cada cambio de precio: precio anterior, precio nuevo, fecha, usuario.
- **CatálogoMaestro (Clasificador)**: Plantilla de producto del sistema (no editable por el tenant). Tiene categoría y unidad de medida de referencia.
- **MovimientoInventario** *(referenciado, no gestionado en este módulo)*: Registro de cambios de stock. El de tipo "creacion" es creado y eliminado por este módulo.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un miembro del staff puede crear un producto completo (todos los campos obligatorios) en menos de 2 minutos desde el formulario.
- **SC-002**: La verificación de código duplicado devuelve resultado en menos de 1 segundo.
- **SC-003**: El alta masiva de 50 plantillas del catálogo maestro completa en menos de 10 segundos.
- **SC-004**: Los listados de productos con filtros y paginación responden en menos de 2 segundos para catálogos de hasta 10.000 productos.
- **SC-005**: Los cambios (crear, editar, eliminar) se reflejan en tiempo real en las demás sesiones del tenant en menos de 2 segundos.
- **SC-006**: El 100% de los intentos de crear con código o nombre duplicado son rechazados con mensaje claro antes de persistir el dato.
- **SC-007**: Los campos de auditoría (`creadoPor`, `modificadoPor`) se registran correctamente en el 100% de las operaciones de escritura.

---

## Assumptions

- Los miembros del tenant con roles PROPIETARIO, ADMIN y ENCARGADO tienen permisos de escritura sobre el catálogo. Los roles VENDEDOR solo tienen lectura.
- Las categorías y unidades de medida del tenant son gestionadas también por este módulo (CRUD completo), aunque los datos maestros (catálogo maestro, actividades económicas) son administrados por el sistema y no por el tenant.
- El módulo de inventario (movimientos, ajustes, recuentos) es un módulo separado. Este módulo accede directamente a la tabla `MovimientoInventario` usando el cliente de base de datos compartido (patrón `prismaBase as any` del proyecto) para crear y eliminar el movimiento de tipo "creacion". Los demás movimientos (ventas, compras, ajustes, recuentos) los gestiona el módulo de inventario.
- El tipo de descuento (`tipoDescuento`) es un enum con tres valores: `SIN_DESCUENTO`, `PORCENTAJE`, `MONTO_FIJO`.
- El estado del producto es un enum con valores fijos (ACTIVO, INACTIVO). Otros estados posibles (AGOTADO, SUSPENDIDO) se evalúan en la planificación.
- La imagen del producto es una URL o referencia a archivo ya subido al servicio de almacenamiento; este módulo no gestiona la subida directa de imágenes.
- Los eventos en tiempo real se emiten a la sala Socket.IO del tenant (`tenant:${tenantId}`), siguiendo el patrón de los módulos existentes.
- El catálogo maestro (clasificadores) ya existe en la base de datos y es de solo lectura para este módulo.
- La unicidad del código es global en el tenant (no por categoría). La unicidad del nombre es por categoría + tenant.
- La generación de variantes es híbrida: el sistema calcula el producto cartesiano de los atributos como propuesta; el usuario elimina las combinaciones no deseadas y confirma el conjunto final antes de persistir.
