# Feature Specification: Catálogo Comercial

**Feature Branch**: `003-catalogo-comercial`
**Created**: 2026-05-22
**Status**: Draft
**Input**: Construir el catálogo comercial del tenant

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gestión de Categorías Jerárquicas (Priority: P1)

Un operador del tenant organiza sus productos en categorías. Las categorías pueden tener subcategorías (árbol jerárquico de profundidad arbitraria). Cada categoría pertenece a una actividad económica. El operador puede crear, renombrar, reorganizar y desactivar categorías. Queda registrado quién realizó cada operación.

**Why this priority**: Sin categorías no hay organización. Es la estructura base que sostiene todo el catálogo; implementarla primero permite validar el árbol jerárquico de forma aislada.

**Independent Test**: Crear un árbol de categorías (padre → hijo → nieto), renombrar un nodo, desactivar una categoría hoja y verificar que el árbol refleja los cambios. No requiere ningún producto creado.

**Acceptance Scenarios**:

1. **Given** un tenant activo, **When** el operador crea una categoría raíz con nombre y actividad económica, **Then** la categoría queda disponible con estado activo.
2. **Given** una categoría existente, **When** el operador crea una subcategoría dentro de ella, **Then** la jerarquía padre-hijo se refleja correctamente.
3. **Given** una subcategoría, **When** el operador la desactiva, **Then** la categoría pasa a inactiva y no aparece en los listados activos.
4. **Given** dos categorías del mismo tenant bajo el mismo padre, **When** el operador intenta crear una con el mismo nombre, **Then** el sistema rechaza la operación con error de nombre duplicado.
5. **Given** una categoría con productos, **When** el operador la desactiva, **Then** los productos conservan su asociación pero el sistema advierte que la categoría no estará visible.

---

### User Story 2 - Gestión de Productos (Priority: P2)

Un operador crea y mantiene productos en el catálogo. Cada producto tiene código, nombre, descripción, imagen, unidad de medida, precio base y tipo (comercialización, servicio, plato, bebida, postre, complemento). El producto pertenece a una categoría. El nombre y el código son únicos dentro de la misma categoría y tenant. El operador puede activar, desactivar o dar de baja productos. Cada cambio registra quién lo realizó.

**Why this priority**: Los productos son la entidad central del catálogo. Con US1 completa, esta historia entrega el valor mínimo viable: un catálogo con productos reales navegables.

**Independent Test**: Con al menos una categoría disponible, crear un producto completo, buscarlo en el listado, editarlo y cambiar su estado. La validación de unicidad se verifica intentando crear un duplicado.

**Acceptance Scenarios**:

1. **Given** una categoría activa, **When** el operador crea un producto con todos sus atributos, **Then** el producto queda disponible con estado activo y código único.
2. **Given** un producto existente, **When** el operador actualiza su descripción, **Then** los cambios se persisten y la auditoría registra usuario y fecha.
3. **Given** un tenant con varios productos, **When** un usuario solicita el listado con filtro por tipo y orden ascendente por nombre, **Then** el sistema devuelve sólo los productos del tipo indicado en el orden solicitado.
4. **Given** dos productos en la misma categoría, **When** el operador intenta crear un tercero con el mismo código, **Then** el sistema rechaza la operación indicando el conflicto.
5. **Given** un producto activo, **When** el operador lo desactiva, **Then** el producto pasa a inactivo y no aparece en listados activos.
6. **Given** un catálogo con muchos productos, **When** el usuario busca por texto libre, **Then** el sistema devuelve productos cuyo nombre o descripción contienen el texto buscado.

---

### User Story 3 - Variantes y Atributos (Priority: P3)

Un producto puede tener variantes, cada una con su propio precio, stock e imagen. Las variantes se definen combinando atributos (ej. color: rojo, talla: M). Los atributos son pares clave-valor. Una variante tiene su propio código y estado. El stock de cada variante se lleva independientemente.

**Why this priority**: Las variantes multiplican la utilidad del catálogo para comercios de indumentaria, gastronomía (tamaños) y similares. Depende de productos (US2) pero se puede testear en forma aislada sobre cualquier producto base.

**Independent Test**: Crear un producto "Remera", definir el atributo "talla" con valores S, M, L, generar las tres variantes con precios distintos, actualizar el stock de una variante y verificar que las demás no se modifican.

**Acceptance Scenarios**:

1. **Given** un producto existente, **When** el operador define atributos y genera las combinaciones de variantes, **Then** las variantes se crean con los pares de atributos correspondientes.
2. **Given** una variante, **When** el operador actualiza su precio o stock, **Then** solo esa variante se modifica; el precio base del producto padre no cambia.
3. **Given** un producto con variantes, **When** el usuario solicita el detalle del producto, **Then** la respuesta incluye la lista de variantes con atributos, precios y stock.
4. **Given** un producto con variantes, **When** el operador intenta crear una variante con una combinación de atributos ya existente, **Then** el sistema rechaza la operación.
5. **Given** una variante activa, **When** el operador la desactiva, **Then** esa combinación ya no está disponible pero las demás variantes del producto permanecen activas.

---

### User Story 4 - Precios, Opciones y Ofertas (Priority: P4)

Un producto puede tener: (a) precios por volumen —precio diferencial a partir de N unidades—; (b) opciones adicionales —modificaciones seleccionables por el comprador, cada una con nombre y precio extra—; (c) ofertas con precio promocional, fecha de inicio y fecha de fin. El historial de cambios de precio queda registrado. Una oferta expirada deja de estar vigente automáticamente.

**Why this priority**: Enriquece el catálogo con capacidades comerciales avanzadas. Depende de productos (US2) pero es independiente de variantes (US3). Un comercio puede usarlo sin variantes.

**Independent Test**: Sobre un producto simple, definir un precio por volumen, crear una opción adicional y una oferta con rango de fechas. Verificar que la oferta activa figura en el detalle y que una oferta con fecha pasada no aparece como vigente.

**Acceptance Scenarios**:

1. **Given** un producto, **When** el operador configura un precio por volumen (a partir de 10 unidades, precio $80), **Then** el precio diferencial queda asociado al producto y visible en su detalle.
2. **Given** un producto, **When** el operador agrega una opción adicional con nombre y precio extra, **Then** la opción queda disponible en el detalle del producto.
3. **Given** un producto, **When** el operador crea una oferta con fechas de inicio y fin y precio promocional, **Then** la oferta figura como vigente mientras las fechas lo permitan.
4. **Given** una oferta cuya fecha de fin ya pasó, **When** cualquier usuario consulta el producto, **Then** la oferta no aparece en la lista de ofertas vigentes.
5. **Given** un producto con precio distinto al actual, **When** el operador actualiza el precio base, **Then** el historial registra el valor anterior, la fecha de cambio y el usuario responsable.

---

### User Story 5 - Actualizaciones en Tiempo Real (Priority: P5)

Cuando un operador crea, modifica o elimina un producto, una categoría o una oferta, todos los demás usuarios conectados del mismo tenant reciben la notificación automáticamente, sin necesidad de recargar la página.

**Why this priority**: Mejora la experiencia colaborativa. Depende de que las entidades del catálogo (US2–US4) ya funcionen. La funcionalidad del catálogo es completa sin tiempo real, pero el tiempo real lo convierte en una herramienta colaborativa.

**Independent Test**: Con dos sesiones del mismo tenant abiertas, el operador crea un producto en la sesión A. Sin acción en la sesión B, esta recibe la notificación con los datos del nuevo producto.

**Acceptance Scenarios**:

1. **Given** dos usuarios del mismo tenant conectados, **When** el operador A crea un producto, **Then** el usuario B recibe automáticamente un evento con los datos del producto creado.
2. **Given** dos usuarios del mismo tenant conectados, **When** el operador A actualiza el precio de un producto, **Then** el usuario B recibe el evento con el nuevo precio.
3. **Given** dos usuarios del mismo tenant conectados, **When** el operador A desactiva una categoría, **Then** el usuario B recibe la notificación del cambio de estado.
4. **Given** un usuario de un tenant diferente conectado, **When** el operador A de otro tenant crea un producto, **Then** el usuario del otro tenant NO recibe la notificación (aislamiento de tenant).
5. **Given** un usuario desconectado al momento del cambio, **When** ese usuario se reconecta y consulta el catálogo, **Then** ve el estado actualizado (consistencia garantizada vía API).

---

### Edge Cases

- **Desactivar categoría con subcategorías activas**: el sistema desactiva en cascada automáticamente todas las subcategorías hijas y sub-hijas en la misma operación. El operador no necesita desactivarlas manualmente.
- **Ofertas solapadas**: el sistema rechaza la creación de una oferta si su rango de fechas se superpone con otra oferta activa del mismo producto y la misma variante (null = producto base). Error: `OFERTA_SOLAPADA`.
- ¿Qué sucede cuando se intenta crear una variante con una combinación de atributos ya existente?
- ¿Qué pasa si se desactiva un producto que tiene una oferta vigente?
- ¿Cómo se comporta la búsqueda de texto libre con acentos y caracteres especiales?
- **Eliminar valor de atributo en uso**: el sistema rechaza la eliminación de un valor de atributo si alguna variante activa lo utiliza. Error: `ATRIBUTO_VALOR_EN_USO`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-000**: Cualquier miembro autenticado del tenant puede leer (listar y obtener) cualquier entidad del catálogo. Solo los roles PROPIETARIO y ADMIN pueden crear, editar o desactivar entidades del catálogo.
- **FR-001**: El sistema DEBE permitir crear, editar y desactivar categorías con nombre, descripción, imagen y actividad económica.
- **FR-002**: Las categorías DEBEN soportar jerarquía arbitraria (padre → hijo → nieto sin límite de profundidad).
- **FR-003**: El nombre de una categoría DEBE ser único dentro del mismo padre y tenant.
- **FR-003b**: Al desactivar una categoría, el sistema DEBE desactivar en cascada automáticamente todas sus subcategorías descendientes en la misma operación atómica.
- **FR-004**: El sistema DEBE permitir crear productos con: código, nombre, descripción, imagen, unidad de medida, precio base, tipo y categoría.
- **FR-005**: El tipo de producto DEBE ser uno de: comercialización, servicio, plato, bebida, postre, complemento.
- **FR-006**: El código y el nombre de un producto DEBEN ser únicos dentro de la misma categoría y tenant.
- **FR-007**: El sistema DEBE registrar quién creó y quién modificó por última vez cada producto y categoría (auditoría).
- **FR-008**: El sistema DEBE soportar variantes de producto; cada variante con código propio, precio, stock, imagen y combinación de atributos clave-valor.
- **FR-009**: Una variante DEBE ser única por combinación de atributos dentro de su producto.
- **FR-009b**: El sistema DEBE rechazar la eliminación de un valor de atributo si alguna variante activa lo utiliza.
- **FR-010**: El sistema DEBE soportar precios por volumen: precio diferencial a partir de una cantidad mínima de unidades.
- **FR-011**: El sistema DEBE soportar opciones adicionales por producto con nombre y precio extra.
- **FR-012**: El sistema DEBE soportar ofertas por producto: precio promocional, fecha de inicio y fecha de fin. Una oferta expirada NO DEBE aparecer como vigente. El sistema DEBE rechazar la creación de una oferta cuyo rango de fechas se solape con una oferta activa existente para el mismo producto y variante.
- **FR-013**: El sistema DEBE mantener un historial de cambios de precio por producto: precio anterior, precio nuevo, fecha y usuario responsable.
- **FR-014**: Los listados de productos DEBEN soportar: filtro por estado, categoría y tipo; ordenamiento ascendente/descendente por nombre, precio, stock y fecha; paginación por cursor; búsqueda de texto libre por nombre y descripción; límite configurable de registros por página.
- **FR-015**: Cuando un operador crea, modifica o elimina un producto, categoría u oferta, los demás usuarios del mismo tenant conectados DEBEN recibir la notificación en tiempo real.
- **FR-016**: Las notificaciones en tiempo real DEBEN estar aisladas por tenant.

### Key Entities

- **Categoría**: Nodo del árbol de categorías. Atributos: nombre, descripción, imagen, actividad económica, referencia al padre (opcional), estado, auditoría.
- **Producto**: Ítem comercializable. Atributos: código, nombre, descripción, imagen, unidad de medida, precio base, tipo, categoría, estado, auditoría.
- **Variante**: Versión de un producto con atributos específicos. Atributos: código, precio, stock, imagen, combinación de atributos, estado.
- **Atributo de variante**: Par clave-valor que define una dimensión de variación (ej. color: rojo).
- **Precio por volumen**: Regla de precio diferencial: a partir de N unidades, el precio unitario es X.
- **Opción adicional**: Modificación seleccionable con nombre y precio extra.
- **Oferta**: Precio promocional vigente durante un período (fecha inicio – fecha fin).
- **Historial de precio**: Registro inmutable de cada cambio en el precio base de un producto.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un operador puede crear un producto completo (con categoría, variantes y oferta) en menos de 3 minutos.
- **SC-002**: Los listados del catálogo devuelven resultados en menos de 1 segundo para catálogos de hasta 10.000 productos.
- **SC-003**: La búsqueda de texto libre retorna resultados relevantes con latencia menor a 500 ms para catálogos de hasta 10.000 productos.
- **SC-004**: Los eventos en tiempo real son recibidos por los usuarios conectados del mismo tenant en menos de 2 segundos desde la operación que los origina.
- **SC-005**: El aislamiento de tenant es total: ningún usuario recibe eventos o datos de otro tenant en ninguna prueba.
- **SC-006**: El 100% de los cambios de precio queda reflejado en el historial sin pérdida de registros.
- **SC-007**: La paginación por cursor es consistente: no se saltan ni se repiten registros al paginar en catálogos con inserciones concurrentes.

## Clarifications

### Session 2026-05-22

- Q: ¿Qué sucede cuando se desactiva una categoría con subcategorías activas? → A: Desactivación en cascada automática — el sistema desactiva el padre y todos sus descendientes en la misma operación.
- Q: ¿Qué sucede cuando dos ofertas del mismo producto tienen fechas solapadas? → A: Rechazar con error OFERTA_SOLAPADA — no se permiten rangos superpuestos para el mismo producto/variante.
- Q: ¿Qué sucede si se elimina un valor de atributo usado por variantes activas? → A: Rechazar con error ATRIBUTO_VALOR_EN_USO — no se puede eliminar mientras alguna variante activa lo use.
- Q: ¿Quién puede leer el catálogo? → A: Cualquier miembro autenticado del tenant puede leer; solo PROPIETARIO y ADMIN pueden crear, editar o desactivar.

## Assumptions

- Todos los tenants tienen acceso al catálogo comercial sin habilitación especial.
- La "actividad económica" es un campo clasificatorio en la categoría (texto libre o enum predefinido); no es una entidad con CRUD propio en esta iteración.
- Las "opciones adicionales" son modificadores seleccionables en el momento del pedido (análogos a toppings); no son productos independientes del catálogo.
- El stock de variantes es informacional en esta iteración: se actualiza manualmente y no se descuenta automáticamente con ventas.
- Las imágenes se gestionan como URLs; el almacenamiento de archivos es responsabilidad de otro módulo o servicio externo.
- La paginación por cursor aplica al listado de productos; los listados de categorías y variantes devuelven todos los registros del scope relevante en esta iteración.
- Un producto puede existir sin variantes; en ese caso el precio base es el único precio.
- No hay límite de profundidad en la jerarquía de categorías.
