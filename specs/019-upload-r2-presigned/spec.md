# Feature Specification: Subida de Archivos a Cloudflare R2 con URLs Prefirmadas

**Feature Branch**: `019-upload-r2-presigned`
**Created**: 2026-07-24
**Status**: Draft
**Input**: User description: "Endpoint de subida de archivos a Cloudflare R2 con URLs prefirmadas (presigned URLs). El backend debe exponer un endpoint que, dado un contexto de tenant autenticado, un nombre/tipo de archivo y un propósito (ej. imagen de producto, imagen de tenant/logo, otros archivos futuros), genere una URL prefirmada de subida directa (PUT) hacia Cloudflare R2 y devuelva también la URL pública final del archivo una vez subido. El frontend ya tiene armado el contrato esperado: POST /api/tenant/upload-url devolviendo { uploadUrl, publicUrl } (implementado como stub con @ts-ignore en packages/shared/src/hooks/use-upload-presigned.ts, a la espera de que el backend lo implemente). El cliente hace el PUT directo a uploadUrl desde el navegador (sin pasar el archivo por el backend), respetando el Artículo I de la constitución. Debe soportar organizar los archivos con un prefijo/carpeta por tenant y por propósito, validar tipo MIME y tamaño máximo permitido, y devolver errores claros si el tenant no tiene permiso o el archivo no es válido. También debe cubrir el caso de otros tipos de archivos, no solo imágenes de producto, dejando el diseño lo bastante genérico para reusarse a futuro."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Subir la imagen de un producto (Priority: P1)

Un propietario o administrador de tenant está creando o editando un producto en el catálogo y necesita adjuntarle una foto. Selecciona un archivo de imagen desde su dispositivo; el sistema le confirma que el archivo quedó disponible y el producto muestra la imagen final.

**Why this priority**: Es el caso de uso que originó la feature y el que actualmente bloquea a las 3 apps — sin esto, ningún flujo de carga de imágenes (productos, wizard de creación de tienda, configuración de tenant) funciona.

**Independent Test**: Puede probarse de punta a punta emitiendo la solicitud de autorización de subida para un archivo de imagen válido, subiendo el archivo con la URL recibida, y verificando que la URL pública devuelta sirve el contenido subido.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado con un tenant activo, **When** solicita autorización para subir una imagen de producto (JPEG, 2 MB), **Then** el sistema le entrega una URL de subida de un solo uso y la URL pública final donde quedará accesible el archivo una vez subido.
2. **Given** una URL de subida ya emitida, **When** el cliente sube el archivo directamente a esa URL, **Then** el archivo queda accesible públicamente en la URL final informada, sin que el archivo haya pasado por el backend de VENDORA.
3. **Given** una URL pública de un archivo ya subido, **When** se guarda esa URL como imagen de un producto, **Then** el producto la muestra correctamente en el catálogo.

---

### User Story 2 - Subir el logo/imagen del tenant (Priority: P2)

Un propietario está configurando su negocio (durante el wizard de creación o después, desde configuración) y necesita subir el logo o imagen principal del tenant.

**Why this priority**: Reutiliza el mismo mecanismo que la Historia 1 pero con un propósito distinto (branding del tenant en vez de catálogo); confirma que el diseño es genérico por propósito y no está atado a "productos".

**Independent Test**: Puede probarse solicitando autorización de subida con propósito "imagen de tenant" y verificando que el archivo resultante queda en una ubicación distinta a las imágenes de producto, sin mezclarse entre tenants.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado con un tenant activo, **When** solicita autorización para subir la imagen principal del tenant, **Then** recibe una URL de subida cuya ubicación final está organizada bajo ese tenant y ese propósito, distinta de la de imágenes de producto.
2. **Given** dos tenants distintos subiendo archivos con el mismo propósito al mismo tiempo, **When** ambos completan la subida, **Then** los archivos de un tenant nunca son accesibles bajo el espacio de nombres del otro ni se sobrescriben entre sí.

---

### User Story 3 - Rechazar archivos inválidos o no autorizados (Priority: P1)

Un usuario intenta subir un archivo que no cumple las reglas del sistema (tipo no permitido, demasiado grande) o intenta obtener una URL de subida sin tener sesión/tenant activo válido.

**Why this priority**: Sin esta protección, el endpoint expone un vector de abuso (subida de archivos arbitrarios, ejecutables, o consumo de almacenamiento sin límite) — es tan crítico como el camino feliz.

**Independent Test**: Puede probarse enviando solicitudes de autorización con tipos MIME no permitidos, tamaños que exceden el máximo, o sin sesión válida, y verificando que el sistema las rechaza sin emitir una URL de subida.

**Acceptance Scenarios**:

1. **Given** un usuario sin sesión activa o sin tenant activo, **When** solicita una URL de subida, **Then** el sistema rechaza la solicitud y no emite ninguna URL.
2. **Given** un usuario autenticado, **When** solicita subir un archivo de un tipo no permitido para el propósito indicado (ej. un ejecutable como "imagen de producto"), **Then** el sistema rechaza la solicitud con un mensaje claro indicando los tipos permitidos.
3. **Given** un usuario autenticado, **When** solicita subir un archivo que excede el tamaño máximo permitido para ese propósito, **Then** el sistema rechaza la solicitud indicando el límite permitido.
4. **Given** una URL de subida ya emitida y usada una vez, **When** se intenta reutilizarla para subir un archivo distinto, **Then** el sistema no lo permite (la autorización es de un solo uso y expira).

---

### Edge Cases

- ¿Qué pasa si el usuario solicita una URL de subida pero nunca llega a subir el archivo? La autorización debe expirar sola tras un tiempo corto, sin dejar residuos que contabilizar como almacenamiento usado.
- ¿Qué pasa si dos solicitudes de subida para el mismo propósito y el mismo nombre de archivo llegan casi simultáneamente del mismo tenant? Cada solicitud debe recibir una ubicación final única (no debe haber colisión/sobrescritura silenciosa).
- ¿Qué pasa si el propósito solicitado no existe o no está habilitado para la vertical activa del tenant (ej. un propósito exclusivo de consultorio solicitado desde tu-tienda)? Debe rechazarse igual que un tipo de archivo inválido.
- ¿Qué pasa si el archivo subido por el cliente no coincide con el tipo/tamaño declarado al pedir la URL (el cliente miente en la solicitud inicial)? El almacenamiento debe aplicar sus propias restricciones en la subida misma, no confiar únicamente en la validación de la solicitud de autorización.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST exponer una operación que, dada una sesión de usuario autenticado con un tenant activo, un nombre de archivo, un tipo MIME y un propósito, devuelva una URL de subida de un solo uso y la URL pública final donde quedará el archivo.
- **FR-002**: El sistema MUST rechazar la solicitud si no hay sesión activa o no hay tenant activo asociado, sin emitir URL alguna.
- **FR-003**: El sistema MUST validar el tipo MIME del archivo contra una lista de tipos permitidos específica del propósito solicitado (ej. imágenes para "producto"/"tenant"), rechazando tipos no permitidos con un mensaje que indique los tipos aceptados.
- **FR-004**: El sistema MUST validar que el tamaño declarado del archivo no exceda el máximo permitido para el propósito solicitado, rechazando la solicitud con un mensaje que indique el límite.
- **FR-005**: El sistema MUST organizar la ubicación final de cada archivo bajo un espacio de nombres que identifique de forma única al tenant propietario y al propósito del archivo, de modo que archivos de tenants o propósitos distintos nunca colisionen entre sí.
- **FR-006**: El sistema MUST generar un nombre de archivo final único por solicitud (no reutilizar directamente el nombre original del archivo del usuario) para evitar colisiones y sobrescrituras accidentales.
- **FR-007**: La URL de subida emitida MUST ser de un solo uso y expirar en un plazo corto tras su emisión, de modo que no pueda reutilizarse para subir contenido distinto ni quede vigente indefinidamente.
- **FR-008**: El cliente MUST poder subir el archivo directamente al almacenamiento usando la URL recibida, sin que el archivo transite por el backend de VENDORA (cumpliendo el Artículo I de la constitución del frontend y el Artículo I de la constitución del backend).
- **FR-009**: La URL pública final MUST quedar accesible para lectura una vez completada la subida, sin pasos adicionales de confirmación por parte del cliente.
- **FR-010**: El diseño del mecanismo de propósitos MUST ser extensible: agregar un nuevo propósito (ej. un tipo de archivo futuro de otra vertical) no debe requerir cambiar la forma general de la solicitud/respuesta, solo registrar sus reglas de validación (tipos y tamaño permitidos).
- **FR-011**: El sistema MUST responder con mensajes de error distinguibles para cada motivo de rechazo (sin autorización, tipo no permitido, tamaño excedido, propósito inválido) para que el cliente pueda mostrar retroalimentación específica al usuario.
- **FR-012**: El sistema MUST registrar (log) cada emisión de URL de subida con el tenant, propósito y usuario solicitante, para auditoría y diagnóstico de abuso.

### Key Entities

- **Solicitud de subida**: la petición de un usuario autenticado para obtener autorización de subir un archivo; incluye nombre de archivo, tipo MIME, tamaño declarado y propósito.
- **Autorización de subida**: la URL de subida de un solo uso emitida por el sistema en respuesta a una solicitud válida, con expiración corta.
- **Propósito**: categoría que determina dónde se organiza el archivo y qué reglas de validación (tipos MIME y tamaño máximo permitidos) le aplican (ej. imagen de producto, imagen de tenant); es un conjunto extensible, no cerrado a los dos casos iniciales.
- **Archivo almacenado**: el objeto final accesible públicamente por su URL, ubicado bajo el espacio de nombres del tenant y propósito correspondientes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede completar la subida de una imagen de producto (desde que la selecciona hasta que queda visible) en menos de 10 segundos en una conexión estándar.
- **SC-002**: El 100% de las solicitudes de subida sin sesión/tenant activo, con tipo de archivo no permitido, o con tamaño excedido, son rechazadas antes de emitir una URL de subida.
- **SC-003**: El 0% de los archivos subidos por un tenant son accesibles bajo el espacio de nombres de otro tenant.
- **SC-004**: Las 3 aplicaciones (tu-tienda, tu-consultorio, tu-restaurante) pueden reutilizar el mismo mecanismo de subida para nuevos propósitos futuros sin requerir un nuevo endpoint por caso de uso.
- **SC-005**: Las URLs de subida emitidas y no usadas dejan de ser válidas dentro de los primeros minutos de emitidas.

## Assumptions

- El almacenamiento final de los archivos es Cloudflare R2, según el Artículo I de la constitución del backend ("Almacenamiento: Cloudflare R2 (URLs prefirmadas)") y el Artículo I de la constitución del frontend ("Cliente directo a Cloudflare R2 con URLs prefirmadas obtenidas del backend").
- El contrato de solicitud/respuesta ya asumido por el frontend (`POST /api/tenant/upload-url` → `{ uploadUrl, publicUrl }`, ver `packages/shared/src/hooks/use-upload-presigned.ts`) se mantiene como base de la interfaz pública; cualquier campo adicional necesario (propósito, tipo MIME, tamaño) se agrega sin romper esa forma general.
- El propósito inicial cubre al menos "imagen de producto" e "imagen de tenant"; otros propósitos (documentos, adjuntos de otras verticales) quedan fuera del alcance de esta iteración pero el diseño debe soportarlos sin rediseño.
- Los límites concretos de tamaño máximo por propósito (ej. 5 MB para imágenes) y la lista de tipos MIME permitidos se definen en la fase de planificación técnica, no en este documento.
- La expiración corta de la URL de subida se interpreta como del orden de minutos (no horas), suficiente para que un cliente en una red normal complete la subida.
- El flujo de eliminación/reemplazo de archivos ya subidos (borrado físico en R2) no es parte de esta feature; esta spec cubre únicamente la emisión de autorización de subida y el acceso de lectura posterior.
- El bucket de Cloudflare R2 se llama `vendora`. Dentro del bucket, cada archivo se organiza bajo una carpeta por Tenant (identificada por el `id` del Tenant, estable aunque cambie el slug) y, dentro de esa carpeta, una sub-carpeta por propósito (ej. `imagenesProductos`).
- La compresión de imágenes ocurre en el cliente (navegador), antes de solicitar la autorización de subida — no es responsabilidad de este backend comprimir ni reprocesar el archivo, porque el archivo nunca transita por él (Artículo I). Este backend solo valida que el tamaño declarado no exceda el máximo permitido por propósito; ese máximo se define asumiendo que el cliente ya comprimió la imagen razonablemente antes de subirla.
