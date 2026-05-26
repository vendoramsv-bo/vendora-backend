# Feature Specification: Capa Social de la Plataforma

**Feature Branch**: `009-capa-social`  
**Created**: 2026-05-25  
**Status**: Draft  
**Input**: User description: "Construir la capa social de la plataforma, transversal a todas las verticales."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Interacciones sobre productos (Priority: P1)

Un usuario autenticado puede interactuar con cualquier producto del catálogo: reaccionar con un emoji, escribir un comentario (y responder a comentarios existentes), reaccionar a comentarios, calificar el producto con una puntuación y reseña, hacer preguntas y responderlas, y marcar el producto como favorito. El conjunto de interacciones sobre un producto es visible públicamente para cualquier visitante.

**Why this priority**: Es la interacción más directa entre usuarios y el inventario comercial de los tenants. Impacta la decisión de compra y genera confianza social. Sin esta base, las demás historias no tienen sentido.

**Independent Test**: Se puede probar creando un producto en el catálogo y comprobando que un usuario autenticado puede reaccionar, comentar, valorar, preguntar y marcar como favorito, y que otro usuario ve esas interacciones en tiempo real.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado en la página de un producto, **When** selecciona un emoji de reacción, **Then** la reacción queda registrada bajo su nombre y es visible de inmediato para todos los visitantes de ese producto.
2. **Given** un usuario que ya reaccionó a un producto, **When** intenta reaccionar con un emoji diferente, **Then** su reacción anterior se reemplaza (solo una reacción por usuario por elemento).
3. **Given** un usuario autenticado, **When** escribe un comentario sobre un producto, **Then** el comentario aparece en el listado con su nombre y fecha, y los demás usuarios conectados lo ven en tiempo real.
4. **Given** un comentario existente en un producto, **When** un usuario autenticado responde a ese comentario, **Then** la respuesta aparece anidada bajo el comentario padre.
5. **Given** un usuario autenticado, **When** califica un producto con puntuación y reseña, **Then** la valoración queda registrada; si ya había calificado antes, la valoración se actualiza (una por usuario por producto).
6. **Given** un usuario autenticado, **When** hace una pregunta sobre un producto, **Then** la pregunta es visible y cualquier otro usuario autenticado puede responderla.
7. **Given** un usuario autenticado, **When** marca un producto como favorito, **Then** el producto aparece en su lista de favoritos; al desmarcarlo desaparece.
8. **Given** un visitante no autenticado, **When** navega la página de un producto, **Then** puede ver todas las interacciones (reacciones, comentarios, valoraciones, preguntas) pero no puede crearlas.

---

### User Story 2 - Interacciones sobre el tenant (Priority: P2)

Un usuario autenticado puede interactuar con la vitrina pública de un tenant: reaccionar, comentar, valorar, preguntar, marcar como favorito y seguir al tenant. Seguir a un tenant permite al usuario recibir actualizaciones de las publicaciones del tenant.

**Why this priority**: Genera fidelización y comunidad alrededor de cada negocio. Es el fundamento para el seguimiento de publicaciones futuras.

**Independent Test**: Se puede probar accediendo a la página pública de un tenant y comprobando que un usuario autenticado puede ejecutar todas las interacciones disponibles, incluyendo seguir y dejar de seguir.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado en la página pública de un tenant, **When** hace clic en "Seguir", **Then** el usuario queda registrado como seguidor del tenant y el contador de seguidores se actualiza.
2. **Given** un usuario que sigue a un tenant, **When** hace clic en "Dejar de seguir", **Then** deja de ser seguidor y el contador se actualiza.
3. **Given** un usuario autenticado, **When** reacciona, comenta, valora o pregunta sobre un tenant, **Then** la interacción queda registrada bajo su identidad y es visible para todos.
4. **Given** un usuario que ya tiene valoración sobre un tenant, **When** intenta valorar de nuevo, **Then** su valoración anterior se actualiza (una por usuario por tenant).
5. **Given** un visitante no autenticado, **When** navega la vitrina de un tenant, **Then** puede ver interacciones, seguidores y valoraciones, pero no puede crear interacciones ni seguir.

---

### User Story 3 - Publicaciones del tenant (Priority: P3)

Un tenant publica contenido (texto, imágenes, video propio o video externo de YouTube/TikTok) con título y etiquetas. Las publicaciones tienen estado: borrador, publicado y archivado. Los usuarios autenticados pueden reaccionar, comentar (con respuestas anidadas) y compartir las publicaciones en redes sociales externas mediante un enlace de compartición.

**Why this priority**: Amplía el alcance del tenant más allá del catálogo de productos y crea un canal de comunicación directo con su audiencia.

**Independent Test**: Se puede probar creando una publicación desde el panel del tenant, publicándola, y comprobando que los usuarios pueden reaccionar, comentar y usar el enlace de compartición.

**Acceptance Scenarios**:

1. **Given** un usuario con rol PROPIETARIO o ADMIN del tenant, **When** crea una publicación con texto, imágenes y etiquetas en estado "borrador", **Then** la publicación es visible solo para PROPIETARIO y ADMIN del tenant.
2. **Given** una publicación en estado "borrador", **When** el PROPIETARIO o ADMIN la publica, **Then** la publicación es visible públicamente y los usuarios conectados la ven en tiempo real.
3. **Given** una publicación publicada, **When** un usuario autenticado reacciona o comenta, **Then** la interacción aparece de inmediato y los demás usuarios conectados que están viendo esa publicación la ven en tiempo real.
4. **Given** un comentario en una publicación, **When** otro usuario autenticado responde, **Then** la respuesta aparece anidada bajo el comentario padre.
5. **Given** una publicación publicada, **When** cualquier visitante (autenticado o no) hace clic en "Compartir", **Then** se genera un enlace hacia la plataforma de red social externa seleccionada (WhatsApp, Instagram, Facebook, TikTok, X/Twitter) que abre el contenido en esa red.
6. **Given** una publicación publicada, **When** el PROPIETARIO o ADMIN la archiva, **Then** deja de ser visible para el público pero permanece accesible a PROPIETARIO y ADMIN del tenant.
7. **Given** un tenant con publicaciones publicadas, **When** un usuario filtra por etiqueta, **Then** solo aparecen las publicaciones con esa etiqueta.

---

### User Story 4 - Actualizaciones en tiempo real (Priority: P4)

Todas las interacciones sociales (reacciones, comentarios, valoraciones, publicaciones nuevas) se reflejan de manera inmediata en la pantalla de todos los usuarios que estén viendo el mismo elemento en ese momento, sin necesidad de refrescar la página.

**Why this priority**: Es un requisito transversal que mejora la experiencia de comunidad. Sin tiempo real, las interacciones se sienten lentas e inconsistentes.

**Independent Test**: Se puede probar abriendo el mismo producto o publicación en dos navegadores distintos y comprobando que las acciones de uno aparecen inmediatamente en el otro.

**Acceptance Scenarios**:

1. **Given** dos usuarios viendo el mismo producto simultáneamente, **When** el primero publica un comentario, **Then** el segundo lo ve aparecer sin recargar la página en menos de 2 segundos.
2. **Given** dos usuarios viendo la vitrina de un tenant, **When** uno reacciona, **Then** el contador de reacciones del otro se actualiza en tiempo real.
3. **Given** dos usuarios viendo una publicación, **When** se agrega una nueva reacción o comentario, **Then** ambos ven el cambio reflejado inmediatamente.
4. **Given** un usuario que publica una nueva publicación, **When** la publica, **Then** los seguidores del tenant que estén conectados reciben una notificación o actualización en tiempo real.

---

### Edge Cases

- ¿Qué pasa si un usuario intenta comentar en un producto que fue eliminado? → El intento falla con mensaje de elemento no disponible.
- ¿Qué pasa si un usuario borra su cuenta? → Sus interacciones se anonimizán o eliminan según la política del tenant.
- ¿Qué pasa si el contenido de una publicación (imagen/video) no carga? → Se muestra un estado de error sin romper el resto de la publicación.
- ¿Pueden los comentarios tener más de dos niveles de anidamiento? → No; se admite solo un nivel de respuesta (comentario + respuesta directa).
- ¿Qué ocurre al eliminar un comentario raíz con respuestas? → El comentario raíz y todas sus respuestas se eliminan en cascada; no se muestra "comentario eliminado".
- ¿Qué ocurre si un usuario con rol CHEF o VENDEDOR intenta moderar contenido? → Solo usuarios con rol ADMIN, PROPIETARIO o ENCARGADO pueden eliminar/ocultar comentarios ajenos.
- ¿Qué pasa si la conexión en tiempo real se corta? → La interfaz degrada a modo estático y muestra las interacciones al cargar o recargar la página.
- ¿Puede un tenant restringir quién puede comentar en sus publicaciones? → No en la v1; la moderación se limita a eliminar comentarios inapropiados.
- ¿Puede una valoración tener puntuación cero? → No; la escala va de 1 a 5.
- ¿Pueden los usuarios no autenticados compartir publicaciones? → Sí; el enlace de compartición es accesible públicamente.

## Requirements *(mandatory)*

### Functional Requirements

**Reacciones**

- **FR-001**: El sistema DEBE permitir a un usuario autenticado reaccionar con un emoji a un producto, un tenant o una publicación.
- **FR-002**: El sistema DEBE restringir a una sola reacción activa por usuario por elemento; una nueva reacción reemplaza a la anterior.
- **FR-003**: El sistema DEBE permitir a un usuario retirar su reacción eliminándola.
- **FR-004**: El sistema DEBE permitir reaccionar también a comentarios individuales.

**Comentarios**

- **FR-005**: El sistema DEBE permitir a un usuario autenticado escribir comentarios sobre productos, tenants y publicaciones.
- **FR-006**: El sistema DEBE permitir respuestas directas a comentarios existentes (un nivel de anidamiento).
- **FR-007**: El sistema DEBE permitir a un usuario editar o eliminar sus propios comentarios. Al eliminar un comentario raíz, todas sus respuestas se eliminan en cascada.
- **FR-008**: El sistema DEBE permitir a un administrador del tenant eliminar cualquier comentario en su vitrina o publicaciones.
- **FR-009**: Los listados de comentarios DEBEN ser parametrizables por cantidad, página y orden (fecha ascendente o descendente).

**Valoraciones**

- **FR-010**: El sistema DEBE permitir a un usuario autenticado valorar un producto o tenant con una puntuación entera del 1 al 5 y una reseña de texto opcional.
- **FR-011**: El sistema DEBE restringir a una valoración por usuario por elemento; una nueva valoración actualiza la anterior.
- **FR-012**: El sistema DEBE calcular y exponer la puntuación promedio de cada elemento valorado.
- **FR-013**: Los listados de valoraciones DEBEN ser parametrizables por cantidad, página, orden por fecha o puntuación.

**Preguntas y respuestas**

- **FR-014**: El sistema DEBE permitir a un usuario autenticado hacer preguntas sobre un producto o tenant.
- **FR-015**: El sistema DEBE permitir a cualquier usuario autenticado responder preguntas existentes.
- **FR-016**: Los listados de preguntas DEBEN ser parametrizables por cantidad, página y orden por fecha.

**Favoritos**

- **FR-017**: El sistema DEBE permitir a un usuario autenticado marcar y desmarcar como favorito cualquier producto o tenant.
- **FR-018**: El sistema DEBE exponer el listado de favoritos de un usuario para que pueda acceder a ellos.

**Seguimiento de tenants**

- **FR-019**: El sistema DEBE permitir a un usuario autenticado seguir y dejar de seguir a un tenant.
- **FR-020**: El sistema DEBE exponer el conteo de seguidores de cada tenant.

**Publicaciones del tenant**

- **FR-021**: El sistema DEBE permitir a los usuarios con rol PROPIETARIO o ADMIN del tenant crear publicaciones con título, cuerpo de texto, imágenes, video propio y/o video externo (URL de YouTube o TikTok), y etiquetas.
- **FR-022**: Las publicaciones DEBEN tener estados: borrador, publicado y archivado. Solo las publicadas son visibles al público.
- **FR-023**: El sistema DEBE permitir filtrar publicaciones por etiqueta, estado y ordenarlas por fecha; la lista DEBE ser paginable.
- **FR-024**: El sistema DEBE generar un enlace de compartición para publicaciones en estado publicado, compatible con WhatsApp, Instagram, Facebook, TikTok y X/Twitter.

**Tiempo real**

- **FR-025**: El sistema DEBE emitir actualizaciones en tiempo real a los usuarios conectados cuando se crea una reacción, comentario, valoración o publicación sobre el elemento que están viendo.

### Key Entities

- **Reaccion**: Emoji seleccionado, usuario autor, tipo de elemento objetivo (producto, tenant, comentario, publicación), identificador del elemento; única por (usuario, elemento).
- **Comentario**: Texto, usuario autor, tipo de elemento objetivo, identificador del elemento, referencia al comentario padre (opcional); estado activo/eliminado.
- **Valoracion**: Puntuación (1–5), reseña de texto opcional, usuario autor, tipo de elemento objetivo (producto o tenant), identificador del elemento; única por (usuario, elemento).
- **Pregunta**: Texto, usuario autor, tipo de elemento objetivo (producto o tenant), identificador del elemento; puede tener múltiples respuestas.
- **Respuesta**: Texto, usuario autor, referencia a la pregunta padre.
- **Favorito**: Usuario autor, tipo de elemento objetivo (producto o tenant), identificador del elemento; único por (usuario, elemento).
- **Seguimiento**: Usuario autor, tenant seguido; único por (usuario, tenant).
- **Publicacion**: Título, cuerpo de texto, URL de imágenes, URL de video, URL de video externo (YouTube/TikTok), etiquetas, estado (borrador/publicado/archivado), tenant propietario, fechas de creación y publicación.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario autenticado puede completar cualquier interacción social (reaccionar, comentar, valorar, preguntar, marcar favorito) en menos de 10 segundos desde que accede al elemento.
- **SC-002**: Las actualizaciones en tiempo real (nuevas reacciones, comentarios, publicaciones) aparecen en la pantalla de los usuarios conectados en menos de 2 segundos tras la acción.
- **SC-003**: Los listados de comentarios, valoraciones y publicaciones responden con el primer conjunto de resultados en menos de 1 segundo, independientemente del volumen total de interacciones.
- **SC-004**: La restricción de una valoración por usuario por producto se cumple en el 100% de los casos, sin duplicados.
- **SC-005**: La restricción de una reacción activa por usuario por elemento se cumple en el 100% de los casos.
- **SC-006**: Los enlaces de compartición funcionan correctamente en WhatsApp, Facebook, Instagram, TikTok y X/Twitter para el 100% de las publicaciones publicadas.
- **SC-007**: Un tenant puede crear, publicar y archivar publicaciones sin asistencia técnica, en un flujo de no más de 3 pasos.
- **SC-008**: Las interacciones de usuarios no autenticados (lectura) están disponibles para el 100% del contenido público de productos y tenants.

## Assumptions

- Solo los usuarios autenticados pueden crear interacciones (reaccionar, comentar, valorar, preguntar, marcar favorito, seguir); los visitantes no autenticados solo pueden ver.
- Los usuarios staff del tenant (PROPIETARIO, ADMIN, ENCARGADO, etc.) pueden también actuar como usuarios sociales y crear interacciones (reaccionar, comentar, valorar) sobre productos y la vitrina de cualquier tenant, incluido el propio. El sistema registra al autor por su identidad de usuario sin diferenciar por rol.
- Los emojis disponibles para reaccionar son un conjunto predefinido por la plataforma (similar a las reacciones de Facebook: me gusta, amor, sorpresa, risa, tristeza, enojo), no personalizables por el tenant en v1.
- Los comentarios admiten un máximo de un nivel de respuesta anidada (comentario raíz → respuesta directa); no hay hilos de múltiples niveles.
- Compartir en redes sociales externas consiste en un enlace que abre la red social con el contenido prellenado (open graph / share URL); no implica publicación automática en la cuenta del usuario.
- La moderación de contenido inapropiado es manual: solo usuarios con rol ADMIN, PROPIETARIO o ENCARGADO del tenant pueden eliminar comentarios o publicaciones ajenas.
- Las valoraciones aplican a productos y tenants; no aplican a publicaciones (se reacciona a publicaciones, no se califican).
- El módulo es transversal: los mismos mecanismos de reacción, comentario y valoración sirven para todas las verticales (tienda, restaurante, consultorio, etc.).
- La escala de valoración es de 1 a 5 estrellas enteras; no se permiten medias estrellas.
- Las notificaciones push (email o push móvil) al autor cuando alguien responde o comenta están fuera del alcance de esta versión; solo se garantizan actualizaciones en tiempo real para usuarios conectados.
- Los videos propios se almacenan como URL (el upload de video a almacenamiento propio está fuera del alcance de v1); el tenant proporciona una URL directa o una URL de YouTube/TikTok.

## Clarifications

### Session 2026-05-25

- Q: ¿Los comentarios en publicaciones admiten el mismo anidamiento que en productos? → A: Sí, un nivel de respuesta anidada en todos los contextos.
- Q: ¿Compartir en redes externas genera publicación automática o solo enlace? → A: Solo enlace de compartición (share URL), no publicación automática.
- Q: ¿Las valoraciones aplican a publicaciones además de productos y tenants? → A: No; las publicaciones reciben reacciones y comentarios, no valoraciones.
- Q: ¿Qué roles del tenant pueden crear, editar y archivar publicaciones? → A: Solo PROPIETARIO y ADMIN; los demás roles (ENCARGADO, VENDEDOR, MESERO, CHEF) no pueden gestionar publicaciones.
- Q: Al eliminar un comentario raíz con respuestas, ¿qué ocurre con las respuestas? → A: Eliminación en cascada; el comentario raíz y todas sus respuestas desaparecen completamente.
- Q: ¿Pueden los usuarios staff del tenant también crear interacciones sociales (reaccionar, comentar, valorar)? → A: Sí; los usuarios staff interactúan normalmente con su cuenta de usuario sin restricción de rol.
