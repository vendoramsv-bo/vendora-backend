# Feature Specification: TuConsultorio — Perfil Público de Consultorio Médico

**Feature Branch**: `015-tu-consultorio`
**Created**: 2026-06-05
**Status**: Draft
**Input**: User description: prompts/prompt-tu-consultorio.md

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Activación y configuración del perfil público (Priority: P1)

Un propietario de consultorio activa su perfil público para que su consultorio sea visible en el directorio y comienza a configurar la información pública: nombre, descripción, logo, especialidades, horarios, médicos visibles y datos de contacto.

**Why this priority**: Sin perfil activo y configurado no hay visibilidad pública. Es el punto de entrada de todo el módulo.

**Independent Test**: El staff puede activar el flag `esConsultorio`, configurar todos los campos públicos y desactivarlo. Se verifica que el consultorio aparece/desaparece del directorio según el estado del flag, y que los datos de operación clínica interna no se exponen en ningún endpoint.

**Acceptance Scenarios**:

1. **Given** un tenant con módulo consultorio habilitado, **When** el propietario activa el perfil público, **Then** el consultorio aparece en el directorio público con la información configurada.
2. **Given** un consultorio activo, **When** el propietario actualiza especialidades, horarios o médicos visibles, **Then** los cambios se reflejan inmediatamente en el perfil público sin afectar la operación clínica interna.
3. **Given** un consultorio activo, **When** el propietario desactiva el perfil público, **Then** el consultorio desaparece del directorio y de búsquedas públicas, y las citas clínicas internas no se interrumpen.
4. **Given** un tenant sin módulo consultorio habilitado, **When** intenta acceder a los endpoints de perfil público, **Then** recibe un error indicando que la capacidad no está activa.

---

### User Story 2 — Directorio y perfil público de consultorios (Priority: P2)

Un consumidor (usuario sin membresía en el tenant) busca consultorios médicos cercanos, filtra por especialidad o tipo de servicio, y consulta el perfil completo de un consultorio de interés.

**Why this priority**: El directorio es la puerta de entrada para consumidores. Sin él ningún otro flujo de descubrimiento funciona.

**Independent Test**: Un usuario no autenticado puede listar el directorio, aplicar filtros geográficos y por especialidad, y ver el perfil completo de un consultorio incluyendo médicos visibles, horarios y servicios públicos. Se verifica que ningún dato clínico privado aparece en la respuesta.

**Acceptance Scenarios**:

1. **Given** varios consultorios activos, **When** un consumidor busca con coordenadas geográficas, **Then** los resultados están ordenados por distancia y solo incluyen consultorios con `esConsultorio=true`.
2. **Given** el directorio, **When** se filtra por especialidad "Pediatría", **Then** solo aparecen consultorios que ofrecen esa especialidad.
3. **Given** el directorio, **When** se filtra por tipo de servicio "teleconsulta", **Then** solo aparecen consultorios que ofrecen ese servicio.
4. **Given** el perfil de un consultorio, **When** se consulta, **Then** incluye nombre, descripción, especialidades, médicos marcados como visibles, horarios, servicios públicos y ubicación; y nunca incluye historias clínicas, recetas, diagnósticos ni datos de pacientes.

---

### User Story 3 — Catálogo de servicios públicos (Priority: P3)

Un consumidor puede ver los servicios médicos que ofrece un consultorio de manera pública, con nombre, descripción, duración estimada y precio (si el consultorio elige mostrarlo), filtrado por especialidad.

**Why this priority**: Apoya la decisión del consumidor antes de agendar, pero puede diferirse sin bloquear el agendamiento básico.

**Independent Test**: Se puede listar los servicios públicos de un consultorio sin autenticación. Se verifica que solo aparecen servicios con visibilidad pública activada y que no se expone información de costo interno.

**Acceptance Scenarios**:

1. **Given** un consultorio con servicios, **When** se consultan los servicios públicos, **Then** solo aparecen los marcados como visibles y el precio es opcional.
2. **Given** el catálogo de servicios, **When** se filtra por especialidad, **Then** solo se muestran servicios de esa especialidad.
3. **Given** un servicio marcado como solo uso interno, **When** se consultan los servicios públicos, **Then** ese servicio no aparece en la respuesta.

---

### User Story 4 — Agendamiento de citas en línea (Priority: P2)

Un consumidor autenticado visualiza la disponibilidad de un médico, solicita una cita eligiendo médico, servicio, fecha y hora, y puede consultar o cancelar sus citas activas.

**Why this priority**: Es la funcionalidad de mayor valor para el negocio del consultorio: convierte el tráfico del directorio en citas reales.

**Independent Test**: Un consumidor autenticado puede ver la disponibilidad, crear una cita con estado PENDIENTE, listar sus citas propias y cancelar una cita PENDIENTE o CONFIRMADA. Se verifica que el acceso es solo sobre las citas del propio consumidor.

**Acceptance Scenarios**:

1. **Given** la disponibilidad de un médico, **When** se consultan los horarios disponibles, **Then** se muestran los slots con cupos libres según el horario registrado menos las citas ya agendadas.
2. **Given** un slot disponible, **When** el consumidor solicita una cita, **Then** la cita se crea con estado PENDIENTE y el propietario recibe notificación en tiempo real.
3. **Given** una cita en estado PENDIENTE o CONFIRMADA, **When** el consumidor la cancela, **Then** el estado cambia a CANCELADA_CLIENTE.
4. **Given** una cita en estado ATENDIDA o posterior, **When** el consumidor intenta cancelarla, **Then** recibe un error indicando que la cita no es cancelable.
5. **Given** el listado de mis citas, **When** se consulta sin filtro, **Then** aparece el historial completo de citas del consumidor autenticado en todos los estados, ordenado por fecha descendente.
6. **Given** el listado de mis citas, **When** se filtra por estado "PENDIENTE", **Then** solo aparecen las citas activas pendientes del consumidor.

---

### User Story 5 — Interacciones sociales del consultorio (Priority: P3)

Un consumidor interactúa con el consultorio como entidad: reacciona, comenta, valora, hace preguntas públicas, lo marca como favorito y lo sigue para recibir publicaciones en su feed.

**Why this priority**: Construye la reputación del consultorio y el engagement de la comunidad, pero es accesorio a la función primaria de agendamiento.

**Independent Test**: Un consumidor autenticado puede ejecutar cada interacción social de forma independiente. Se verifica unicidad de valoración por usuario, estructura anidada de comentarios, visibilidad de preguntas y moderación por el staff.

**Acceptance Scenarios**:

1. **Given** un consultorio activo, **When** un consumidor lo valora con puntuación y reseña, **Then** la valoración se guarda (una activa por usuario) y el promedio del consultorio se recalcula.
2. **Given** un comentario existente, **When** otro usuario responde, **Then** la respuesta se vincula como hija del comentario padre.
3. **Given** una pregunta pública, **When** el staff la responde, **Then** la respuesta es visible; cuando la oculta, deja de aparecer en consultas públicas.
4. **Given** que un consumidor sigue al consultorio, **When** el consultorio publica una novedad, **Then** aparece en el feed del seguidor.
5. **Given** un consultorio, **When** un consumidor lo marca como favorito, **Then** el contador de favoritos incrementa; al desmarcar, decrementa.

---

### Edge Cases

- ¿Qué pasa si se solicita una cita en un horario que otro consumidor ya ocupó simultáneamente? → El sistema detecta el conflicto y devuelve error de slot no disponible.
- ¿Qué pasa si un médico visible es desactivado mientras hay citas futuras pendientes con él? → Las citas existentes no se cancelan; el staff gestiona manualmente.
- ¿Qué pasa si se desactiva el perfil público mientras hay citas de consumidores activas? → Las citas vigentes permanecen; el consultorio solo deja de aparecer en el directorio.
- ¿Qué pasa si un consumidor intenta valorar un consultorio con perfil inactivo? → Recibe error indicando que el consultorio no está disponible públicamente.
- ¿Qué pasa cuando el directorio se consulta sin coordenadas geográficas? → Se ordena por puntuación promedio descendente como criterio por defecto.
- ¿Qué pasa si se consultan los slots de disponibilidad de un día sin horario registrado? → Se devuelve lista vacía para ese día.

## Requirements *(mandatory)*

### Functional Requirements

**Perfil público — Staff**

- **FR-001**: El sistema DEBE permitir al propietario o admin activar el perfil público del consultorio mediante el flag `esConsultorio`.
- **FR-002**: El sistema DEBE permitir al propietario o admin desactivar el perfil público sin afectar la operación clínica interna ni las citas vigentes.
- **FR-003**: El sistema DEBE permitir configurar la información pública del consultorio: nombre comercial, descripción, logo, fotos, especialidades, número de registro/habilitación, información de contacto pública. Los horarios públicos se exponen desde la entidad de horarios existente del módulo consultorio mediante el flag `esPublico: boolean`; no se crea un modelo de horarios separado.
- **FR-004**: El sistema DEBE permitir marcar médicos del equipo como visibles públicamente, con nombre, especialidad, foto y descripción profesional breve.
- **FR-005**: El sistema DEBE guardar auditoría (creado por, modificado por) en la configuración del perfil público.

**Directorio público**

- **FR-006**: El sistema DEBE exponer un directorio público de consultorios con `esConsultorio=true`, consultable sin autenticación.
- **FR-007**: El directorio DEBE soportar búsqueda geográfica por proximidad usando PostGIS (`ST_DWithin` + `ST_Distance`) sobre una columna `GEOGRAPHY(POINT)` con índice GIST en `ConsultorioPerfil`. El consumidor proporciona latitud y longitud; el radio de búsqueda por defecto es 10 km.
- **FR-008**: El directorio DEBE soportar filtros por especialidad médica y por tipo de servicio (presencial, teleconsulta, ambos).
- **FR-009**: El directorio DEBE soportar ordenamiento por puntuación promedio, cercanía, número de seguidores y fecha de incorporación.
- **FR-010**: El perfil público del consultorio DEBE incluir: nombre, descripción, logo, fotos, especialidades, médicos visibles, horarios, ubicación y servicios públicos.
- **FR-011**: El perfil público NUNCA DEBE incluir historias clínicas, diagnósticos, recetas, datos de pacientes, resultados de exámenes, datos de facturación ni movimientos de inventario.

**Servicios públicos**

- **FR-012**: El sistema DEBE exponer el catálogo de servicios marcados como visibles públicamente para un consultorio, sin autenticación.
- **FR-013**: Cada servicio público DEBE mostrar nombre, descripción, duración estimada y precio (si el consultorio elige mostrarlo).
- **FR-014**: El catálogo de servicios DEBE ser filtrable por especialidad.

**Agendamiento de citas**

- **FR-015**: El sistema DEBE calcular y exponer los slots disponibles de un médico para un servicio dado y un rango de fechas. Los slots se derivan de los horarios del módulo consultorio con `esPublico=true` del médico, menos las citas ya agendadas, usando la duración estimada del servicio seleccionado como intervalo entre slots. El consumidor debe elegir el servicio antes de consultar la disponibilidad.
- **FR-016**: Un consumidor autenticado DEBE poder solicitar una cita eligiendo médico, servicio, fecha y hora disponible; la cita se crea en el modelo `Cita` existente con estado PENDIENTE y `origenOnline=true`, apareciendo inmediatamente en la agenda interna del staff.
- **FR-017**: El sistema DEBE notificar al propietario en tiempo real cuando se crea una solicitud de cita en línea.
- **FR-018**: Un consumidor DEBE poder listar todas sus propias citas en cualquier estado, con un parámetro de filtro opcional por estado (PENDIENTE, CONFIRMADA, ATENDIDA, CANCELADA_CLIENTE, RECHAZADA). Por defecto, sin filtro, se devuelve el historial completo ordenado por fecha descendente.
- **FR-019**: Un consumidor DEBE poder cancelar una cita propia en estado PENDIENTE o CONFIRMADA; el estado cambia a CANCELADA_CLIENTE.
- **FR-020**: El sistema DEBE rechazar la cancelación de citas en estados ATENDIDA, PAGADA, RECHAZADA, CANCELADA o CANCELADA_CLIENTE.
- **FR-021**: El sistema DEBE detectar conflictos de slot al crear una cita concurrente y devolver error de slot no disponible.

**Interacciones sociales**

- **FR-022**: Un consumidor autenticado DEBE poder reaccionar al perfil del consultorio con un tipo de reacción.
- **FR-023**: Un consumidor autenticado DEBE poder comentar el perfil y responder comentarios (estructura anidada de 2 niveles).
- **FR-024**: Un consumidor autenticado DEBE poder valorar el consultorio con puntuación 1–5 y reseña; se mantiene una sola valoración activa por usuario por consultorio.
- **FR-025**: Un consumidor autenticado DEBE poder hacer preguntas públicas al consultorio.
- **FR-026**: El propietario o admin DEBE poder responder y ocultar preguntas individualmente.
- **FR-027**: Un consumidor autenticado DEBE poder marcar/desmarcar el consultorio como favorito (toggle).
- **FR-028**: Un consumidor autenticado DEBE poder seguir/dejar de seguir el consultorio (toggle).
- **FR-029**: El propietario o admin DEBE poder publicar novedades en el perfil del consultorio, reutilizando el modelo de publicaciones del módulo social.
- **FR-030**: Las publicaciones DEBEN aparecer en el feed de los seguidores del consultorio.

**Notificaciones y tiempo real**

- **FR-031**: El sistema DEBE notificar al propietario en tiempo real cuando el consultorio recibe una nueva valoración, comentario, pregunta, seguidor o solicitud de cita en línea.
- **FR-032**: Los consumidores autenticados conectados vía socket (JWT requerido) DEBEN recibir actualizaciones de perfil, valoraciones, comentarios y nuevos seguidores en tiempo real sin recargar la página. Los visitantes anónimos no reciben eventos en tiempo real.

**Consultas parametrizables**

- **FR-033**: Todos los listados (directorio, seguidores, valoraciones, comentarios, preguntas, disponibilidad) DEBEN soportar paginación máximo 100 por página, filtro y orden ASC/DESC por campo acotado.
- **FR-034**: Las respuestas de listados DEBEN incluir: datos, total, página, límite, totalPaginas, hayPaginaSiguiente y hayPaginaAnterior.

### Key Entities

- **ConsultorioPerfil**: Configuración pública del consultorio del tenant. Atributos: nombre, descripción, logo, fotos, especialidades, número de registro, horarios, contacto público, tipo de servicio (presencial/teleconsulta/ambos), `ubicacion GEOGRAPHY(POINT)` (índice GIST) para búsqueda geográfica. Referenciado por `tenantId`.
- **MédicoVisible**: Miembro del equipo marcado como visible públicamente. Atributos: nombre, especialidad, foto, descripción profesional breve, orden de visualización.
- **ServicioPublico**: Servicio del catálogo del consultorio con visibilidad pública activada. Atributos: nombre, descripción, especialidad, duración estimada, precio (opcional), estado.
- **SlotDisponible**: Intervalo horario libre calculado para un médico + servicio en una fecha. La duración del intervalo es la `duracionEstimada` del servicio seleccionado. Se deriva del horario registrado del médico menos las citas ya agendadas. No persiste; se calcula dinámicamente en cada consulta.
- **Cita** (extendida, reutilizada): La cita en línea reutiliza el modelo `Cita` del módulo consultorio. Se agrega el campo `origenOnline` (booleano, por defecto `false`). Las citas creadas por consumidores tienen `origenOnline=true`, estado inicial PENDIENTE, y `createdById` como referencia al consumidor. Esto las hace visibles en la agenda interna del staff desde el momento de la solicitud.
- **ConsultorioValoracion**: Puntuación 1–5 + reseña. Unicidad: un usuario activo por consultorio.
- **ConsultorioComentario**: Comentario con respuestas anidadas (2 niveles) y reacciones; estado (ACTIVO/INACTIVO).
- **ConsultorioPregunta**: Pregunta pública con respuestas y estado de visibilidad (ACTIVO/INACTIVO).
- **ConsultorioSeguidor**: Relación usuario–consultorio para seguimiento de novedades.
- **ConsultorioFavorito**: Marcado de consultorio como favorito por un usuario.
- **Publicacion** (reutilizada): Novedad publicada por el equipo con `referenciaTipo = "CONSULTORIO"`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un propietario puede activar, configurar y publicar el perfil público de su consultorio en menos de 5 minutos desde la primera vez.
- **SC-002**: El directorio devuelve resultados en menos de 2 segundos bajo carga normal con hasta 500 consultorios activos.
- **SC-003**: Un consumidor puede buscar consultorios cercanos, ver el perfil completo y solicitar una cita en menos de 3 minutos.
- **SC-004**: La disponibilidad de slots refleja cambios de citas confirmadas en menos de 5 segundos.
- **SC-005**: Las notificaciones al propietario sobre nuevas citas, valoraciones, comentarios y seguidores llegan en menos de 3 segundos.
- **SC-006**: Ningún dato clínico privado (historias, recetas, diagnósticos, datos de pacientes) es accesible a través de los endpoints públicos, validado mediante auditoría de privacidad.
- **SC-007**: El 100% de los listados pagina correctamente con máximo 100 elementos por página y responde el contrato uniforme de consulta.
- **SC-008**: Las solicitudes de cita concurrentes sobre el mismo slot se resuelven sin inconsistencias: exactamente una tiene éxito.

## Clarifications

### Session 2026-06-05

- Q: ¿La solicitud de cita en línea crea un registro en el modelo `Cita` existente o en un modelo separado? → A: Mismo modelo `Cita` con campo `origenOnline=true`; la cita aparece directamente en la agenda del staff con estado PENDIENTE.
- Q: ¿Los slots de disponibilidad tienen granularidad fija o derivada del servicio? → A: Derivada del servicio — el consumidor elige el servicio primero y los slots se calculan según la duración estimada de ese servicio.
- Q: ¿El consumidor ve solo citas activas o el historial completo? → A: Historial completo — todos los estados visibles con parámetro de filtro opcional por estado (PENDIENTE, CONFIRMADA, ATENDIDA, CANCELADA_CLIENTE, RECHAZADA).

### Session 2026-06-07

- Q: ¿Qué estrategia de búsqueda geográfica se usa para el directorio (FR-007)? → A: PostGIS — columna `GEOGRAPHY(POINT)` con índice GIST en `ConsultorioPerfil`, queries con `ST_DWithin` + `ST_Distance`, radio por defecto 10 km.
- Q: ¿Los eventos en tiempo real (FR-032) aplican a visitantes anónimos o solo a consumidores autenticados? → A: Solo consumidores autenticados con JWT válido reciben eventos via socket; visitantes anónimos no tienen acceso al socket en tiempo real.
- Q: ¿Los horarios del perfil público (FR-003) y los horarios usados para calcular slots (FR-015) son el mismo modelo o entidades separadas? → A: Un solo modelo — se reutiliza la entidad de horarios existente del módulo consultorio agregando el flag `esPublico: boolean`; no se crea un modelo de horarios separado.

## Assumptions

- El módulo de consultorio clínico (citas internas, historias clínicas, recetas, atenciones) ya está implementado; este feature solo extiende la visibilidad pública.
- Los tenants con `esConsultorio=true` ya tienen localizaciones registradas que se usan para búsqueda geográfica.
- El modelo de médicos del equipo ya existe en el módulo consultorio; este feature agrega el flag de visibilidad pública y campos de presentación.
- El modelo de publicaciones del módulo social existente es reutilizado con `referenciaTipo = "CONSULTORIO"`.
- El modelo de comentarios del módulo social existente es reutilizado con `referenciaTipo = "CONSULTORIO"`.
- El agendamiento en línea reutiliza el modelo `Cita` existente agregando el campo `origenOnline=true`; la cita aparece en la agenda del staff con estado PENDIENTE desde el momento de la solicitud. La confirmación, atención y gestión clínica sigue siendo responsabilidad exclusiva del staff interno.
- La disponibilidad de un médico se calcula a partir del horario registrado en el módulo consultorio y las citas ya agendadas; no se implementa bloqueo de recursos con concurrencia optimista en esta fase (se detecta conflicto al crear y se devuelve error).
- Los servicios médicos públicos son un subconjunto del catálogo existente del consultorio marcados con un flag de visibilidad pública; no se crea un catálogo separado.
- La autenticación de consumidores usa el mismo sistema Better-Auth ya implementado; un consumidor es un usuario registrado sin membresía activa en el tenant.
- El tipo de servicio del consultorio (presencial, teleconsulta, ambos) es un nuevo atributo del perfil público; la implementación de teleconsulta en sí está fuera del alcance.
- Las interacciones sociales siguen el mismo patrón arquitectónico que TuTienda (feature 012) y TuRestaurante (feature 013).
- Los patrones de reacciones, comentarios árbol, valoraciones, preguntas, favoritos y seguidores se implementan como nuevos modelos en el schema `social` siguiendo los modelos `Tienda*` y `Restaurante*` ya existentes.
