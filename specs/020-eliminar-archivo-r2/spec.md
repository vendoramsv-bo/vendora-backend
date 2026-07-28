# Feature Specification: Eliminación Real de Archivos en Cloudflare R2

**Feature Branch**: `020-eliminar-archivo-r2`
**Created**: 2026-07-25
**Status**: Draft
**Input**: User description: "Al eliminar una imagen de la galería de un producto (u otro punto de captura que use el mecanismo de subida de 019-upload-r2-presigned), el archivo no se elimina realmente de Cloudflare R2 — solo se quita la referencia (URL) del lado de la aplicación. El backend debe exponer una operación que elimine de verdad el objeto en el bucket cuando el usuario decide borrar una imagen ya subida, evitando que los archivos huérfanos se acumulen en el almacenamiento."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Eliminar una imagen ya subida (Priority: P1)

Un usuario que ya subió una imagen (por ejemplo, a la galería de un producto, o como foto de perfil/logo) decide quitarla. Al confirmar la eliminación, la imagen deja de estar asociada Y el archivo deja de existir en el almacenamiento — no queda ocupando espacio de forma invisible.

**Why this priority**: Es el problema concreto reportado: hoy "eliminar" solo actualiza la referencia en la aplicación, dejando el archivo real huérfano en el bucket indefinidamente. Sin esto, el espacio de almacenamiento (limitado por el plan gratuito de R2) crece sin control real de parte del usuario.

**Independent Test**: Puede probarse subiendo una imagen, obteniendo su URL pública, eliminándola desde la UI, y verificando que esa URL ya no sirve el contenido (por ejemplo, devuelve 404) tras la eliminación.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado con un tenant activo que ya subió un archivo mediante el mecanismo de `019-upload-r2-presigned`, **When** solicita eliminar ese archivo, **Then** el sistema lo borra físicamente del almacenamiento y confirma la eliminación.
2. **Given** un archivo recién eliminado, **When** alguien intenta acceder a su URL pública anterior, **Then** el archivo ya no está disponible.
3. **Given** una imagen eliminada de la galería de un producto en la UI, **When** se guarda el producto, **Then** ni la referencia ni el archivo físico persisten en ningún lado.

---

### User Story 2 - No poder eliminar archivos de otro tenant (Priority: P1)

Un usuario intenta eliminar un archivo que no pertenece a su tenant activo (por ejemplo, manipulando la solicitud para apuntar a un archivo de otro negocio).

**Why this priority**: Sin esta protección, cualquier tenant podría borrar archivos de cualquier otro tenant conociendo o adivinando su ubicación — es una falla de aislamiento multi-tenant tan crítica como el caso feliz.

**Independent Test**: Puede probarse solicitando la eliminación de un archivo cuya ubicación corresponde a un tenant distinto al de la sesión activa, y verificando que el sistema la rechaza sin borrar nada.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado cuyo tenant activo es A, **When** solicita eliminar un archivo que pertenece al espacio de nombres del tenant B, **Then** el sistema rechaza la solicitud sin eliminar el archivo.
2. **Given** un usuario sin sesión activa o sin tenant activo, **When** solicita eliminar cualquier archivo, **Then** el sistema rechaza la solicitud.

---

### User Story 3 - Eliminar un archivo que ya no existe (Priority: P3)

Un usuario solicita eliminar un archivo que ya fue eliminado previamente (por ejemplo, doble clic en "eliminar", o una referencia que ya estaba huérfana).

**Why this priority**: Caso de borde de baja frecuencia, pero debe manejarse con gracia para no romper la experiencia de eliminar la referencia en la aplicación aunque el archivo físico ya no esté.

**Independent Test**: Puede probarse solicitando eliminar dos veces seguidas el mismo archivo y verificando que la segunda solicitud no produce un error que bloquee al usuario.

**Acceptance Scenarios**:

1. **Given** un archivo que ya no existe en el almacenamiento (eliminado previamente o nunca existió), **When** se solicita su eliminación, **Then** el sistema lo trata como una operación exitosa/sin efecto en vez de un error bloqueante.

---

### Edge Cases

- ¿Qué pasa si se solicita eliminar un archivo usando una URL/referencia mal formada o que no corresponde al patrón de organización esperado (tenant/propósito/archivo)? Debe rechazarse como solicitud inválida, sin intentar ninguna operación de borrado.
- ¿Qué pasa si el mismo archivo está referenciado en más de un lugar dentro de la aplicación al momento de eliminarlo (por ejemplo, un caso futuro de reutilización)? Fuera de alcance de esta iteración — hoy cada archivo subido pertenece a una única referencia; no se contempla conteo de referencias.
- ¿Qué pasa si la eliminación física falla por un problema transitorio del proveedor de almacenamiento? El usuario debe recibir un error claro y la referencia en la aplicación NO debe darse por eliminada hasta confirmar el borrado físico (evitar quedar con la referencia quitada pero el archivo aún ocupando espacio, sin forma de volver a intentarlo).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST exponer una operación que, dada una sesión de usuario autenticado con un tenant activo y la referencia de un archivo previamente subido mediante el mecanismo de `019-upload-r2-presigned`, elimine ese archivo del almacenamiento físico.
- **FR-002**: El sistema MUST rechazar la solicitud si no hay sesión activa o no hay tenant activo asociado, sin eliminar nada.
- **FR-003**: El sistema MUST verificar que el archivo a eliminar pertenece al espacio de nombres del tenant activo antes de eliminarlo, rechazando la solicitud si pertenece a otro tenant.
- **FR-004**: El sistema MUST tratar la eliminación de un archivo que ya no existe como una operación exitosa (idempotente), no como un error.
- **FR-005**: El sistema MUST rechazar solicitudes cuya referencia de archivo no corresponda al patrón de organización esperado (tenant/propósito/archivo), sin intentar ninguna operación de borrado.
- **FR-006**: El sistema MUST informar con un mensaje claro cuando la eliminación física falla por un motivo distinto a "el archivo no existe", para que el cliente sepa que debe reintentar y no dar la referencia por eliminada.
- **FR-007**: La operación de eliminación MUST quedar disponible para cualquier punto de captura que use el mecanismo de subida existente (galería de producto, imagen principal de producto, foto de propietario, logo de tenant, y los propósitos futuros que se agreguen), sin requerir una operación distinta por caso de uso.
- **FR-008**: El sistema MUST registrar (log) cada eliminación física con el tenant, propósito y usuario solicitante, para auditoría, igual que ya se hace con la emisión de URLs de subida (`019-upload-r2-presigned`, FR-012).

### Key Entities

- **Solicitud de eliminación**: la petición de un usuario autenticado para borrar físicamente un archivo ya subido, identificado por su referencia (URL pública o clave de almacenamiento).
- **Archivo almacenado**: el mismo concepto definido en `019-upload-r2-presigned` — el objeto accesible por su URL pública, ubicado bajo el espacio de nombres de un tenant y un propósito; esta feature agrega la operación de borrado sobre esa misma entidad.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de los archivos eliminados desde la interfaz (por ejemplo, quitar una imagen de la galería de un producto) dejan de ser accesibles por su URL pública en menos de un minuto desde la confirmación.
- **SC-002**: El 100% de los intentos de eliminar un archivo de un tenant distinto al activo son rechazados sin eliminar nada.
- **SC-003**: Eliminar un archivo que ya no existe no produce ningún error visible para el usuario ni bloquea el flujo en el que se solicitó.
- **SC-004**: El consumo real de almacenamiento del bucket deja de crecer por archivos que el usuario ya eliminó desde la aplicación.

## Assumptions

- Esta feature depende de `019-upload-r2-presigned` (ya implementado) como base: reutiliza el mismo esquema de organización por tenant/propósito y el mismo puerto de almacenamiento (`IAlmacenamientoPort`), al que se le agrega la capacidad de eliminar, no se reemplaza.
- El cliente (frontend) es responsable de decidir CUÁNDO llamar a esta operación (por ejemplo, al confirmar la eliminación de una imagen de la galería); esta especificación cubre únicamente la operación de borrado en sí, no la lógica de UI que decide invocarla.
- No se contempla en esta iteración un mecanismo de "papelera" o recuperación de archivos eliminados — la eliminación es definitiva, consistente con cómo ya se comporta la eliminación de la referencia en la aplicación hoy.
- No se contempla en esta iteración un job de limpieza automática de archivos huérfanos ya acumulados antes de esta feature (los que quedaron huérfanos mientras esta capacidad no existía); esta spec solo evita que se sigan acumulando hacia adelante. Un job de limpieza retroactivo, si se decide hacer, sería una feature separada.
