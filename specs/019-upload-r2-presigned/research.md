# Research: Subida de Archivos a Cloudflare R2 con URLs Prefirmadas

**Feature**: `019-upload-r2-presigned` | **Fecha**: 2026-07-24

## 1. Contrato real ya consumido por el frontend

**Decision**: El contrato es `POST /api/tenant/upload-url` con body
`{ tipo: string, filename: string, contentType: string }` → respuesta
`{ uploadUrl: string, publicUrl: string }`. Este backend agrega un campo
`size: number` (bytes) al body — permitido por la spec ("cualquier campo
adicional necesario ... se agrega sin romper esa forma general") — para poder
validar FR-004 antes de emitir la URL.

**Rationale**: Se inspeccionó `packages/shared/src/hooks/use-upload-presigned.ts`
en `vendora-frontend` (el stub real con `@ts-ignore`, no la spec) y sus 16
usos actuales en las 3 apps. El campo del contrato es `tipo`, no `proposito`
ni `purpose` — se mantiene ese nombre en español/inglés mixto tal como ya lo
usa el frontend, para no forzar un rename descoordinado.

**Alternativas consideradas**: Renombrar `tipo` → `proposito` en el contrato
público. Rechazado: rompe el stub ya integrado en 16 call-sites del frontend
sin necesidad; el nombre del campo es un detalle de forma, no de dominio.

## 2. Valores de "propósito" (`tipo`) ya en uso por el frontend

**Decision**: El registro de propósitos soportado en esta iteración cubre
exactamente los 6 valores que el frontend ya envía hoy, detectados por
búsqueda de todos los call-sites de `upload(file, "...")`:

| `tipo` | Uso | Carpeta R2 |
|---|---|---|
| `logo` | Logo/imagen del tenant (DatosBasicosContainer, 3 apps) | `logo` |
| `equipo-foto` | Foto de miembro del equipo (EquipoContainer, 3 apps) | `equipo` |
| `catalogo-imagen` | Imagen principal de producto (ProductoFormContainer, 3 apps) | `catalogo/imagen` |
| `catalogo-galeria` | Galería de producto (ProductoFormContainer, 3 apps) | `catalogo/galeria` |
| `propietario` | Foto del propietario en el wizard (Paso2PropietarioContainer) | `propietario` |
| `imagen-local` | Imágenes del local físico (`use-imagenes-local.ts`) | `imagen-local` |

**Rationale**: Construir el registro con estos 6 valores concretos (en vez de
solo "producto"/"tenant" como sugiere la spec a modo de ejemplo) hace que el
endpoint funcione de punta a punta con el frontend ya integrado el día que se
mergea, sin coordinación adicional. Confirma también FR-010 (extensible): el
registro es un `Record` en `domain/`, agregar un propósito nuevo es agregar
una entrada, no tocar el request/response.

**Alternativas consideradas**: Exponer un propósito genérico "imagen" único.
Rechazado: la spec (US2) exige namespaces distintos por propósito y el
frontend ya distingue 6 casos con reglas potencialmente distintas (tamaño de
galería vs. logo).

**Validación cliente hoy**: ningún contenedor valida tipo/tamaño en el
cliente más allá de `accept="image/*"` en el input file (visto en
`Paso2PropietarioView.tsx`). La validación de tipo MIME/tamaño es 100%
responsabilidad del backend — consistente con FR-003/FR-004.

## 3. SDK para presigned URLs contra R2

**Decision**: `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`
(`getSignedUrl(s3, new PutObjectCommand({ Bucket, Key, ContentType }), { expiresIn })`).
R2 expone una API S3-compatible; este es el mecanismo documentado por
Cloudflare para presigned URLs. Nuevas dependencias de producción.

**Rationale**: Es el único SDK con soporte oficial y mantenido para firmar
URLs S3-compatibles en Node; evita reimplementar SigV4 a mano. El endpoint
S3 de R2 (`https://<ACCOUNT_ID>.r2.cloudflarestorage.com`) se configura vía
`endpoint` + `region: "auto"` en el `S3Client`.

**Alternativas consideradas**:
- Implementar SigV4 manualmente: rechazado, reinventa la rueda para un
  problema ya resuelto por el SDK oficial.
- `aws4fetch` (firma ligera sin el SDK completo): considerado por ser más
  liviano, pero se descarta a favor de `@aws-sdk/client-s3` por ser el
  camino oficial de Cloudflare y reducir riesgo de incompatibilidad futura.

## 4. Variables de entorno nuevas

**Decision**: Se agregan a `.env.example`:
```
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME="vendora"
R2_PUBLIC_BASE_URL=""   # dominio público (custom domain o *.r2.dev) sin slash final
```
El TTL de la URL prefirmada (300 segundos) se fija como constante en código,
no como variable de entorno — no hay necesidad operativa de tunearlo por
ambiente.

**Rationale**: Sigue el mismo patrón que `REDIS_URL`/`RESEND_API_KEY` ya
documentado en `.env.example`. El bucket (`vendora`, nombre fijo pedido
explícitamente) y las credenciales son secretos/config de infraestructura;
se deja como variable (no constante hardcodeada) para poder apuntar a un
bucket distinto en un ambiente de test/staging sin tocar código. La URL
pública base depende de si se usa un dominio custom (recomendado en
producción) o el dominio `*.r2.dev` (dev/staging).

## 4b. Estructura de carpetas dentro del bucket

**Decision**: `vendora/tenants/{tenantId}/{subcarpetaDeProposito}/{uuid}{ext}`.
La carpeta de tenant usa el **`id`** del Tenant, no el `slug`. Las
subcarpetas por propósito usan un nombre descriptivo propio (no el valor
crudo de `tipo`), mapeado 1:1 desde el registro de propósitos:

| `tipo` (contrato) | Subcarpeta en R2 |
|---|---|
| `logo` | `logoTenant` |
| `equipo-foto` | `fotosEquipo` |
| `catalogo-imagen` | `imagenesProductos` |
| `catalogo-galeria` | `galeriaProductos` |
| `propietario` | `fotoPropietario` |
| `imagen-local` | `imagenesLocal` |

**Rationale**: El pedido explícito fija el bucket como `vendora`, una
carpeta por tenant y sub-carpetas por tipo de archivo (dando
`imagenesProductos` como ejemplo concreto para `catalogo-imagen`). Se usa
`id` en vez de `slug` para la carpeta de tenant porque el `id` es
inmutable durante toda la vida del tenant, mientras que el `slug` es un
campo editable (`tenant.schema.ts` define `SlugSchema` como validación de
un campo mutable, con `SlugDuplicado` como error de negocio si se
reasigna) — si se usara el slug y un tenant lo cambia más adelante, todas
las `publicUrl` ya guardadas en productos/tenant quedarían rotas. El
nombre de la subcarpeta se traduce del `tipo` interno a un nombre legible
en español-camelCase (siguiendo la convención ya pedida con
`imagenesProductos`) en vez de reusar el valor crudo del contrato
(`catalogo-imagen`), para que la estructura del bucket sea legible por sí
sola para alguien que la explore desde el dashboard de Cloudflare.

**Alternativas consideradas**: Usar el `slug` del tenant como carpeta.
Rechazado por la razón de inmutabilidad arriba. Reusar el `tipo` crudo como
nombre de subcarpeta (ej. `catalogo-imagen/`) en vez de traducirlo:
rechazado porque el pedido explícito da `imagenesProductos` como el nombre
esperado, no el valor del campo `tipo`.

## 4c. Compresión de imágenes

**Decision**: La compresión ocurre **en el cliente** (navegador), antes de
llamar a `POST /api/tenant/upload-url` y antes del `PUT` a R2. Este backend
no comprime ni reprocesa el archivo — no lo puede hacer sin romper el
Artículo I (el archivo nunca transita por el backend). El único efecto en
este repo es que los límites de `tamanoMaximoBytes` por propósito
(`data-model.md`) se definen asumiendo un archivo ya comprimido
razonablemente por el cliente, no un original sin comprimir.

**Rationale**: Decisión confirmada explícitamente con el usuario — opción
"compresión en el cliente" sobre la alternativa de un job server-side
(BullMQ + `sharp` post-subida) para no violar el Artículo I y no agregar un
worker nuevo + reprocesamiento asíncrono solo para este propósito. La
implementación de la compresión en sí (ej. `canvas`/`createImageBitmap` +
`toBlob` con calidad reducida, o una librería como `browser-image-compression`)
es trabajo del repositorio `vendora-frontend`, fuera de alcance de este plan.

**Alternativas consideradas**: Job BullMQ server-side con `sharp` que
descarga, comprime y reemplaza el objeto tras la subida. Descartada por el
usuario para esta iteración — ver pregunta de clarificación respondida:
"Compresión en el cliente".

## 5. Expiración y "un solo uso"

**Decision**: TTL de 300 segundos (5 minutos) para la URL prefirmada.
"Un solo uso" (FR-007, US3-AS4) se aproxima mediante el TTL corto — R2/S3 no
ofrece revocación nativa de una presigned PUT URL específica después de su
primer uso exitoso (a diferencia de S3 POST + policy con `content-length-range`,
no aplicable aquí porque el cliente hace un `PUT` directo con `XMLHttpRequest`,
no un POST multipart). Como no se persiste una tabla de "solicitudes de
subida" (no la requiere ningún FR), no hay estado servidor para invalidar
tras el primer uso.

**Rationale**: Es la limitación real del mecanismo "presigned PUT" tal como
lo usa el frontend ya construido (`xhr.open("PUT", uploadUrl)`). Documentar
esto explícitamente evita que una futura revisión asuma que existe
invalidación real de un solo uso; el control efectivo es el TTL de 5 minutos
(cumple SC-005: "dejan de ser válidas dentro de los primeros minutos").

**Alternativas consideradas**: Cambiar a presigned POST con policy
(`content-length-range`, un solo uso real vía policy `expiration`).
Rechazado para esta iteración: requeriría cambiar el contrato del frontend de
`PUT` a `POST` multipart, ya integrado en 16 call-sites — fuera de alcance
(la spec fija el contrato ya asumido por el frontend como base).

## 6. Validación de tamaño declarado vs. real

**Decision**: El tamaño declarado (`size`) se valida al emitir la
autorización (FR-004). No hay enforcement adicional del tamaño real subido
en esta iteración — el edge case de la spec ("el archivo subido no coincide
con lo declarado") queda parcialmente cubierto: R2 sí valida que el header
`Content-Type` real coincida con el firmado (SigV4 firma `ContentType`,
mismatch → `SignatureDoesNotMatch`), pero **no** existe un mecanismo
equivalente para forzar el tamaño exacto en un presigned `PUT` sin volverlo
frágil (firmar `Content-Length` exacto rompe con cualquier discrepancia de
bytes de encoding).

**Rationale**: Cubrir esto totalmente requeriría infraestructura fuera de
alcance de la spec (lifecycle rule en R2 que borre objetos por encima de un
tamaño, o un Worker que inspeccione el objeto post-subida) — la spec marca
explícitamente el borrado/gestión posterior de archivos como fuera de
alcance. Se documenta como limitación aceptada, no como
`NEEDS CLARIFICATION` bloqueante.

**Alternativas consideradas**: Firmar `Content-Length` exacto en el PUT.
Rechazado: exige que el cliente envíe el byte-count exacto sin ninguna
variación, es frágil ante cualquier diferencia de transporte y no está
soportado de forma confiable por `@aws-sdk/s3-request-presigner` para PUT.

## 7. Testing del adaptador de infraestructura (R2)

**Decision**: El caso de uso (`GenerarUrlSubidaUseCase`) se testea 100% en
memoria con un fake de `IAlmacenamientoPort` (Artículo VIII.1 — sin tocar
R2). El adaptador de infraestructura (`R2AlmacenamientoAdapter`) se testea
con `aws-sdk-client-mock` (nueva devDependency) verificando que arma
`PutObjectCommand` con `Bucket`/`Key`/`ContentType` correctos — no se usa
Testcontainers para esto porque no existe un emulador de R2 corriendo en el
stack de test actual (a diferencia de PostgreSQL, que sí corre real vía
Testcontainers).

**Rationale**: Coherente con Artículo VIII.2, que reserva Testcontainers
para adaptadores contra infraestructura que el proyecto ya sabe levantar
(Postgres). Introducir un emulador S3/R2 (ej. MinIO) solo para este único
adaptador sería desproporcionado frente al problema — la firma de URLs es
una llamada de SDK sin lógica de negocio propia que verificar más allá de
"se llamó con los parámetros correctos".

**Alternativas consideradas**: Levantar MinIO vía Testcontainers como
sustituto S3-compatible de R2. Rechazado por ahora: agrega un contenedor
nuevo al pipeline de test para cubrir una única función delgada; se deja
como mejora futura si el módulo de almacenamiento crece.
