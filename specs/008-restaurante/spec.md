# Feature Specification: Módulo de Restaurante

**Feature Branch**: `008-restaurante`  
**Created**: 2026-05-25  
**Status**: Draft  
**Input**: Módulo completo de restaurante para tenants con capacidad `esRestaurante`

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Configuración del Restaurante (Priority: P1)

El administrador del restaurante configura el perfil operativo: capacidad de mesas y comensales, tipos de servicio habilitados (mesa, delivery, para llevar), duración promedio por comensal en minutos, y los parámetros de publicación automática en redes sociales. También define las franjas horarias (tiempos de comida) con su nombre, horario de inicio y fin, y orden de visualización.

**Why this priority**: Sin perfil y franjas configuradas no se pueden crear menús ni aceptar reservas. Es el punto de partida de todo el módulo.

**Independent Test**: El administrador accede a "Mi Restaurante", completa el perfil, guarda y puede crear inmediatamente una franja "Almuerzo 12:00–15:00". El perfil se recupera en el siguiente acceso.

**Acceptance Scenarios**:

1. **Given** un tenant con capacidad `esRestaurante`, **When** el admin accede al panel de configuración, **Then** puede definir capacidad, tipos de servicio y duración promedio; los cambios se guardan y reflejan en la vista de detalle.
2. **Given** el perfil ya configurado, **When** se crea la franja "Desayuno 07:00–10:30 orden=1", **Then** aparece listada ordenada correctamente y disponible para asignar a ítems de menú.
3. **Given** un tenant sin capacidad `esRestaurante`, **When** intenta acceder al módulo, **Then** recibe error 403 sin ver ninguna pantalla del restaurante.

---

### User Story 2 — Gestión de Menús (Priority: P1)

El administrador crea menús con nombre, tipo de vigencia (diario, semanal, especial, permanente, evento) y estado (borrador). Agrega ítems del catálogo al menú, asignando cada ítem a un tiempo de comida, definiendo su precio en el menú (independiente del precio base), y marcando si está destacado, es especial o está disponible hoy. El administrador puede aprobar, publicar y archivar menús.

**Why this priority**: El menú es el eje del negocio; sin él no hay reservas, panel de cocina ni publicación en redes.

**Independent Test**: Se puede crear un menú "Almuerzo del lunes", agregarle tres platos del catálogo con precios específicos y publicarlo. Un cliente externo puede consultar el menú publicado.

**Acceptance Scenarios**:

1. **Given** un admin autenticado, **When** crea un menú con vigencia "diario" y lo lleva a estado "publicado", **Then** el menú es visible públicamente con sus ítems ordenados por tiempo de comida.
2. **Given** un ítem del catálogo, **When** se agrega a un menú con precio 15,50, **Then** las reservas que incluyan ese ítem usan 15,50 como precio, independientemente del precio base del catálogo.
3. **Given** un menú publicado, **When** se archiva, **Then** ya no aparece en la lista pública pero permanece en el historial y las reservas existentes retienen sus precios.
4. **Given** un menú en borrador, **When** se intenta publicar sin ningún ítem, **Then** se rechaza con el mensaje "El menú debe tener al menos un ítem disponible".

---

### User Story 3 — Reservas de Clientes (Priority: P1)

Un cliente (registrado u ocasional) selecciona platos de un menú publicado, indica fecha/hora de llegada, número de comensales y observaciones por plato (ej. "sin cebolla"). El sistema genera un código único de reserva. El mesero puede actualizar el estado de la reserva hasta "pagada", momento en que se enlaza con una venta del módulo de caja del tenant.

**Why this priority**: Es el flujo de negocio principal del restaurante; representa la transacción central.

**Independent Test**: Un cliente crea una reserva con dos platos, recibe un código, el mesero la confirma cuando el cliente llega, y al finalizar se crea una venta vinculada al ID de la reserva.

**Acceptance Scenarios**:

1. **Given** un menú publicado con ítems disponibles, **When** un cliente completa el formulario de reserva, **Then** recibe un código único y la reserva aparece en el panel del restaurante con estado "reservada".
2. **Given** una reserva con estado "reservada", **When** el mesero la confirma (cliente llegó), **Then** el estado cambia a "confirmada" y todos los usuarios del restaurante ven el cambio en tiempo real.
3. **Given** una reserva en estado "entregada", **When** el cajero registra el pago, **Then** el estado pasa a "pagada" y se crea automáticamente una venta en el módulo de caja con `referenciaTipo = "RESERVA_RESTAURANTE"` y el total de los ítems.
4. **Given** una reserva con estado "reservada", **When** el cliente no se presenta antes del cierre, **Then** el mesero puede marcarla como "no asistió".

---

### User Story 4 — Panel de Cocina en Tiempo Real (Priority: P2)

La cocina visualiza todas las reservas activas con los platos pendientes de preparar. Cada plato tiene su estado individual (pendiente, en preparación, listo, entregado). Al cambiar el estado de un plato, todos los usuarios conectados (cocina, meseros) ven la actualización instantáneamente. Cada transición de estado queda registrada con timestamp para medir tiempos de preparación.

**Why this priority**: Optimiza la coordinación entre cocina y servicio; su valor es alto pero depende de que las reservas ya funcionen (P1).

**Independent Test**: Con dos pestañas abiertas (cocina y mesero), al marcar un plato como "listo" en la vista de cocina, la vista del mesero se actualiza sin recargar la página en menos de 2 segundos.

**Acceptance Scenarios**:

1. **Given** una reserva en estado "en preparación", **When** la cocina marca un plato como "listo", **Then** el estado del plato se actualiza en todos los clientes conectados en tiempo real (≤ 2 s).
2. **Given** varios platos de distintas reservas, **When** se ordena por tiempo de llegada, **Then** los platos más antiguos aparecen primero para priorizar la atención.
3. **Given** un plato que pasa de "pendiente" → "en preparación" → "listo", **Then** cada transición queda registrada con su timestamp y el sistema puede calcular el tiempo promedio de preparación.
4. **Given** todos los platos de una reserva en estado "entregado", **Then** el estado de la reserva avanza automáticamente a "lista".

---

### User Story 5 — Publicación Automática en Redes Sociales (Priority: P3)

El administrador programa la publicación automática del menú del día en Instagram y/o Facebook a una hora definida. El sistema genera una imagen con los ítems del menú y la publica mediante la Graph API oficial. Cada publicación registra métricas de alcance y reacciones. Si la publicación falla, se notifica al administrador.

**Why this priority**: Funcionalidad de marketing complementaria; no bloquea la operación principal del restaurante.

**Independent Test**: Al configurar publicación automática a las 10:00 y llegar esa hora, el sistema genera la imagen y registra el intento de publicación con su resultado (éxito o error) en el historial.

**Acceptance Scenarios**:

1. **Given** un menú publicado con hora programada, **When** llega la hora configurada, **Then** el sistema genera la imagen y registra un evento de publicación con estado "pendiente" → "publicado" o "fallido".
2. **Given** una publicación exitosa, **When** se consulta el historial, **Then** muestra plataforma, timestamp, y métricas disponibles (alcance, reacciones) en las últimas 24 horas.
3. **Given** un fallo en la publicación (token expirado, red caída), **When** ocurre el error, **Then** el administrador recibe una notificación interna y la publicación queda en estado "fallido" con el mensaje de error.

---

### Edge Cases

- ¿Qué pasa si se intenta reservar para una fecha/hora fuera del horario de algún tiempo de comida activo?  
  → Se rechaza con mensaje indicando el horario disponible.
- ¿Qué pasa si un ítem del catálogo se desactiva mientras está en un menú publicado?  
  → El ítem permanece visible en el menú pero con `disponibleHoy = false`; las reservas existentes no se alteran.
- ¿Qué pasa si se crea una reserva y luego el menú se archiva?  
  → La reserva conserva sus ítems y precios originales (snapshot al momento de reservar).
- ¿Qué pasa si dos meseros actualizan el estado de la misma reserva simultáneamente?  
  → Se aplica el último estado recibido; el historial registra ambas acciones con sus actores.
- ¿Qué pasa si el restaurante no tiene caja abierta al momento de pagar una reserva?  
  → El sistema rechaza el pago con mensaje "No hay caja abierta. Abra una caja antes de registrar el pago."
- ¿Qué pasa si un cliente ocasional no deja datos de contacto?  
  → La reserva se acepta con nombre y número de comensales; teléfono/email son opcionales para clientes ocasionales.

---

## Requirements *(mandatory)*

### Functional Requirements

**Acceso y guard**

- **FR-001**: El módulo DEBE estar accesible únicamente para tenants que tengan la capacidad `esRestaurante` activa; cualquier otro intento devuelve 403.
- **FR-002**: Los roles del restaurante (ADMIN, MESERO, COCINA) DEBEN tener permisos diferenciados: ADMIN gestiona perfil/menús/publicaciones; MESERO gestiona estados de reservas y marca ítems como "entregado"; COCINA actualiza ítems de reserva entre "pendiente", "en preparación" y "listo" únicamente.

**Perfil del restaurante**

- **FR-003**: El sistema DEBE permitir definir y actualizar: capacidad de mesas, capacidad de comensales, tipos de servicio habilitados como banderas informativas (mesa, delivery, para llevar — selección múltiple para comunicar al cliente qué servicios ofrece el restaurante), duración promedio por comensal en minutos, y configuración de publicación automática (plataformas habilitadas, hora de publicación, credenciales de integración). Los tipos "delivery" y "para llevar" son declarativos en esta iteración; no generan flujos operativos diferenciados.
- **FR-004**: El sistema DEBE permitir crear, editar, reordenar y eliminar franjas horarias (tiempos de comida), con nombre, hora inicio, hora fin y orden de visualización.

**Menús**

- **FR-005**: El sistema DEBE permitir crear menús con nombre, tipo de vigencia (diario, semanal, especial, permanente, evento), fecha de inicio y fin opcionales, y estado (borrador → aprobado → publicado → archivado).
- **FR-006**: El sistema DEBE permitir agregar ítems del catálogo a un menú especificando: tiempo de comida asignado, precio en el menú, bandera `destacado`, bandera `especial`, y bandera `disponibleHoy`.
- **FR-007**: El precio del ítem en el menú DEBE ser independiente del precio base del catálogo y persistirse en la reserva como precio al momento de la reserva (snapshot).
- **FR-008**: Solo menús en estado "publicado" DEBEN ser visibles para clientes externos. Pueden coexistir múltiples menús publicados simultáneamente.
- **FR-008b**: Al mostrar menús a un cliente, el sistema DEBE filtrar por la franja horaria (TiempoComida) cuyo rango horario incluya la hora de llegada solicitada en la reserva; si ninguna franja aplica, se muestran todos los menús publicados del día.
- **FR-009**: Un menú no DEBE poder publicarse si no tiene al menos un ítem con `disponibleHoy = true`.

**Reservas**

- **FR-010**: El sistema DEBE generar un código único e irrepetible para cada reserva (ej. formato `RST-YYYYMMDD-XXXX`).
- **FR-011**: El sistema DEBE soportar dos tipos de solicitante de reserva: (a) **cliente registrado** — tiene cuenta pública propia del restaurante (email + contraseña), creada exclusivamente para reservar; puede ver su historial de reservas; y (b) **cliente ocasional** — sin cuenta, proporciona nombre y opcionalmente teléfono/email en cada reserva, sin historial persistente.
- **FR-012**: Cada ítem de la reserva DEBE admitir observaciones de texto libre (ej. "sin cebolla", "extra salsa").
- **FR-013**: El flujo de estados de la reserva DEBE seguir: `reservada → confirmada → en preparación → lista → entregada → pagada`; con transiciones alternativas `cancelada` y `no asistió` disponibles desde estados anteriores a "pagada".
- **FR-014**: Al registrar el pago de una reserva, el sistema DEBE crear automáticamente una venta en el módulo de caja con `referenciaTipo = "RESERVA_RESTAURANTE"` y `referenciaId` del código de reserva, usando los precios snapshot de la reserva.
- **FR-015**: La creación de una venta al pagar DEBE requerir que exista una caja abierta; si no, el pago DEBE rechazarse con mensaje claro.

**Panel de cocina**

- **FR-016**: Cada ítem de una reserva DEBE tener su propio estado de cocina: `pendiente → en preparación → listo → entregado`. Las transiciones `pendiente → en preparación → listo` son responsabilidad del rol COCINA; la transición `listo → entregado` es responsabilidad exclusiva del rol MESERO.
- **FR-017**: Cada cambio de estado de un ítem DEBE registrarse con timestamp, actor y estado nuevo para cálculo de tiempos de preparación.
- **FR-018**: Cuando todos los ítems de una reserva estén en estado "entregado", el sistema DEBE actualizar automáticamente el estado de la reserva a "lista".

**Tiempo real**

- **FR-019**: Los cambios de estado de reservas y de ítems de cocina DEBEN propagarse a todos los usuarios conectados del restaurante en tiempo real (≤ 2 segundos) mediante eventos Socket.IO.
- **FR-020**: Los eventos en tiempo real DEBEN estar aislados por `restauranteId` para no cruzar datos entre tenants.

**Publicación en redes**

- **FR-021**: El sistema DEBE permitir configurar publicación automática del menú del día para Instagram y/o Facebook (Graph API oficial) a una hora programada diaria. WhatsApp y TikTok están fuera del alcance de esta iteración.
- **FR-022**: El sistema DEBE generar una imagen del menú del día con los ítems disponibles antes de publicar.
- **FR-023**: Cada intento de publicación DEBE registrarse con: plataforma, timestamp, estado (pendiente/publicado/fallido), y métricas disponibles (alcance, reacciones) actualizables posteriormente.
- **FR-024**: En caso de fallo en la publicación, el sistema DEBE notificar al administrador del restaurante con el mensaje de error.

**Auditoría**

- **FR-025**: Los modelos principales (menú, ítem de menú, reserva, ítem de reserva) DEBEN registrar `createdById` y `updatedById`.

**Listados**

- **FR-026**: Los listados de menús y reservas DEBEN soportar paginación, filtros por estado/fecha/vigencia, y ordenamiento configurable.

---

### Key Entities

- **ClienteRestaurante**: Cuenta pública creada por el comensal para reservar (email, contraseña, nombre, teléfono opcional). Independiente del sistema de staff del tenant. Un cliente registrado puede ver su historial de reservas.
- **Restaurante**: Perfil operativo del tenant (capacidad, servicios, configuración de redes). Un tenant tiene exactamente un Restaurante.
- **TiempoComida**: Franja horaria (desayuno, almuerzo, etc.) con nombre, horario y orden. Pertenece a un Restaurante.
- **Menu**: Carta con vigencia y ciclo de vida (borrador→publicado→archivado). Tiene muchos ítems. Pueden existir múltiples menús publicados al mismo tiempo; se filtran por TiempoComida para presentación al cliente.
- **MenuItems**: Vínculo entre un ítem del catálogo y un menú; define precio en menú, tiempo de comida asignado, y banderas (destacado, especial, disponibleHoy).
- **Reserva**: Pedido de un cliente con código único, datos del cliente, fecha/hora, número de comensales y estado. Tiene muchos ítems.
- **ReservaItem**: Plato o bebida de la reserva con precio snapshot, observaciones y estado de cocina.
- **EstadoCocinaLog**: Registro inmutable de cada cambio de estado de un ReservaItem (actor, timestamp, estado anterior/nuevo).
- **PublicacionRedes**: Registro de cada intento de publicación automática en redes sociales con estado y métricas.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El administrador completa la configuración inicial del restaurante (perfil + primera franja + primer menú publicado) en menos de 10 minutos.
- **SC-002**: Un cliente puede crear una reserva completa (seleccionar platos, fecha, comensales y confirmar) en menos de 3 minutos.
- **SC-003**: Los cambios de estado de reservas y platos de cocina llegan a todos los usuarios conectados en ≤ 2 segundos en condiciones normales de red.
- **SC-004**: El panel de cocina muestra siempre el estado correcto de todos los platos activos sin necesidad de recargar la página.
- **SC-005**: Al registrar el pago de una reserva, la venta correspondiente queda creada en el módulo de caja en el mismo acto, sin pasos manuales adicionales.
- **SC-006**: El historial de publicaciones en redes registra el 100% de los intentos de publicación (exitosos y fallidos) con su resultado y timestamp.
- **SC-007**: Los tiempos de preparación por plato quedan disponibles para consulta, permitiendo calcular promedios por tipo de plato.
- **SC-008**: Tenants sin capacidad `esRestaurante` no acceden a ningún endpoint del módulo (0 brechas de acceso).

---

## Clarifications

### Session 2026-05-25

- Q: ¿Cuáles plataformas de publicación en redes están en scope? → A: Solo Instagram + Facebook mediante Graph API oficial. WhatsApp y TikTok quedan fuera del alcance de esta iteración.
- Q: ¿Qué es un "cliente registrado" en el contexto de las reservas? → A: Perfil público independiente — el cliente crea una cuenta (email + contraseña) exclusivamente para hacer reservas en el restaurante, sin relación con el sistema de staff ni con la entidad Cliente del módulo de ventas.
- Q: ¿Pueden coexistir varios menús en estado "publicado" al mismo tiempo? → A: Sí — múltiples menús pueden estar publicados simultáneamente; el cliente ve los relevantes filtrados por la franja horaria (TiempoComida) vigente en el momento de la reserva.
- Q: ¿Qué alcance tienen delivery y para llevar en esta iteración? → A: Solo bandera informativa en el perfil del restaurante — sin flujo operativo diferenciado. El flujo completo de delivery/para llevar se implementa en una iteración futura.
- Q: ¿Quién puede marcar un ítem de reserva como "entregado"? → A: COCINA gestiona los estados hasta "listo" (preparó el plato); MESERO es el único que puede marcar "entregado" (llevó el plato a la mesa).

---

## Assumptions

- El catálogo de platos, bebidas y postres ya existe en el módulo de catálogo comercial (`003-catalogo-comercial`) y sus ítems son reutilizables por referencia.
- La integración con redes sociales requiere credenciales OAuth configuradas por el administrador (tokens de acceso); la generación de las credenciales es responsabilidad del admin, no del sistema.
- La generación de imagen del menú del día se realiza server-side en formato compatible con las APIs de cada red social (mínimo PNG 1080×1080).
- La caja unificada ya existe (`006-ventas-caja`) y expone una interfaz para crear ventas con `referenciaTipo` y `referenciaId`.
- El tiempo real se implementa mediante Socket.IO con Redis adapter, ya disponible en el backend.
- El módulo de publicación en redes utiliza BullMQ para encolar y ejecutar publicaciones programadas, ya disponible en el backend.
- Los roles MESERO y COCINA son extensiones del sistema de roles existente en `mejor-auth` / `TenantMember`.
- Los clientes registrados del restaurante tienen su propio sistema de autenticación público (registro/login con email + contraseña), completamente separado del sistema Better-Auth de staff del tenant. La autenticación de clientes registrados es responsabilidad del módulo de restaurante.
- Métricas de redes sociales (alcance, reacciones) son leídas periódicamente por el sistema mediante las APIs de cada plataforma y no están disponibles inmediatamente al publicar.
- El snapshot de precio en la reserva congela el precio del ítem en el menú al momento de crear la reserva; cambios posteriores al menú no afectan reservas existentes.
