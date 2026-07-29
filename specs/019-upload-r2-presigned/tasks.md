---

description: "Task list for 019-upload-r2-presigned"
---

# Tasks: Subida de Archivos a Cloudflare R2 con URLs Prefirmadas

**Input**: Design documents from `specs/019-upload-r2-presigned/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/upload-url.md, quickstart.md

**Tests**: Incluidos — `plan.md` (Project Structure) ya compromete 3 archivos de test concretos (unit del caso de uso, unit del adaptador R2, integración del endpoint), así que se generan como tareas.

**Organization**: Tareas agrupadas por historia de usuario (US1/US2/US3 de `spec.md`) para permitir implementación y prueba independiente de cada una.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: Historia de usuario a la que pertenece (US1, US2, US3)
- Cada tarea incluye la ruta exacta de archivo

## Path Conventions

Proyecto único (`src/`, `tests/` en la raíz del repo), según `plan.md` — slice hexagonal nuevo dentro de `src/modules/tenant/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependencias y configuración de entorno que todo el resto de la feature necesita

- [X] T001 Agregar dependencias de producción `@aws-sdk/client-s3` y `@aws-sdk/s3-request-presigner`, y devDependency `aws-sdk-client-mock`, en `package.json` (vía `pnpm add`)
- [X] T002 [P] Agregar variables `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME="vendora"`, `R2_PUBLIC_BASE_URL` a `.env.example`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Piezas de dominio/infraestructura compartidas por las 3 historias de usuario

**⚠️ CRITICAL**: Ninguna historia de usuario puede implementarse hasta completar esta fase

- [X] T003 [P] Crear el puerto `IAlmacenamientoPort` (método `emitirUrlSubida({ key, contentType, expiresInSeconds }): Promise<{ uploadUrl, publicUrl }>`) en `src/modules/tenant/domain/ports/IAlmacenamientoPort.ts`
- [X] T004 [P] Crear las clases de error de dominio `PropositoInvalido`, `TipoMimeNoPermitido`, `TamanoExcedido` en `src/modules/tenant/domain/tenant-upload.errors.ts`
- [X] T005 [P] Crear el registro de propósitos `PROPOSITOS_SUBIDA` (tipo `PropositoSubida` + las 6 entradas iniciales: `logo`→`logoTenant`, `equipo-foto`→`fotosEquipo`, `catalogo-imagen`→`imagenesProductos`, `catalogo-galeria`→`galeriaProductos`, `propietario`→`fotoPropietario`, `imagen-local`→`imagenesLocal`, con sus `tiposMimePermitidos` y `tamanoMaximoBytes` según `data-model.md`) en `src/modules/tenant/domain/propositos-subida.ts`
- [X] T006 [P] Crear el provider `setAlmacenamientoPort`/`getAlmacenamientoPort` (mismo patrón que `almacen-inventario.port.provider.ts`) en `src/modules/tenant/infrastructure/almacenamiento.port.provider.ts`

**Checkpoint**: Dominio y puerto listos — las historias de usuario pueden implementarse

---

## Phase 3: User Story 1 - Subir la imagen de un producto (Priority: P1) 🎯 MVP

**Goal**: `POST /api/tenant/upload-url` con `tipo: "catalogo-imagen"` devuelve `{ uploadUrl, publicUrl }` funcionales contra R2 real, sin que el archivo pase por el backend

**Independent Test**: `quickstart.md` §1 — pedir autorización, hacer `PUT` a `uploadUrl`, leer `publicUrl` y confirmar que sirve el contenido subido

### Tests for User Story 1 ⚠️

> Escribir estos tests primero y verificar que fallan antes de implementar

- [X] T007 [P] [US1] Unit test del camino feliz de `GenerarUrlSubidaUseCase` (propósito `catalogo-imagen`, con fake de `IAlmacenamientoPort` en memoria) en `tests/unit/modules/tenant/generar-url-subida.usecase.test.ts`
- [X] T008 [P] [US1] Unit test de `R2AlmacenamientoAdapter` con `aws-sdk-client-mock` — verifica que arma `PutObjectCommand` con `Bucket="vendora"`, `Key` y `ContentType` correctos, y que `getSignedUrl` se llama con `expiresIn: 300` en `tests/unit/modules/tenant/r2.almacenamiento.adapter.test.ts`

### Implementation for User Story 1

- [X] T009 [US1] Implementar `GenerarUrlSubidaUseCase` en `src/modules/tenant/application/generar-url-subida.usecase.ts`: resolver propósito desde `PROPOSITOS_SUBIDA` (lanza `PropositoInvalido` si no existe), validar `contentType` contra `tiposMimePermitidos` (lanza `TipoMimeNoPermitido`), validar `size` contra `tamanoMaximoBytes` (lanza `TamanoExcedido`), construir la key `tenants/{tenantId}/{carpeta}/{uuid}{ext}` (uuid vía `crypto.randomUUID()`, extensión derivada de `contentType`), delegar al puerto (depende de T003, T004, T005, T007)
- [X] T010 [US1] Implementar `R2AlmacenamientoAdapter` en `src/modules/tenant/infrastructure/r2.almacenamiento.adapter.ts`: `S3Client` con `region: "auto"` y `endpoint: https://${accountId}.r2.cloudflarestorage.com`, `emitirUrlSubida` usa `getSignedUrl(s3, new PutObjectCommand({ Bucket: "vendora", Key, ContentType }), { expiresIn: 300 })` y arma `publicUrl` como `${R2_PUBLIC_BASE_URL}/${Key}` (depende de T003, T008)
- [X] T011 [P] [US1] Crear `SolicitudUploadUrlSchema` (`tipo`, `filename`, `contentType`, `size`) y `UploadUrlResponseSchema` (`uploadUrl`, `publicUrl`) con Zod en `src/modules/tenant/adapters/tenant-upload.schema.ts`
- [X] T012 [US1] Implementar `tenantUploadRouter` con `POST /upload-url` en `src/modules/tenant/adapters/tenant-upload.rest.ts` (`createRoute` + middleware `[requireAuth, requireTenantActivo]`, `tenantId` desde `c.get("tenantId")`, llama al caso de uso, responde `200` con `UploadUrlResponseSchema` en éxito) (depende de T009, T011)
- [X] T013 [US1] En `src/server/index.ts`: construir el `S3Client`/`R2AlmacenamientoAdapter` desde las env vars de R2, llamar `setAlmacenamientoPort(...)`, y montar `app.route("/api/tenant", tenantUploadRouter)` (depende de T010, T012)
- [X] T014 [US1] Agregar log de auditoría Pino (`tenantId`, `userId`, `tipo`, `filename`, `contentType`, `size`) en la emisión exitosa dentro de `tenant-upload.rest.ts` (FR-012) (depende de T012)
- [X] T015 [US1] Integration test: `POST /api/tenant/upload-url` con `tipo: "catalogo-imagen"` y puerto fakeado devuelve `200` con `publicUrl` conteniendo `tenants/{tenantId}/imagenesProductos/` en `tests/integration/modules/tenant/upload-url.test.ts` (depende de T012, T013)

**Checkpoint**: US1 funcional de punta a punta — correr `quickstart.md` §1

---

## Phase 4: User Story 3 - Rechazar archivos inválidos o no autorizados (Priority: P1)

**Goal**: Ninguna solicitud sin sesión/tenant activo, con MIME no permitido, tamaño excedido o propósito inválido emite una `uploadUrl`; cada rechazo trae un código de error distinguible (FR-011)

**Independent Test**: `quickstart.md` §4 — 4 requests inválidas, confirmar que ninguna respuesta trae `uploadUrl`

### Tests for User Story 3 ⚠️

- [X] T016 [P] [US3] Unit tests de rechazo en `GenerarUrlSubidaUseCase`: propósito inexistente → `PropositoInvalido`; `contentType` no permitido → `TipoMimeNoPermitido` (mensaje lista los tipos aceptados); `size` excedido → `TamanoExcedido` (mensaje indica el límite) — extiende `tests/unit/modules/tenant/generar-url-subida.usecase.test.ts` (depende de T009)
- [X] T017 [P] [US3] Integration tests: sin `Authorization` → `401`; sin tenant activo → `400 SIN_TENANT_ACTIVO`; `tipo` inexistente → `400 PROPOSITO_INVALIDO`; `contentType` no permitido → `400 TIPO_MIME_NO_PERMITIDO`; `size` excedido → `400 TAMANO_EXCEDIDO`; en los 5 casos la respuesta NO incluye `uploadUrl` (SC-002) — extiende `tests/integration/modules/tenant/upload-url.test.ts` (depende de T013)

### Implementation for User Story 3

- [X] T018 [US3] Agregar manejo `try/catch` en `tenant-upload.rest.ts` que mapea `PropositoInvalido`/`TipoMimeNoPermitido`/`TamanoExcedido` a `400` con `error` distinguibles (`PROPOSITO_INVALIDO`, `TIPO_MIME_NO_PERMITIDO`, `TAMANO_EXCEDIDO`) y `message` específico por caso (FR-011) (depende de T012)
- [X] T019 [US3] Declarar en `createRoute` de `tenant-upload.rest.ts` las respuestas `400`/`401` con `errorResponses`/`ErrorResponseSchema` existentes de `core/openapi-responses.ts`, y confirmar que un body malformado (falta `size`/`contentType`) devuelve `400` de validación Zod antes de llegar al caso de uso (depende de T011, T012)

**Checkpoint**: Rechazos cubiertos — correr `quickstart.md` §4-§5

---

## Phase 5: User Story 2 - Subir el logo/imagen del tenant (Priority: P2)

**Goal**: Confirmar que el mismo mecanismo genérico (ya construido en US1) funciona igual para un propósito distinto (`logo`, ya registrado en Foundational), con namespace propio y aislado por tenant

**Independent Test**: `quickstart.md` §2-§3 — pedir autorización con `tipo: "logo"`, confirmar que la ubicación final cae bajo `logoTenant/` y nunca colisiona entre tenants

### Tests for User Story 2 ⚠️

- [X] T020 [P] [US2] Unit test: `GenerarUrlSubidaUseCase` con `tipo: "logo"` construye una key bajo `logoTenant/`, distinta de la de `catalogo-imagen` (`imagenesProductos/`) — extiende `tests/unit/modules/tenant/generar-url-subida.usecase.test.ts` (depende de T009)
- [X] T021 [P] [US2] Integration test: dos tenants distintos piden `tipo: "logo"` con el mismo `filename` simultáneamente → los `publicUrl` resultantes difieren en el segmento `tenants/{tenantId}/` y ninguno pisa al otro (US2-AS2, SC-003) — extiende `tests/integration/modules/tenant/upload-url.test.ts` (depende de T013)

### Implementation for User Story 2

No requiere código nuevo — el registro de propósitos (T005) y el mecanismo genérico (T009-T013) ya cubren `logo` desde que se construyó en Foundational/US1; esta historia es de verificación explícita de que el diseño es reusable por propósito (FR-010, SC-004).

**Checkpoint**: Las 3 historias de usuario funcionan de forma independiente

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verificación final que cruza las 3 historias

- [X] T022 Correr `npx tsc --noEmit` → 0 errores
- [X] T023 Correr `pnpm test` (unit + integración de esta feature) → todo en verde
- [X] T024 Ejecutar `quickstart.md` completo (§1-§6) contra un bucket R2 real (`vendora`) — confirmar SC-001 (<10s), SC-002 (100% rechazos sin URL), SC-003 (0% cruce entre tenants), SC-005 (expiración en minutos)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — puede iniciar de inmediato
- **Foundational (Phase 2)**: depende de Setup — bloquea las 3 historias de usuario
- **User Story 1 (Phase 3)**: depende de Foundational — es el único camino para tener un endpoint funcional (MVP)
- **User Story 3 (Phase 4)**: depende de Foundational y de que exista el endpoint de US1 (T012/T013) para agregar el manejo de errores sobre él
- **User Story 2 (Phase 5)**: depende de Foundational y de US1 (reutiliza el mecanismo genérico ya construido) — sin cambios de código propios, solo tests
- **Polish (Phase 6)**: depende de que Setup + Foundational + US1 + US3 estén completos (US2 recomendado pero no bloqueante para tsc/tests unitarios base)

### User Story Dependencies

- **US1 (P1)**: la base — construye el mecanismo completo (usecase, adaptador R2, ruta REST, wiring)
- **US3 (P1)**: agrega el mapeo de errores de dominio → HTTP sobre la ruta que US1 ya creó; no es independiente en código (edita el mismo archivo `tenant-upload.rest.ts`), pero sí es independientemente verificable (sus AS no dependen de que US2 exista)
- **US2 (P2)**: verificación de que el mecanismo de US1 generaliza a un segundo propósito — sin tareas de implementación propias

### Parallel Opportunities

- T003, T004, T005, T006 (Foundational) — archivos distintos, en paralelo
- T007, T008 (tests US1) — archivos distintos, en paralelo, antes de T009-T010
- T011 (schema) puede ir en paralelo con T009/T010 (no depende de ellos, pero T012 sí depende de los tres)
- T016, T017 (tests US3) — en paralelo entre sí
- T020, T021 (tests US2) — en paralelo entre sí

---

## Parallel Example: Foundational (Phase 2)

```bash
Task: "Crear IAlmacenamientoPort en src/modules/tenant/domain/ports/IAlmacenamientoPort.ts"
Task: "Crear errores de dominio en src/modules/tenant/domain/tenant-upload.errors.ts"
Task: "Crear registro de propósitos en src/modules/tenant/domain/propositos-subida.ts"
Task: "Crear provider en src/modules/tenant/infrastructure/almacenamiento.port.provider.ts"
```

## Parallel Example: User Story 1 (tests)

```bash
Task: "Unit test GenerarUrlSubidaUseCase en tests/unit/modules/tenant/generar-url-subida.usecase.test.ts"
Task: "Unit test R2AlmacenamientoAdapter en tests/unit/modules/tenant/r2.almacenamiento.adapter.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 solamente)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (bloqueante)
3. Completar Phase 3: User Story 1
4. **Parar y validar**: `quickstart.md` §1 contra R2 real
5. Con esto ya se puede desbloquear a `tu-tienda` para imágenes de producto

### Incremental Delivery

1. Setup + Foundational → base lista
2. + US1 → endpoint funcional para `catalogo-imagen` (MVP) → validar → deploy/demo
3. + US3 → endpoint seguro contra abuso (ambas P1, se entregan juntas antes de exponer el endpoint fuera de un entorno controlado)
4. + US2 → confirma generalización a `logo` y al resto de propósitos ya registrados (`equipo-foto`, `catalogo-galeria`, `propietario`, `imagen-local`) sin código adicional
5. Polish → gate final (`tsc`, tests, quickstart completo)

### Nota sobre US1/US3

A diferencia de un feature con historias más desacopladas, US1 y US3 comparten el mismo archivo de implementación (`tenant-upload.rest.ts`/`generar-url-subida.usecase.ts`) porque la validación es intrínseca al caso de uso — no se puede "emitir una URL" sin decidir primero si la solicitud es válida. Se mantienen como fases separadas porque tienen criterios de aceptación y tests independientes (US1 = camino feliz, US3 = los 4 caminos de rechazo), no porque el código se pueda entregar por separado sin ambas fases completas.

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes entre sí
- [Story] mapea cada tarea a su historia de usuario para trazabilidad
- Verificar que los tests fallan antes de implementar
- Commit después de cada tarea o grupo lógico
- El bucket es siempre `vendora`; la carpeta de tenant usa `id` (no `slug`); las sub-carpetas usan los nombres de `data-model.md`, no el valor crudo de `tipo`
- La compresión de imágenes es responsabilidad del frontend — no hay tarea de compresión en este backend (ver `research.md` §4c)
