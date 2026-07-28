# Phase 0 Research: Eliminación Real de Archivos en Cloudflare R2

## 1. Punto de partida: extender el slice hexagonal ya existente de `019-upload-r2-presigned`

**Decision**: No se crea un módulo nuevo — se extiende el mismo slice (`src/modules/tenant/{domain,application,adapters,infrastructure}`) agregando una operación de borrado simétrica a la de subida.

**Hallazgos** (código ya implementado en `019-upload-r2-presigned`):
- `IAlmacenamientoPort` (`domain/ports/IAlmacenamientoPort.ts`) hoy solo declara `emitirUrlSubida`. Se le agrega `eliminarArchivo(key: string): Promise<void>`.
- `R2AlmacenamientoAdapter` (`infrastructure/r2.almacenamiento.adapter.ts`) implementa el puerto contra `@aws-sdk/client-s3` (`S3Client` ya configurado con `requestChecksumCalculation: "WHEN_REQUIRED"` para compatibilidad con R2, ver `src/server/index.ts`). Se le agrega el método usando `DeleteObjectCommand`.
- `almacenamiento.port.provider.ts` (singleton `get/setAlmacenamientoPort`) se reutiliza sin cambios — ya inyecta la misma instancia de adapter a cualquier caso de uso que la pida.
- El patrón de errores de dominio (`tenant-upload.errors.ts`: clases con `code` + `message`, mapeadas a status HTTP en el adapter REST) se extiende con las 2 clases nuevas que requiere esta feature (ver §3).
- El patrón de test (`tests/helpers/fake-almacenamiento.port.ts`, un fake en memoria que implementa el puerto) se extiende para soportar también `eliminarArchivo`, reutilizado tanto por los tests del caso de uso como por los de integración del router.

**Rationale**: La Constitución (Artículo II — Monolito Modular Hexagonal) exige fronteras estrictas por módulo pero no exige un slice nuevo por cada operación dentro del mismo módulo; subir y eliminar un archivo son dos operaciones del mismo concepto de dominio ("gestión de archivos de un tenant en almacenamiento externo"), por lo que conviven en el mismo puerto.

---

## 2. `DeleteObjectCommand` de S3 ya es idempotente — no hace falta lógica propia para FR-004

**Decision**: No se implementa un chequeo previo de existencia ("HeadObject antes de Delete"). Se llama `DeleteObjectCommand` directamente y se interpreta cualquier resultado sin error como éxito.

**Rationale**: El comportamiento de la API S3 (y R2, que la implementa fielmente para esta operación) para `DeleteObject` sobre una key que no existe es devolver `204 No Content` igual que si hubiera existido — nunca un error 404. Esto satisface FR-004 (idempotencia) gratis, sin código adicional, y evita una llamada de red extra (HeadObject) que no aporta nada.

**Alternatives considered**: Verificar existencia antes de borrar (HeadObject → 404 si no existe → tratar como éxito en la capa de aplicación) — rechazado por ser una llamada de red redundante; el comportamiento nativo de S3/R2 ya resuelve el caso sin ese paso.

---

## 3. Validación de pertenencia al tenant: parsing de la key, no una consulta a base de datos

**Decision**: La referencia que envía el cliente es la `publicUrl` (la misma que ya devuelve y persiste el mecanismo de subida — no se introduce un concepto nuevo de "id de archivo"). El backend deriva la `key` interna y valida el patrón esperado: `tenants/{tenantId}/{carpeta}/{archivo}` (4 segmentos, primer segmento literal `"tenants"`, segundo segmento igual al `tenantId` de la sesión activa).

**Corrección de diseño (durante `/speckit-tasks`)**: la derivación `publicUrl → key` depende de `R2_PUBLIC_BASE_URL`, un detalle de configuración que hoy solo conoce `R2AlmacenamientoAdapter` (vía su `config.publicBaseUrl`) — el caso de uso no debe leerlo directamente, porque acoplaría la capa de aplicación a un detalle de un adaptador concreto (Artículo II.3, transporte/infra-agnóstico; y en general, un adaptador de almacenamiento futuro distinto a R2 podría construir sus URLs públicas de otra forma). Por eso `IAlmacenamientoPort` gana un segundo método nuevo, `extraerKeyDesdeUrlPublica(url): string | null`, implementado por el adaptador (quien sí conoce su propio `publicBaseUrl`); el caso de uso solo llama a ese método del puerto y, con la key ya resuelta, hace la validación de formato/tenant (genérica, no depende de ningún adaptador). Ver `data-model.md` §1 y §4 para la forma final.

**Rationale**:
- No existe hoy ninguna tabla que registre "qué archivos se subieron" (el mecanismo de `019` es completamente stateless del lado de base de datos — la única persistencia de la URL vive en las entidades de dominio que la referencian, ej. `Producto.imagenUrl`). Por lo tanto no hay dónde consultar "¿esta key le pertenece a este tenant?" salvo el propio patrón de la key, que ya codifica el tenant como su segundo segmento (ver `generar-url-subida.usecase.ts`: `key = tenants/${tenantId}/${carpeta}/${uuid}${ext}`).
- Esto es suficiente para el aislamiento requerido (FR-003): si el segundo segmento no coincide con el `tenantId` de la sesión, se rechaza sin tocar el almacenamiento — no requiere una fuente de verdad adicional.
- Reutilizar `publicUrl` (en vez de pedir una `key` cruda separada) mantiene el contrato simple para quien consuma este endpoint después (el frontend): ya tiene esa URL guardada en el campo que sea (`imagenUrl`, un elemento del array `galeria`, etc.), no necesita derivar ni guardar nada adicional.

**Alternatives considered**:
- Pedir la `key` cruda en vez de la `publicUrl` — rechazado porque obligaría al frontend a guardar/derivar dos valores por archivo (la URL pública para mostrarlo, la key para poder borrarlo) en vez de uno solo.
- Mantener un registro en base de datos de archivos subidos por tenant — rechazado por desproporcionado: agrega una tabla y un flujo de sincronización nuevos solo para resolver una validación de prefijo que ya se resuelve con el propio formato de la key.
- Dejar el parsing completo (incluyendo el prefijo `publicBaseUrl`) en el caso de uso, pasándole `publicBaseUrl` como parámetro adicional inyectado desde `server/index.ts` — rechazado: funciona, pero filtra un detalle de configuración de infraestructura a la capa de aplicación a través de una puerta lateral en vez de a través del puerto, que es exactamente el mecanismo que la arquitectura hexagonal ya define para esto.

---

## 4. Forma del endpoint: `DELETE /api/tenant/archivo` con body `{ url }`

**Decision**: Nuevo endpoint `DELETE /api/tenant/archivo`, mismo router (`tenant-upload.rest.ts`), mismo middleware (`requireAuth`, `requireTenantActivo`) que `POST /api/tenant/upload-url`. Body JSON: `{ "url": "<publicUrl>" }`.

**Rationale**:
- Un DELETE con JSON body es válido en HTTP y ya usado de forma consistente en este mismo módulo para el verbo hermano (`POST /upload-url` recibe body JSON); mantiene la forma de la solicitud simétrica y predecible.
- Nombrar el recurso `archivo` (no reutilizar `/upload-url`, que describe específicamente la operación de autorización de subida) deja claro que es una operación distinta sobre el mismo concepto de dominio ("archivo"), no una variante del endpoint de subida.
- Path param en vez de body (`DELETE /archivo/:key`) se descartó porque la `key`/`url` contiene `/` — codificarla como segmento de path requeriría URL-encoding doble y complica logging/debugging sin beneficio real.

**Alternatives considered**: `POST /api/tenant/eliminar-archivo` (evitar el verbo DELETE por completo) — rechazado porque el resto de la API sí usa verbos HTTP semánticos para operaciones CRUD (ej. `DELETE /puntos-de-venta/{id}` en `wizard.rest.ts`), y no hay ninguna razón técnica en este caso para desviarse de esa convención ya establecida.

---

## 5. Errores de dominio nuevos

**Decision**: Dos clases nuevas en `tenant-upload.errors.ts`, siguiendo el patrón ya establecido (`code` + `message`, mapeadas a status en el router):

- `ReferenciaArchivoInvalida` — la URL no tiene el formato esperado (no empieza con `R2_PUBLIC_BASE_URL`, o la key resultante no tiene exactamente 4 segmentos) → **400**.
- `ArchivoNoPerteneceATenant` — la key es válida en formato pero su segmento de tenant no coincide con el tenant activo → **403**.

**Rationale**: Mantiene el mismo vocabulario y mecanismo de mapeo error-de-dominio → status-HTTP que ya usa `PropositoInvalido`/`TipoMimeNoPermitido`/`TamanoExcedido` en el endpoint de subida — no se introduce un mecanismo de manejo de errores paralelo.
