# Feature Specification: TuTienda — Perfil Público de Comercio de Barrio

**Feature Branch**: `012-tu-tienda`  
**Created**: 2026-05-28  
**Status**: Draft  

## Clarifications

### Session 2026-05-28

- Q: ¿El directorio público y los perfiles de comercio son accesibles sin autenticación? → A: Sí — directorio y perfiles son completamente públicos (sin auth); solo se exige autenticación al interactuar (valorar, comentar, seguir, marcar favorito, preguntar).
- Q: ¿Cuántos niveles de anidamiento tienen los comentarios del comercio? → A: Sin límite de profundidad — modelo de árbol recursivo (cada comentario puede tener un `padreId` opcional).
- Q: ¿Los comentarios, reacciones y valoraciones del comercio reutilizan las tablas polimórficas del módulo social o son entidades nuevas? → A: Reutilizan las tablas polimórficas del módulo social existente con `referenciaTipo = "COMERCIO"` para comentarios, reacciones y valoraciones. Solo `PreguntaComercio` (sin equivalente en social) es una entidad nueva. Las publicaciones también reutilizan el módulo social.
- Q: ¿Qué roles del tenant pueden publicar novedades, ofertas y anuncios al perfil público? → A: Solo PROPIETARIO y ADMIN.
- Q: ¿Las preguntas de consumidores son visibles inmediatamente o requieren aprobación? → A: Visibles inmediatamente al publicarse; el propietario puede ocultarlas individualmente (estado VISIBLE / OCULTA).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Activación y configuración del perfil de tienda (Priority: P1)

El propietario del tenant activa el flag `esTienda` para hacer visible su comercio en el directorio público. Una vez activo, configura el nombre, logo, descripción, tema visual y otros datos que el público verá. Si decide desactivarlo, el comercio deja de ser buscable sin afectar la operación interna.

**Why this priority**: Sin este perfil activado, ninguna otra funcionalidad pública es accesible. Es el punto de entrada a todo el módulo.

**Independent Test**: Se puede probar activando/desactivando el flag de un tenant de prueba y verificando que aparece o desaparece del directorio público sin afectar catálogo ni ventas internas.

**Acceptance Scenarios**:

1. **Given** un tenant con `esTienda = false`, **When** el propietario activa el flag, **Then** el comercio aparece en el directorio público con nombre, logo, descripción y ubicación, y puede ser buscado por consumidores.
2. **Given** un tenant con `esTienda = true`, **When** el propietario desactiva el flag, **Then** el comercio deja de aparecer en el directorio público, pero el catálogo y las ventas internas continúan funcionando para los miembros.
3. **Given** un tenant activo, **When** el propietario configura el tema visual (colores, banner), **Then** los visitantes del perfil ven la vitrina con ese tema.
4. **Given** un tenant activo, **When** el propietario selecciona productos destacados, **Then** esos productos aparecen primero en la vitrina pública al visitar el perfil.
5. **Given** un tenant activo, **When** el propietario configura el tipo de despliegue del listado de ventas (barra lateral, superior o inferior), **Then** el punto de venta interno muestra ese layout.

---

### User Story 2 — Directorio público de comercios de barrio (Priority: P2)

Un usuario consumidor (sin membresía en ningún tenant) navega el directorio de comercios de barrio, busca por cercanía, filtra por actividad o categoría, y accede al perfil público de un comercio.

**Why this priority**: Es la funcionalidad que atrae nuevos clientes a los comercios. Requiere que US1 esté completo.

**Independent Test**: Se puede probar buscando comercios activos desde una sesión sin membresía, filtrando y abriendo el perfil de uno específico.

**Acceptance Scenarios**:

1. **Given** varios comercios activos en el directorio, **When** un consumidor busca por localización, **Then** obtiene una lista ordenable de comercios cercanos con nombre, logo y actividad.
2. **Given** el directorio de comercios, **When** el consumidor filtra por actividad económica y categoría, **Then** solo ve comercios que coincidan con esos filtros.
3. **Given** un comercio activo, **When** el consumidor accede a su perfil público, **Then** ve nombre, descripción, logo, fotos del local, propietarios visibles, equipo público, horarios y ubicación.
4. **Given** un comercio activo con catálogo, **When** el consumidor ve el perfil, **Then** puede navegar los productos activos marcados como visibles públicamente.
5. **Given** el directorio, **When** el consumidor pagina resultados (máximo 100 por página), **Then** recibe total, página actual, total de páginas, y flags de página siguiente/anterior.

---

### User Story 3 — Interacciones sociales del consumidor con el comercio (Priority: P3)

Un usuario consumidor interactúa con el perfil de un comercio: lo valora con puntuación y reseña, comenta, hace preguntas, lo marca como favorito, lo sigue para recibir novedades, y reacciona con emojis.

**Why this priority**: Genera el tejido social del directorio. Requiere US2 para tener comercios visibles.

**Independent Test**: Se puede probar todas las interacciones sociales sobre un comercio de prueba activo, verificando que los contadores se actualizan y el propietario recibe notificaciones.

**Acceptance Scenarios**:

1. **Given** un consumidor autenticado en el perfil de un comercio, **When** registra una valoración (puntuación 1–5 y reseña), **Then** la valoración aparece en el perfil; si vuelve a valorar, la valoración anterior se reemplaza (una sola activa por usuario por comercio).
2. **Given** un consumidor en el perfil de un comercio, **When** publica un comentario, **Then** el comentario aparece en el perfil con soporte de respuestas anidadas y reacciones.
3. **Given** un consumidor en el perfil de un comercio, **When** hace una pregunta pública, **Then** la pregunta queda visible en el perfil y el propietario puede responderla.
4. **Given** un consumidor en el perfil de un comercio, **When** lo marca como favorito, **Then** puede acceder rápidamente a ese comercio desde su lista de favoritos.
5. **Given** un consumidor que sigue a un comercio, **When** el comercio publica contenido nuevo, **Then** el consumidor lo ve en su feed de novedades.
6. **Given** un comercio que recibe una nueva valoración, comentario, pregunta o seguidor, **When** ocurre el evento, **Then** el propietario recibe notificación en tiempo real.

---

### User Story 4 — Publicaciones del comercio a sus seguidores (Priority: P4)

El equipo del comercio publica novedades, ofertas, fotos y anuncios. Las publicaciones aparecen en el feed de seguidores y en el perfil público del comercio. El modelo de publicaciones, comentarios y reacciones reutiliza el comportamiento ya definido en el módulo social.

**Why this priority**: Amplía el valor del módulo con difusión activa. Requiere US3 para tener seguidores.

**Independent Test**: Se puede probar creando una publicación desde un comercio activo y verificando que aparece en el feed de un seguidor de prueba.

**Acceptance Scenarios**:

1. **Given** un miembro con rol PROPIETARIO o ADMIN del comercio autenticado, **When** publica contenido (texto, imagen, anuncio), **Then** la publicación aparece en el perfil público del comercio y en el feed de sus seguidores.
2. **Given** un seguidor con sesión activa, **When** el comercio publica algo nuevo, **Then** el feed del seguidor se actualiza en tiempo real sin recargar.
3. **Given** una publicación del comercio, **When** un consumidor comenta o reacciona, **Then** el comportamiento sigue el mismo modelo que las publicaciones del módulo social existente.

---

### Edge Cases

- ¿Qué pasa si un consumidor intenta acceder al perfil de un comercio con `esTienda = false`? → Debe recibir un error 404 (no encontrado), sin revelar que el tenant existe.
- ¿Qué pasa si el consumidor no está autenticado e intenta valorar, comentar, seguir, marcar favorito o preguntar? → Debe requerir autenticación y devolver 401. El acceso de solo lectura (directorio, perfil, catálogo) no requiere auth.
- ¿Qué pasa si un tenant desactiva `esTienda` mientras tiene seguidores y valoraciones? → Los datos se conservan; si se reactiva, todo vuelve a ser visible.
- ¿Qué pasa si se intenta seleccionar como producto destacado un producto inactivo o invisible públicamente? → Se rechaza con error descriptivo.
- ¿Qué pasa si la paginación solicita una página fuera del rango total? → Se devuelve lista vacía con metadatos correctos (total, totalPages).
- ¿Qué pasa al listar respuestas de un comentario con muchos niveles de profundidad? → La API devuelve solo los hijos directos de cada nodo; el cliente solicita niveles más profundos con llamadas sucesivas (paginación por nodo padre).
- ¿Qué pasa si un consumidor intenta ver una pregunta ocultada por el propietario? → No aparece en el listado público de preguntas del comercio. El consumidor que la publicó puede verla en su propio historial de preguntas.
- ¿Qué pasa si el propietario intenta configurar el tema visual sin haber activado `esTienda`? → Se permite (la configuración se guarda; solo se hace pública al activar).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir al propietario del tenant activar o desactivar el flag `esTienda` para controlar la visibilidad pública del comercio.
- **FR-002**: El sistema DEBE mostrar en el directorio público únicamente los tenants con `esTienda = true`.
- **FR-003**: El sistema DEBE permitir al propietario configurar el perfil público del comercio: nombre comercial, descripción, logo, fotos del local, horarios, tema visual (colores y banner) y tipo de despliegue del punto de venta.
- **FR-004**: El sistema DEBE permitir al propietario seleccionar hasta un máximo de 20 productos activos y visibles públicamente como productos destacados de la vitrina.
- **FR-005**: El sistema DEBE exponer un directorio público buscable sin requerir autenticación, por localización (usando las localizaciones ya registradas del tenant), filtrable por actividad económica y categoría, y ordenable por puntuación promedio, número de seguidores o fecha de creación.
- **FR-006**: El sistema DEBE mostrar el perfil público de un comercio activo sin requerir autenticación, incluyendo: nombre, descripción, logo, fotos del local, propietarios marcados como visibles, equipo público, horarios, ubicación y catálogo de productos activos y visibles públicamente.
- **FR-007**: El sistema DEBE garantizar que la información operativa interna del tenant (ventas, inventario, caja, movimientos, compras, gastos) NUNCA sea accesible desde el perfil público, independientemente del estado del flag `esTienda`.
- **FR-008**: El sistema DEBE permitir a consumidores autenticados registrar una valoración (puntuación 1–5 y texto de reseña) por comercio, reutilizando la entidad polimórfica de valoraciones del módulo social con `referenciaTipo = "COMERCIO"`; solo puede tener una valoración activa por comercio, que reemplaza la anterior al actualizarla.
- **FR-009**: El sistema DEBE permitir comentarios con respuestas anidadas en árbol recursivo (sin límite de profundidad) y reacciones con emojis sobre el perfil del comercio, reutilizando las entidades polimórficas `Comentario` y `Reaccion` del módulo social con `referenciaTipo = "COMERCIO"`.
- **FR-010**: El sistema DEBE permitir preguntas públicas de consumidores autenticados al comercio; las preguntas son visibles inmediatamente al publicarse (estado VISIBLE por defecto). El propietario o ADMIN puede ocultar individualmente una pregunta (estado OCULTA), en cuyo caso deja de ser visible públicamente. Las preguntas tienen respuesta opcional del propietario o ADMIN.
- **FR-011**: El sistema DEBE permitir a los consumidores marcar un comercio como favorito y acceder a su lista de favoritos, reutilizando la entidad `Favorito` del módulo social con `referenciaTipo = "COMERCIO"`.
- **FR-012**: El sistema DEBE permitir a los consumidores seguir a un comercio para recibir novedades en su feed y dejar de seguir, reutilizando la entidad `Seguimiento` del módulo social con `referenciaTipo = "COMERCIO"`.
- **FR-013**: El sistema DEBE notificar al propietario del tenant en tiempo real cuando el comercio recibe: nueva valoración, nuevo comentario, nueva pregunta, o nuevo seguidor.
- **FR-014**: El sistema DEBE actualizar en tiempo real (sin recarga) el perfil público del comercio para los usuarios conectados cuando: se actualiza la configuración visual, se modifican los productos destacados, se agrega una nueva valoración, comentario o seguidor.
- **FR-015**: El sistema DEBE permitir a los miembros con rol PROPIETARIO o ADMIN del tenant publicar contenido (novedades, ofertas, fotos, anuncios) reutilizando el modelo de publicaciones del módulo social existente con `referenciaTipo = "COMERCIO"`.
- **FR-016**: Las publicaciones nuevas del comercio DEBEN aparecer en el feed de sus seguidores en tiempo real.
- **FR-017**: Todos los listados del directorio, seguidores, valoraciones, comentarios y preguntas DEBEN aceptar el contrato uniforme de consulta: paginación (máx. 100 por página), filtro, orden ASC/DESC por campo acotado. La respuesta incluye datos, total, página, límite, totalPaginas, hayPaginaSiguiente y hayPaginaAnterior.
- **FR-018**: La configuración de la tienda y los productos destacados DEBEN registrar quién los creó y quién realizó el último cambio (auditoría de autoría).

### Key Entities *(include if feature involves data)*

- **PerfilTienda**: Configuración pública del comercio; incluye flag `esTienda`, tema visual, tipo de despliegue del punto de venta, productos destacados y datos de auditoría. Uno por tenant.
- **ProductoDestacado**: Relación entre un tenant y un producto seleccionado como destacado en la vitrina pública. Ordenado y con auditoría.
- **DirectorioComercio**: Vista calculada de los tenants activos con `esTienda = true`, enriquecida con métricas sociales (puntuación promedio, conteo de seguidores).
- **Valoracion** *(módulo social, extendido)*: Reutiliza la entidad polimórfica del módulo social con `referenciaTipo = "COMERCIO"` y `referenciaId = tenantId`. Única por par (consumidor, comercio); contiene puntuación 1–5, texto de reseña y fecha.
- **Comentario** *(módulo social, extendido)*: Reutiliza la entidad polimórfica del módulo social con `referenciaTipo = "COMERCIO"`. Árbol recursivo de respuestas (`padreId` opcional). Las reacciones con emoji también reutilizan la entidad `Reaccion` del módulo social.
- **PreguntaComercio** *(entidad nueva)*: Pregunta pública de un consumidor autenticado al comercio. Estado: `VISIBLE` (por defecto al crear) u `OCULTA` (ocultada por PROPIETARIO/ADMIN). Respuesta opcional del PROPIETARIO o ADMIN. No tiene equivalente en el módulo social existente.
- **Favorito** *(módulo social, extendido)*: Reutiliza la entidad polimórfica del módulo social con `referenciaTipo = "COMERCIO"` para marcar un comercio como favorito. Única por par (consumidor, comercio).
- **Seguimiento** *(módulo social, extendido)*: Reutiliza la entidad polimórfica del módulo social con `referenciaTipo = "COMERCIO"` para seguir un comercio. Registra la fecha de seguimiento.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un propietario puede activar el perfil de tienda y tenerlo visible en el directorio público en menos de 2 minutos desde el primer acceso al formulario de configuración.
- **SC-002**: Un consumidor puede encontrar un comercio cercano, ver su perfil completo y dejar una valoración en menos de 3 minutos desde el inicio de la búsqueda.
- **SC-003**: El directorio público soporta al menos 500 comercios activos y devuelve resultados paginados en menos de 2 segundos bajo carga normal.
- **SC-004**: Las notificaciones en tiempo real al propietario (nueva valoración, comentario, pregunta, seguidor) llegan en menos de 3 segundos tras el evento.
- **SC-005**: Las actualizaciones del perfil (nueva valoración, cambio de configuración visual) son visibles a todos los usuarios conectados en menos de 3 segundos sin recargar la página.
- **SC-006**: El 100% de la información operativa interna del tenant (ventas, inventario, caja) permanece inaccesible desde el perfil público incluso con `esTienda = true`.
- **SC-007**: Un consumidor puede completar el flujo de seguir → ver publicación en feed en menos de 30 segundos tras la publicación del comercio.

## Assumptions

- El sistema de localización del tenant (coordenadas, dirección) ya existe en el spec de identidad del negocio; este módulo lo reutiliza para búsqueda por cercanía.
- El modelo de publicaciones, comentarios y reacciones ya está implementado en el módulo social existente; este módulo lo extiende para comercios como entidad.
- Los consumidores públicos usan el mismo sistema de autenticación que los miembros del tenant, pero sin membresía en ningún tenant.
- El catálogo de productos del tenant ya tiene un campo de visibilidad pública; este módulo filtra por ese campo para la vitrina.
- El máximo de 20 productos destacados es un límite razonable; puede ajustarse en la planificación técnica si el diseño lo requiere.
- Las fotos del local son parte del perfil del comercio y se gestionan mediante la infraestructura de almacenamiento de archivos ya existente.
- El tipo de despliegue del listado de ventas (barra lateral, superior, inferior) afecta únicamente la UI del punto de venta; la configuración se almacena pero el renderizado es responsabilidad del frontend.
- Los propietarios marcados como visibles y el equipo público son listas configuradas desde el perfil del tenant; este módulo las expone sin modificarlas.
