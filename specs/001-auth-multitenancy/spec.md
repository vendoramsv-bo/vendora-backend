# Feature Specification: Cimiento de Autenticación y Multi-tenancy

**Feature Branch**: `001-auth-multitenancy`
**Created**: 2026-05-20
**Status**: Draft

## Clarifications

### Session 2026-05-20

- Q: ¿Quién puede eliminar a un miembro del tenant, y puede un miembro salir voluntariamente? → A: Propietario y admin pueden eliminar miembros; cualquier miembro puede salir voluntariamente del tenant.
- Q: ¿Puede eliminarse permanentemente un tenant, y qué ocurre con sus miembros y datos? → A: Sí, el propietario puede eliminar el tenant; los miembros quedan desvinculados y los datos se eliminan en cascada.
- Q: ¿Cuánto duran las sesiones de usuario y cómo se comporta el sistema al expirar? → A: Sesiones de 1 semana (7 días desde el inicio de sesión); al expirar el usuario debe volver a autenticarse.
- Q: ¿Qué ocurre tras varios intentos de inicio de sesión fallidos consecutivos? → A: Espera creciente entre intentos (ej. 5s, 15s, 60s…); sin bloqueo permanente de cuenta.
- Q: Si el único propietario de un tenant intenta eliminar su cuenta, ¿qué debe ocurrir? → A: La cuenta se elimina y el tenant se elimina en cascada automáticamente junto con todos sus datos.

## User Scenarios & Testing

### User Story 1 — Registro e Inicio de Sesión (Priority: P1)

Un usuario nuevo puede crear una cuenta con su email y contraseña, verificar su
dirección de email y acceder a la plataforma. También puede iniciar sesión usando
su cuenta de Google sin necesidad de registrarse previamente.

**Why this priority**: Sin autenticación no existe ninguna otra funcionalidad. Es
el punto de entrada obligatorio a toda la plataforma.

**Independent Test**: Se puede probar registrando un usuario nuevo, verificando el
email y accediendo con credenciales válidas — todo ello sin necesidad de ningún
tenant existente.

**Acceptance Scenarios**:

1. **Given** un visitante no registrado, **When** introduce email, contraseña y
   completa el formulario de registro, **Then** recibe un correo de verificación
   y su cuenta queda en estado "pendiente de verificación".

2. **Given** un usuario con cuenta pendiente de verificación, **When** hace clic
   en el enlace del correo de verificación, **Then** su email queda verificado y
   puede iniciar sesión.

3. **Given** un usuario registrado y verificado, **When** introduce email y
   contraseña correctos, **Then** obtiene acceso a la plataforma con una sesión
   activa.

4. **Given** un visitante, **When** elige "Iniciar sesión con Google" y autoriza
   el acceso, **Then** obtiene acceso a la plataforma (creando cuenta si es la
   primera vez).

5. **Given** un usuario que intenta iniciar sesión con email no verificado,
   **When** introduce sus credenciales, **Then** recibe un mensaje informándole
   que debe verificar su email primero.

6. **Given** un usuario autenticado, **When** solicita restablecer su contraseña,
   **Then** recibe un correo con un enlace para crear una nueva contraseña.

---

### User Story 2 — Creación y Configuración de Tenant (Priority: P1)

Un usuario autenticado puede crear una organización (tenant) que representa su
negocio, configurar sus datos básicos y activar las capacidades de negocio que
necesita (tienda, consultorio, restaurante).

**Why this priority**: El tenant es el contenedor de todos los datos del negocio.
Sin tenant no hay contexto para ninguna operación de la plataforma.

**Independent Test**: Un usuario autenticado puede crear un tenant, configurar
sus datos y activar un flag de capacidad — todo verificable sin otros miembros.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado, **When** crea un tenant con nombre, slug,
   descripción y logo, **Then** el tenant existe en la plataforma y el usuario
   queda registrado como propietario.

2. **Given** un propietario de tenant, **When** activa el flag "es tienda",
   **Then** el tenant tiene habilitada la capacidad de comercio retail sin afectar
   otras capacidades.

3. **Given** un tenant con flag "es consultorio" activo, **When** el propietario
   activa adicionalmente "es restaurante", **Then** el tenant tiene ambas
   capacidades activas simultáneamente.

4. **Given** un usuario intenta crear un tenant con un slug ya existente,
   **When** envía el formulario, **Then** recibe un error indicando que el slug
   no está disponible.

---

### User Story 3 — Invitación y Membresía (Priority: P2)

El propietario o administrador de un tenant puede invitar a otros usuarios por
email para que se unan al tenant con un rol determinado. El invitado recibe un
enlace por correo y al aceptarlo se convierte en miembro.

**Why this priority**: Permite la colaboración multi-usuario dentro de un negocio.
Sin membresía, la plataforma es de un solo usuario por tenant.

**Independent Test**: Con un tenant existente y un propietario, se puede invitar
un email, aceptar la invitación y verificar que el nuevo miembro aparece en el
tenant con el rol correcto.

**Acceptance Scenarios**:

1. **Given** un propietario o administrador de tenant, **When** introduce el email
   de un usuario y selecciona un rol, **Then** ese email recibe un correo con un
   enlace de invitación.

2. **Given** un invitado recibe un enlace de invitación válido, **When** hace
   clic en el enlace y confirma la aceptación, **Then** queda registrado como
   miembro del tenant con el rol asignado.

3. **Given** un invitado que aún no tiene cuenta en la plataforma, **When** acepta
   la invitación, **Then** puede registrarse y al completar la verificación queda
   automáticamente como miembro del tenant.

4. **Given** una invitación enviada hace más de 7 días, **When** el invitado
   intenta usarla, **Then** recibe un mensaje informando que el enlace expiró y
   debe solicitar una nueva invitación.

5. **Given** un usuario que ya es miembro de un tenant, **When** recibe una nueva
   invitación al mismo tenant, **Then** la invitación se rechaza indicando que ya
   es miembro.

---

### User Story 4 — Tenant Activo y Aislamiento (Priority: P2)

Un usuario que pertenece a varios tenants puede cambiar cuál es su "tenant activo"
en cualquier momento. Todas las operaciones se ejecutan exclusivamente en el
contexto del tenant activo, y ningún usuario puede acceder a datos de tenants
ajenos.

**Why this priority**: El aislamiento de datos entre tenants es un requisito de
seguridad crítico de la plataforma multi-tenant.

**Independent Test**: Con un usuario que pertenece a dos tenants y datos en cada
uno, se puede verificar que al cambiar de tenant activo solo se ven los datos del
tenant correspondiente.

**Acceptance Scenarios**:

1. **Given** un usuario miembro de múltiples tenants, **When** selecciona un
   tenant diferente como activo, **Then** todas las operaciones posteriores
   ocurren en el contexto del nuevo tenant activo.

2. **Given** un usuario autenticado, **When** intenta acceder a datos de un
   tenant al que no pertenece, **Then** recibe un error de acceso denegado y no
   ve ningún dato de ese tenant.

3. **Given** un usuario con tenant activo establecido, **When** cierra y reabre
   sesión, **Then** su tenant activo se restaura al que tenía al cerrar sesión.

---

### User Story 5 — Actualizaciones en Tiempo Real (Priority: P3)

Los usuarios conectados a un tenant ven reflejados inmediatamente en su interfaz
los cambios de datos del tenant (creación, actualización, eliminación) sin
necesidad de recargar la página.

**Why this priority**: Mejora la experiencia colaborativa; los miembros del mismo
tenant trabajan sobre información siempre actualizada.

**Independent Test**: Con dos sesiones abiertas en el mismo tenant, modificar el
tenant en una sesión y verificar que la otra lo refleja en menos de 2 segundos.

**Acceptance Scenarios**:

1. **Given** dos usuarios conectados al mismo tenant, **When** uno de ellos
   modifica el nombre o configuración del tenant, **Then** el otro ve el cambio
   reflejado automáticamente sin recargar.

2. **Given** un usuario conectado a un tenant, **When** el tenant es eliminado
   por el propietario, **Then** el usuario recibe una notificación en tiempo real
   y su sesión refleja que el tenant ya no está disponible.

---

### Edge Cases

- ¿Qué ocurre si un link de verificación de email se usa dos veces? → Se rechaza;
  el email ya está verificado.
- ¿Qué ocurre si un usuario intenta crear un segundo tenant con el mismo slug?
  → Se rechaza con error de slug duplicado.
- ¿Qué pasa si el único propietario de un tenant elimina su propia cuenta? →
  El tenant y todos sus datos se eliminan en cascada automáticamente.
- ¿Qué ocurre si un miembro es eliminado del tenant mientras tiene esa sesión
  activa? → Sus tokens de acceso al tenant se invalidan en el siguiente request.
- ¿Puede el propietario salir voluntariamente de su propio tenant? → Solo si
  hay otro miembro con rol de propietario; de lo contrario debe transferir el
  rol antes de poder salir.
- ¿Puede un usuario pertenecer al mismo tenant con dos roles? → No; un usuario
  tiene un único rol por tenant.

## Requirements

### Functional Requirements

**Autenticación:**
- **FR-001**: El sistema DEBE permitir que un visitante cree una cuenta con email y contraseña.
- **FR-002**: El sistema DEBE enviar un correo de verificación al registrarse con email/contraseña.
- **FR-003**: El sistema DEBE requerir verificación de email antes de permitir el primer inicio de sesión.
- **FR-004**: El sistema DEBE permitir iniciar sesión con email y contraseña verificados.
- **FR-005**: El sistema DEBE permitir iniciar sesión mediante cuenta de Google (OAuth).
- **FR-006**: El sistema DEBE emitir un token de sesión activo al completar el inicio de sesión.
- **FR-007**: El sistema DEBE permitir recuperar el acceso mediante un enlace de restablecimiento de contraseña enviado al email.
- **FR-008**: El sistema DEBE permitir cerrar sesión, invalidando el token activo.
- **FR-029**: Las sesiones DEBEN expirar automáticamente 7 días después del inicio de sesión; al expirar, el usuario debe volver a autenticarse.
- **FR-030**: El sistema DEBE aplicar una espera creciente entre intentos de inicio de sesión fallidos consecutivos (ej. 5 s, 15 s, 60 s), sin bloquear permanentemente la cuenta.
- **FR-031**: Un usuario DEBE poder eliminar su propia cuenta; si es el único propietario de uno o más tenants, dichos tenants y todos sus datos se eliminan en cascada.

**Gestión de Tenants:**
- **FR-009**: Un usuario autenticado DEBE poder crear un tenant con nombre, slug, descripción y logo.
- **FR-010**: El usuario que crea un tenant DEBE quedar automáticamente registrado como propietario.
- **FR-011**: El slug del tenant DEBE ser único en toda la plataforma y contener solo caracteres válidos para URLs.
- **FR-012**: Un tenant DEBE poder activar o desactivar cada flag de capacidad (esTienda, esConsultorio, esRestaurante) de forma independiente.
- **FR-013**: Un propietario o administrador DEBE poder actualizar los datos del tenant (nombre, descripción, logo, slug, flags).
- **FR-028**: Solo el propietario DEBE poder eliminar permanentemente un tenant; al hacerlo, todos los miembros quedan desvinculados y los datos del tenant se eliminan en cascada.

**Invitaciones y Membresía:**
- **FR-014**: Un propietario o administrador DEBE poder invitar usuarios por email con un rol específico.
- **FR-015**: El sistema DEBE enviar al invitado un correo con un enlace de invitación válido por 7 días.
- **FR-016**: Al aceptar una invitación válida, el invitado DEBE quedar registrado como miembro con el rol asignado.
- **FR-017**: Un usuario DEBE poder pertenecer a múltiples tenants con roles diferentes en cada uno.
- **FR-018**: El sistema DEBE rechazar invitaciones duplicadas a usuarios que ya son miembros del tenant.
- **FR-019**: Las invitaciones expiradas DEBEN comunicarlo al usuario y no ejecutar ningún cambio de membresía.
- **FR-026**: Un propietario o administrador DEBE poder eliminar a cualquier miembro del tenant (excepto a sí mismo si es el único propietario).
- **FR-027**: Un miembro DEBE poder salir voluntariamente de un tenant, siempre que no sea el único propietario activo.

**Contexto y Aislamiento de Tenant:**
- **FR-020**: La sesión del usuario DEBE mantener un tenant activo.
- **FR-021**: El usuario DEBE poder cambiar su tenant activo entre los tenants a los que pertenece.
- **FR-022**: Todas las operaciones DEBEN ejecutarse exclusivamente en el contexto del tenant activo.
- **FR-023**: El sistema DEBE impedir que cualquier usuario acceda o modifique datos de tenants a los que no pertenece.

**Auditoría:**
- **FR-024**: Los registros principales del tenant DEBEN almacenar el identificador del usuario que los creó y el del último que los modificó.

**Tiempo Real:**
- **FR-025**: Los usuarios conectados a un tenant DEBEN recibir una notificación automática cuando el tenant es creado, actualizado o eliminado.

### Key Entities

- **Usuario**: Identidad en la plataforma. Atributos: email (único), nombre,
  estado de verificación de email, imagen de perfil.

- **Sesión**: Sesión activa de un usuario. Atributos: token, fecha de expiración
  (7 días desde el inicio de sesión), referencia al tenant activo.

- **Tenant**: Organización/negocio. Atributos: nombre, slug (único global),
  descripción, URL de logo, flags de capacidad (esTienda, esConsultorio,
  esRestaurante), auditoría (creador, último modificador).

- **TenantMiembro**: Relación usuario-tenant. Atributos: referencia al tenant,
  referencia al usuario, rol (cadena libre definida por la vertical), fecha de
  ingreso.

- **Invitación**: Invitación pendiente. Atributos: referencia al tenant, email
  del invitado, rol asignado, token único, estado (pendiente / aceptada /
  expirada), fecha de expiración.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Un usuario nuevo completa registro, verificación de email e inicio
  de sesión en menos de 5 minutos desde el primer clic.
- **SC-002**: El inicio de sesión (email/contraseña o Google) se completa en
  menos de 3 segundos en condiciones normales de red.
- **SC-003**: La creación de un tenant con todos sus datos se completa en menos
  de 3 segundos.
- **SC-004**: El 100% de los flujos de invitación (invitar → email → aceptar →
  membresía) se completan sin errores cuando el enlace es válido.
- **SC-005**: El aislamiento entre tenants es completo: ningún escenario de prueba
  permite que un usuario acceda a datos de un tenant ajeno.
- **SC-006**: Las notificaciones en tiempo real de cambios en el tenant llegan a
  los usuarios conectados en menos de 2 segundos.
- **SC-007**: El 100% de los registros principales auditables almacenan correctamente
  el creador y el último modificador en todos los escenarios de creación/actualización.

## Assumptions

- Los tokens de invitación expiran en 7 días (estándar de la industria para
  invitaciones por correo).
- Los enlaces de verificación de email expiran en 24 horas.
- El logo del tenant se proporciona como URL pública; la gestión de archivos
  adjuntos está fuera del alcance de este feature.
- El slug del tenant puede editarse mientras el nuevo valor sea único; el historial
  de slugs anteriores no se conserva.
- Un usuario recién registrado sin tenant puede crear uno o esperar invitación;
  no existe un "tenant por defecto".
- Cuando un usuario crea un tenant, el rol que se le asigna es "PROPIETARIO"; el
  resto de roles son definidos libremente por cada vertical de negocio.
- La autenticación con Google no requiere contraseña adicional; la cuenta de Google
  es la fuente de identidad.
- La recuperación de contraseña solo aplica a cuentas creadas con email/contraseña,
  no a cuentas vinculadas exclusivamente con Google.
