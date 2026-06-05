# Feature Specification: TuRestaurante — Perfil Público de Restaurante

**Feature Branch**: `013-tu-restaurante`  
**Created**: 2026-06-04  
**Status**: Draft

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Activación y configuración del perfil público (Priority: P1)

El propietario activa el perfil público del restaurante para que sea visible en el directorio. Configura nombre comercial, logo, tipo de servicio, horarios y especialidad gastronómica.

**Why this priority**: Sin activación no existe presencia pública. Es el punto de entrada a todo el módulo.

**Independent Test**: Activar el flag `esRestaurante` en un tenant de prueba y verificar que aparece en `GET /api/public/restaurantes`. Desactivarlo y verificar que desaparece sin afectar menús ni reservas internas.

**Acceptance Scenarios**:

1. **Given** un tenant con `esRestaurante = false`, **When** el propietario activa el perfil, **Then** el restaurante aparece en el directorio público con nombre, logo, tipo de servicio y ubicación.
2. **Given** un tenant con `esRestaurante = true`, **When** el propietario desactiva el perfil, **Then** deja de aparecer en el directorio público, pero menús, cocina y reservas internas continúan funcionando.
3. **Given** un restaurante activo, **When** el propietario actualiza tipo de servicio a DELIVERY, **Then** el perfil público muestra DELIVERY y los consumidores pueden filtrarlo por ese tipo.
4. **Given** un restaurante activo, **When** el propietario configura horarios por día, **Then** los consumidores ven los horarios correctos en el perfil público.
5. **Given** un restaurante con `esRestaurante = false`, **When** alguien accede a `/api/public/restaurantes/:slug`, **Then** recibe 404 sin revelar que el tenant existe.

---

### User Story 2 — Directorio público de restaurantes (Priority: P2)

Un consumidor navega el directorio de restaurantes sin necesidad de autenticarse. Busca por cercanía, filtra por tipo de servicio y especialidad gastronómica, y accede al perfil completo.

**Why this priority**: Es la funcionalidad de descubrimiento. Requiere US1 completado.

**Independent Test**: Buscar restaurantes desde una sesión sin autenticación con `GET /api/public/restaurantes`. Verificar filtros por tipo de servicio, especialidad y cercanía.

**Acceptance Scenarios**:

1. **Given** varios restaurantes activos, **When** un consumidor consulta el directorio sin auth, **Then** obtiene lista con nombre, logo, tipo de servicio, especialidad gastronómica y distancia.
2. **Given** el directorio de restaurantes, **When** el consumidor filtra por `tipoServicio=DELIVERY`, **Then** solo aparecen restaurantes que ofrezcan delivery.
3. **Given** el directorio, **When** el consumidor filtra por especialidad (por ejemplo "parrilla"), **Then** solo aparecen restaurantes con esa especialidad.
4. **Given** el directorio con coordenadas, **When** el consumidor busca por `lat`/`lng`, **Then** los resultados se ordenan por distancia ascendente e incluyen `distanciaKm`.
5. **Given** un restaurante activo, **When** el consumidor accede a su perfil, **Then** ve nombre, descripción, logo, fotos, tipo de servicio, capacidad orientativa, horarios y médicos (en este caso equipo) visibles.
6. **Given** el directorio paginado, **When** el consumidor solicita página 2, **Then** recibe `{ data, total, page, limit, totalPaginas, hayPaginaSiguiente, hayPaginaAnterior }`.

---

### User Story 3 — Menú público del restaurante (Priority: P3)

Un consumidor ve el menú publicado del restaurante antes de decidir ir o hacer un pedido. Solo los menús en estado PUBLICADO son visibles; los BORRADOR son privados.

**Why this priority**: El menú es la principal razón de visita al perfil. Requiere US2.

**Independent Test**: Crear un menú en BORRADOR y verificar que no aparece públicamente. Publicarlo y verificar que aparece con sus ítems, precios y disponibilidad.

**Acceptance Scenarios**:

1. **Given** un menú en estado BORRADOR, **When** un consumidor intenta verlo, **Then** no aparece en el listado público.
2. **Given** un menú en estado PUBLICADO con ítems, **When** un consumidor consulta el menú del día, **Then** ve nombre del plato, descripción, precio y disponibilidad de cada ítem.
3. **Given** varios menús publicados (Desayuno, Almuerzo, Cena), **When** el consumidor filtra por tiempo de comida, **Then** solo ve los menús de ese tiempo.
4. **Given** un menú publicado para una fecha específica, **When** el consumidor consulta esa fecha, **Then** el menú aparece disponible; fuera de ese rango no aparece.
5. **Given** el perfil de un restaurante, **When** el consumidor accede al menú público, **Then** no se expone ningún costo de ingredientes ni información de almacén.

---

### User Story 4 — Reservas en línea (Priority: P4)

Un consumidor autenticado solicita una reserva de mesa desde el perfil público del restaurante, especificando fecha, hora, cantidad de comensales y observaciones.

**Why this priority**: Agrega valor transaccional al perfil. Requiere US2.

**Independent Test**: Ejecutar escenario de reserva con usuario autenticado: POST reserva → verificar estado PENDIENTE → verificar que el staff puede ver la reserva internamente.

**Acceptance Scenarios**:

1. **Given** un restaurante activo con tipo de servicio MESA o MIXTO, **When** un consumidor autenticado crea una reserva, **Then** se crea con estado PENDIENTE y el restaurante recibe notificación.
2. **Given** una reserva en estado PENDIENTE, **When** el consumidor consulta sus reservas, **Then** la ve con fecha, hora, estado y nombre del restaurante.
3. **Given** una reserva en estado PENDIENTE, **When** el consumidor la cancela, **Then** pasa a estado CANCELADA_CLIENTE y el restaurante recibe notificación.
4. **Given** una reserva ya CONFIRMADA o ATENDIDA, **When** el consumidor intenta cancelarla, **Then** recibe error indicando que ya no es posible cancelar.
5. **Given** un restaurante con tipo de servicio solo DELIVERY, **When** un consumidor intenta hacer reserva de mesa, **Then** recibe error descriptivo indicando que el restaurante no acepta reservas de mesa.

---

### User Story 5 — Interacciones sociales del restaurante (Priority: P5)

Un consumidor autenticado valora, comenta, pregunta, sigue y marca como favorito el restaurante como entidad, generando tejido social alrededor del establecimiento.

**Why this priority**: Genera reputación y fidelización. Requiere US2.

**Independent Test**: Valorar un restaurante, verificar que el promedio se actualiza en el directorio; comentar y verificar que aparece en el perfil público; seguir y verificar que el feed recibe publicaciones del restaurante.

**Acceptance Scenarios**:

1. **Given** un consumidor autenticado en el perfil de un restaurante, **When** registra una valoración 1–5 con reseña, **Then** aparece en el perfil; una segunda valoración reemplaza la anterior.
2. **Given** un consumidor en el perfil, **When** publica un comentario, **Then** aparece con soporte de respuestas anidadas (árbol recursivo) y reacciones con emoji.
3. **Given** un consumidor, **When** hace una pregunta pública, **Then** es visible inmediatamente; el propietario puede responder u ocultar la pregunta.
4. **Given** un consumidor que sigue el restaurante, **When** el restaurante publica contenido, **Then** aparece en el feed del seguidor en tiempo real.
5. **Given** un restaurante que recibe valoración/comentario/pregunta/seguidor, **When** ocurre el evento, **Then** el propietario recibe notificación en tiempo real.

---

### Edge Cases

- ¿Qué pasa si el restaurante solo tiene tipo DELIVERY y alguien intenta reservar mesa? → Error 422 indicando que el restaurante no acepta reservas presenciales.
- ¿Qué pasa si un consumidor no autenticado intenta crear una reserva? → 401 Unauthorized.
- ¿Qué pasa si el restaurante desactiva `esRestaurante` mientras tiene reservas PENDIENTE? → Las reservas existentes se conservan internamente; el perfil deja de ser público.
- ¿Qué pasa si se solicita una reserva para una fecha pasada? → 422 con error descriptivo.
- ¿Qué pasa al listar menús sin menús publicados? → Lista vacía con metadatos de paginación correctos.
- ¿Qué pasa si un consumidor intenta ocultar la pregunta de otro? → 403 Forbidden (solo PROPIETARIO/ADMIN del restaurante pueden moderar preguntas).
- ¿Qué pasa con los datos de costo de los ítems del menú al consultarlos públicamente? → El costo de ingredientes nunca se expone; solo precio de venta.
- ¿Qué pasa si el `numeroComensales` de una reserva supera la `capacidadComensales` del restaurante? → La reserva se acepta sin error; la capacidad es orientativa y el staff gestiona el aforo mediante el flujo de confirmación/rechazo interno.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir al propietario del tenant activar o desactivar el flag `esRestaurante` para controlar la visibilidad pública del restaurante.
- **FR-002**: El sistema DEBE mostrar en el directorio público únicamente los tenants con `esRestaurante = true`.
- **FR-003**: El sistema DEBE permitir al propietario configurar el perfil público: nombre comercial, descripción, logo, fotos, tipo de servicio (MESA/DELIVERY/PARA_LLEVAR/MIXTO), especialidad gastronómica, capacidad orientativa y duración promedio de atención.
- **FR-004**: El sistema DEBE exponer un directorio público de restaurantes sin requerir autenticación, filtrable por tipo de servicio y especialidad, ordenable por puntuación promedio, cercanía, seguidores o fecha, con búsqueda por nombre/descripción y paginación.
- **FR-005**: El sistema DEBE mostrar el perfil público completo de un restaurante activo sin requerir autenticación: nombre, descripción, logo, fotos, tipo de servicio, especialidad, horarios, ubicación, propietarios visibles, equipo público y capacidad orientativa.
- **FR-006**: El sistema DEBE exponer los menús en estado PUBLICADO del restaurante de forma pública sin requerir autenticación, con sus ítems (nombre, descripción, precio, disponibilidad), filtrables por tiempo de comida y fecha. Los menús en BORRADOR nunca son visibles públicamente.
- **FR-007**: El sistema DEBE garantizar que los costos de ingredientes, datos de almacén, historial de cocina, pedidos internos, ventas y caja NUNCA sean accesibles desde el perfil público.
- **FR-008**: El sistema DEBE permitir a consumidores autenticados crear reservas de mesa para restaurantes con tipo de servicio MESA o MIXTO, especificando fecha, hora, cantidad de comensales y observaciones. Las reservas se crean en estado PENDIENTE sin validar capacidad; el staff gestiona el aforo mediante confirmación o rechazo interno.
- **FR-009**: El sistema DEBE permitir a los consumidores consultar sus propias reservas activas y cancelar las que estén en estado PENDIENTE. No se pueden cancelar reservas CONFIRMADAS o ATENDIDAS desde el perfil público. Un consumidor puede tener múltiples reservas simultáneas (en cualquier estado) en el mismo restaurante; no existe restricción de unicidad por par consumidor-restaurante.
- **FR-010**: El sistema DEBE notificar al propietario en tiempo real cuando el restaurante recibe: nueva reserva, cancelación de reserva, nueva valoración, comentario, pregunta o seguidor.
- **FR-011**: El sistema DEBE permitir a consumidores autenticados valorar el restaurante (puntuación 1–5 y reseña), con una sola valoración activa por par consumidor-restaurante que reemplaza la anterior al actualizarla. Reutiliza las entidades polimórficas del módulo social con `referenciaTipo = "RESTAURANTE"`.
- **FR-012**: El sistema DEBE permitir comentarios con respuestas anidadas en árbol recursivo (sin límite de profundidad) y reacciones con emoji sobre el perfil del restaurante, reutilizando las entidades del módulo social con `referenciaTipo = "RESTAURANTE"`.
- **FR-013**: El sistema DEBE permitir preguntas públicas de consumidores autenticados; visibles inmediatamente (estado VISIBLE). El propietario o ADMIN puede ocultar individualmente una pregunta (estado OCULTA).
- **FR-014**: El sistema DEBE permitir a consumidores marcar el restaurante como favorito y seguirlo para recibir publicaciones en su feed, reutilizando las entidades del módulo social con `referenciaTipo = "RESTAURANTE"`.
- **FR-015**: El sistema DEBE permitir al equipo (PROPIETARIO o ADMIN) publicar novedades y promociones, reutilizando el modelo de publicaciones del módulo social con `referenciaTipo = "RESTAURANTE"`.
- **FR-016**: El sistema DEBE actualizar en tiempo real el perfil público (valoraciones, comentarios, seguidores) para los usuarios conectados sin recargar la página.
- **FR-017**: Todos los listados del directorio, menús, valoraciones, comentarios y preguntas DEBEN aceptar el contrato uniforme de consulta (paginación máx. 100/página, filtro, orden ASC/DESC). La respuesta incluye `{ data, total, page, limit, totalPaginas, hayPaginaSiguiente, hayPaginaAnterior }`.
- **FR-018**: La configuración del perfil público DEBE registrar quién la creó y quién la modificó (auditoría de autoría).

### Key Entities

- **PerfilRestaurante**: Configuración pública del restaurante — tipo de servicio, especialidad gastronómica, capacidad orientativa, duración promedio. Uno por tenant. Auditable.
- **DirectorioRestaurante**: Vista calculada de tenants con `esRestaurante = true` enriquecida con métricas sociales (puntuación promedio, total seguidores).
- **MenuPublico**: Los menús existentes del módulo restaurante en estado PUBLICADO, expuestos sin auth. Incluye ítems con precio de venta (sin costos).
- **ReservaPublica**: Reservas creadas desde el perfil público por consumidores autenticados. Estado PENDIENTE → RESERVADA (staff confirma) / RECHAZADA (staff rechaza) / CANCELADA_CLIENTE (consumidor cancela). `RECHAZADA` es distinto de `CANCELADA` (cancelación de una reserva ya confirmada) para permitir mensajes diferenciados al consumidor.
- **Valoracion** *(módulo social, extendido)*: Reutiliza entidad polimórfica con `referenciaTipo = "RESTAURANTE"`. Única por par consumidor-restaurante.
- **Comentario** *(módulo social, extendido)*: Árbol recursivo con `referenciaTipo = "RESTAURANTE"`.
- **PreguntaRestaurante** *(entidad nueva)*: Pregunta pública de consumidor al restaurante. Estado VISIBLE (por defecto) u OCULTA (por propietario/ADMIN). Con respuesta opcional.
- **Favorito** *(módulo social, extendido)*: `referenciaTipo = "RESTAURANTE"`. Único por par consumidor-restaurante.
- **Seguimiento** *(módulo social, extendido)*: `referenciaTipo = "RESTAURANTE"`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un propietario puede activar el perfil de restaurante y que aparezca en el directorio público en menos de 2 minutos desde el primer acceso al formulario.
- **SC-002**: Un consumidor puede encontrar un restaurante cercano, ver su menú del día y crear una reserva en menos de 3 minutos sin necesidad de llamar por teléfono.
- **SC-003**: El directorio público soporta al menos 200 restaurantes activos y devuelve resultados en menos de 2 segundos bajo carga normal.
- **SC-004**: Las notificaciones al propietario (nueva reserva, valoración, comentario) llegan en menos de 3 segundos tras el evento.
- **SC-005**: El 100% de la información operativa interna (costos, cocina, caja, almacén) permanece inaccesible desde el perfil público incluso con `esRestaurante = true`.
- **SC-006**: Un consumidor puede completar el flujo reserva → confirmación visible en su perfil en menos de 30 segundos.
- **SC-007**: Las actualizaciones del perfil (nueva valoración, cambio de configuración) son visibles a todos los usuarios conectados en menos de 3 segundos sin recargar.

---

## Assumptions

- El módulo de restaurante existente ya gestiona menús (con estados BORRADOR/PUBLICADO), tiempos de comida, reservas internas e ítems de menú. Este módulo los expone públicamente sin duplicar lógica.
- Las reservas creadas desde el perfil público se integran con las reservas internas existentes; el staff las gestiona desde el módulo de restaurante ya implementado.
- La `Localizacion` del tenant ya existe y se reutiliza para búsqueda geoespacial.
- Los consumidores usan el mismo sistema de autenticación que los miembros del tenant, pero sin membresía en ningún tenant.
- El sistema de publicaciones del módulo social ya implementado se extiende para `referenciaTipo = "RESTAURANTE"`, siguiendo el mismo patrón de TuTienda.
- Un restaurante con tipo de servicio DELIVERY puro no acepta reservas de mesa; la validación ocurre al intentar crear la reserva.
- El precio de venta de los ítems del menú es público; el costo de ingredientes es siempre privado.
- La especialidad gastronómica es un campo de texto libre (no un enum), permitiendo descripciones como "parrilla argentina", "italiana", "comida de mar".

## Clarifications

### Session 2026-06-05

- Q: ¿Debe el sistema rechazar una reserva si `numeroComensales` supera la `capacidadComensales` del restaurante? → A: No. La capacidad es orientativa; las reservas se aceptan sin validación de aforo y el staff gestiona mediante el flujo de confirmación/rechazo.
- Q: ¿Puede un consumidor tener múltiples reservas PENDIENTE simultáneas en el mismo restaurante? → A: Sí. Un consumidor puede crear múltiples reservas para fechas distintas; no existe restricción de unicidad por par consumidor-restaurante.
- Q: Cuando el staff rechaza una reserva PENDIENTE, ¿debe usarse un estado dedicado `RECHAZADA` o el existente `CANCELADA`? → A: Estado dedicado `RECHAZADA`. Permite distinguir "el restaurante rechazó mi solicitud" de "el restaurante canceló una reserva ya confirmada", habilitando mensajes diferenciados al consumidor.
