# Implementation Plan: Subida de Archivos a Cloudflare R2 con URLs Prefirmadas

**Branch**: `019-upload-r2-presigned` | **Date**: 2026-07-24 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/019-upload-r2-presigned/spec.md`

## Summary

Nuevo endpoint `POST /api/tenant/upload-url` (autenticado, tenant activo)
que, dado `{ tipo, filename, contentType, size }`, valida el propósito
solicitado contra un registro extensible de reglas (tipos MIME permitidos +
tamaño máximo + sub-carpeta), construye una key única en el bucket fijo
`vendora`: `tenants/{tenantId}/{subcarpetaDeProposito}/{uuid}{ext}` (carpeta
por tenant usando su `id` inmutable, sub-carpeta legible por propósito —
ej. `imagenesProductos`) y devuelve `{ uploadUrl, publicUrl }` — una URL
`PUT` prefirmada contra Cloudflare R2 (expira en 5 minutos) y la URL pública
final. El endpoint es stateless (sin tablas nuevas): la investigación de los
16 call-sites reales del stub frontend (`use-upload-presigned.ts`) confirma
6 propósitos ya en uso (`logo`, `equipo-foto`, `catalogo-imagen`,
`catalogo-galeria`, `propietario`, `imagen-local`), que se registran tal
cual para que el endpoint funcione con el frontend ya integrado sin
coordinación adicional (salvo el campo nuevo `size`, ver Complexity
Tracking). La compresión de imágenes es responsabilidad del cliente
(navegador) antes de la subida — decisión confirmada con el usuario para no
romper el Artículo I (archivo nunca transita por este backend); este plan
solo dimensiona los límites de tamaño por propósito asumiendo un archivo ya
comprimido.

## Technical Context

**Language/Version**: TypeScript (modo `strict`) · Node.js LTS ≥ 20
**Primary Dependencies**: Hono + `@hono/zod-openapi`, Zod, `@aws-sdk/client-s3`
+ `@aws-sdk/s3-request-presigner` (nuevas — firma de URLs S3-compatibles
contra R2), `aws-sdk-client-mock` (nueva devDependency, solo tests)
**Storage**: Cloudflare R2, bucket fijo `vendora` (S3-compatible) — carpeta
por tenant (`id`) + sub-carpeta por propósito dentro del bucket; sin tablas
PostgreSQL nuevas; feature 100% stateless (ver `data-model.md`)
**Testing**: Vitest — unit del caso de uso con fake de `IAlmacenamientoPort`
(Artículo VIII.1), unit del adaptador R2 con `aws-sdk-client-mock`,
integración del endpoint REST con el port fakeado (sin Testcontainers: no
hay PostgreSQL involucrado en esta feature)
**Target Platform**: Servidor Render (mismo backend existente) — el `PUT`
real del archivo va del navegador directo a R2, nunca pasa por Render
(Artículo I)
**Project Type**: Web service (API REST) — nuevo slice hexagonal dentro del
módulo `tenant` existente (`src/modules/tenant/`)
**Performance Goals**: N/A — la operación es una firma de URL (sin I/O de
archivo en el backend); SC-001 (<10s end-to-end) depende de la red del
cliente al hacer el `PUT`, no de este endpoint
**Constraints**: `npx tsc --noEmit` → 0 errores; no se modifica el schema
Prisma; el contrato de response (`{ uploadUrl, publicUrl }`) no cambia de
forma — solo se agrega `size` al request (documentado como cambio
coordinado con frontend, ver Complexity Tracking)
**Scale/Scope**: 1 endpoint nuevo, 1 slice hexagonal nuevo (domain +
application + infrastructure + adapters) dentro de `modules/tenant`, 6
propósitos iniciales registrados, 2 dependencias de producción nuevas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Artículo | Criterio | Estado |
|---|---|---|
| **I — Stack** | Storage = Cloudflare R2 con URLs prefirmadas ya está fijado por la constitución; `@aws-sdk/client-s3`/`s3-request-presigner` son el mecanismo estándar para firmarlas (detalle de implementación, no una alternativa al stack) | ✅ Cumple |
| **I — Cliente directo a storage** | El archivo va del navegador a R2 vía `PUT`, nunca transita por el backend (ya implementado así en el stub frontend) | ✅ Cumple |
| **II.1 — Monolito modular** | No se agrega vertical ni schema nuevo; el slice vive dentro del módulo `tenant` existente (núcleo compartido), reutilizable por otras verticales vía el mismo puerto (precedente: `IAlmacenInventarioPort` en `almacen`, consumido desde `ventas`) | ✅ Cumple |
| **II.2 — Hexagonal** | `domain/ports/IAlmacenamientoPort.ts` (puerto) + `domain/tenant-upload.errors.ts` + `domain/propositos-subida.ts` (reglas puras, sin imports técnicos), `application/generar-url-subida.usecase.ts` (orquesta, solo conoce el puerto), `infrastructure/r2.almacenamiento.adapter.ts` (implementa el puerto con el SDK de AWS), `adapters/tenant-upload.rest.ts` (validar → delegar → formatear) | ✅ Cumple |
| **II.3 — Transporte-agnóstico** | El caso de uso no conoce Hono; se puede invocar igual desde un test o, a futuro, desde otro adaptador de entrada | ✅ Cumple |
| **III.2/III.3 — Tenant** | `tenantId` se toma de `c.get("tenantId")` (sesión resuelta por `requireTenantActivo`), nunca del body del cliente — así se garantiza que el key/namespace no puede ser falsificado (FR-005) | ✅ Cumple (no hay query Prisma en este endpoint, pero el aislamiento por tenant se preserva vía la key de R2) |
| **VIII.1 — Dominio testeable sin infra** | `GenerarUrlSubidaUseCase` se testea con un fake `IAlmacenamientoPort` en memoria | ✅ Cumple |
| **VIII.2 — Integración con infra real** | Sin PostgreSQL involucrado; el adaptador R2 se testea con `aws-sdk-client-mock` en vez de Testcontainers — desviación justificada en Complexity Tracking (no existe emulador R2 en el stack de test) | ⚠️ Ver Complexity Tracking |
| **VIII.3 — Validación en el borde** | `tenant-upload.schema.ts` (Zod: `tipo`, `filename`, `contentType`, `size`) valida el body antes del caso de uso | ✅ Cumple |
| **IX.3 — Errores de dominio** | `PropositoInvalido`, `TipoMimeNoPermitido`, `TamanoExcedido` en `domain/tenant-upload.errors.ts`; el adaptador REST los mapea a 400 | ✅ Cumple |
| **IX.4 — Sin lógica en adaptadores** | `tenant-upload.rest.ts` solo valida (Zod), llama al caso de uso y formatea la respuesta | ✅ Cumple |

**Resultado**: Sin violaciones de artículos NO-NEGOCIABLE. Una desviación
menor y justificada del patrón de testing de infraestructura (VIII.2) — ver
Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/019-upload-r2-presigned/
├── plan.md              # Este archivo
├── research.md          # Fase 0 — contrato real del frontend, SDK, límites, testing
├── data-model.md         # Fase 1 — registro de propósitos, value objects, puerto
├── contracts/
│   └── upload-url.md     # Fase 1 — contrato REST del endpoint
└── quickstart.md         # Fase 1 — guía de validación manual end-to-end
```

### Source Code (repository root)

```text
src/modules/tenant/
├── domain/
│   ├── propositos-subida.ts               # NUEVO — registro extensible de propósitos (FR-010)
│   ├── tenant-upload.errors.ts            # NUEVO — PropositoInvalido, TipoMimeNoPermitido, TamanoExcedido
│   └── ports/
│       └── IAlmacenamientoPort.ts         # NUEVO — puerto de emisión de URL prefirmada
├── application/
│   └── generar-url-subida.usecase.ts      # NUEVO — valida propósito/mime/tamaño, arma key, delega al puerto
├── infrastructure/
│   ├── r2.almacenamiento.adapter.ts       # NUEVO — implementa el puerto con @aws-sdk/client-s3 + s3-request-presigner
│   └── almacenamiento.port.provider.ts    # NUEVO — setAlmacenamientoPort/getAlmacenamientoPort (mismo patrón que almacen-inventario.port.provider.ts)
└── adapters/
    ├── tenant-upload.rest.ts              # NUEVO — POST /upload-url (validar → caso de uso → formatear)
    └── tenant-upload.schema.ts            # NUEVO — SolicitudUploadUrlSchema, UploadUrlResponseSchema

src/server/index.ts                        # MODIFICADO — construir S3Client desde env, setAlmacenamientoPort(...), montar tenantUploadRouter en /api/tenant

.env.example                               # MODIFICADO — R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_BASE_URL

tests/unit/modules/tenant/
└── generar-url-subida.usecase.test.ts     # NUEVO — casos éxito + 3 rechazos, con fake IAlmacenamientoPort

tests/unit/modules/tenant/
└── r2.almacenamiento.adapter.test.ts      # NUEVO — verifica PutObjectCommand con aws-sdk-client-mock

tests/integration/modules/tenant/
└── upload-url.test.ts                     # NUEVO — POST /api/tenant/upload-url end-to-end con port fakeado (sin Testcontainers)
```

**Structure Decision**: El slice completo vive dentro de `modules/tenant/`
en vez de crear un módulo/schema nuevo (`almacenamiento`), porque: (a) no
hay ninguna tabla que persistir (Artículo V no aplica), por lo que no
justifica un schema de PostgreSQL propio; (b) el único consumidor hoy es un
endpoint bajo el prefijo `/api/tenant` que ya exige el contrato del
frontend; (c) el módulo `tenant` es parte del núcleo compartido — si una
vertical futura necesita subir archivos con un propósito propio, reutiliza
el mismo `IAlmacenamientoPort` y el mismo caso de uso (precedente:
`IAlmacenInventarioPort` vive en `almacen` y lo consume `ventas` vía
provider). El router nuevo (`tenant-upload.rest.ts`) se mantiene separado de
`tenant.rest.ts`/`wizard.rest.ts` (mismo patrón que ya usa el módulo:
un archivo por concern, mismo prefijo `/api/tenant`).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Testing del adaptador `r2.almacenamiento.adapter.ts` sin Testcontainers (Artículo VIII.2 pide infra real) | No existe un emulador de R2/S3 en el stack de test del proyecto hoy (Testcontainers solo cubre PostgreSQL). El adaptador es una función delgada que arma un `PutObjectCommand` y llama al SDK — su única lógica verificable son los parámetros pasados al SDK, cubierto con `aws-sdk-client-mock` | Levantar MinIO (S3-compatible) vía Testcontainers para un único adaptador delgado agrega un contenedor nuevo al pipeline de CI para cubrir código sin lógica de negocio propia; se prefiere `aws-sdk-client-mock` (unit, sin red) y dejar la verificación end-to-end real para `quickstart.md` (manual, contra R2 real) — reevaluar si el módulo de almacenamiento crece en superficie |
| El contrato de request gana un campo `size` que el stub actual del frontend (`use-upload-presigned.ts`) todavía no envía | FR-004 exige validar el tamaño declarado antes de emitir la URL; sin este campo no hay forma de cumplir ese requisito | Inferir el tamaño de otro lado (ej. de un header en la request de autorización) no es posible: la autorización se pide antes de que el archivo llegue a ningún lado — el único origen posible del dato es que el cliente lo declare explícitamente, tal como ya prevé la spec en sus Assumptions ("tamaño ... se agrega sin romper esa forma general") |
