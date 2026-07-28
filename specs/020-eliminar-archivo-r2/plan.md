# Implementation Plan: Eliminación Real de Archivos en Cloudflare R2

**Branch**: `020-eliminar-archivo-r2` | **Date**: 2026-07-25 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/020-eliminar-archivo-r2/spec.md`

## Summary

Nuevo endpoint `DELETE /api/tenant/archivo` (autenticado, tenant activo)
que, dado `{ url }` (la misma `publicUrl` que ya devuelve y persiste el
mecanismo de subida de `019-upload-r2-presigned`), deriva la key interna
quitándole el prefijo `R2_PUBLIC_BASE_URL`, valida que su segmento de
tenant coincida con el de la sesión activa, y llama `DeleteObjectCommand`
contra R2 — operación nativamente idempotente, sin necesidad de verificar
existencia previa. Extiende el mismo slice hexagonal de `019` (mismo
puerto `IAlmacenamientoPort`, mismo router `tenant-upload.rest.ts`, mismo
patrón de errores de dominio) en vez de crear infraestructura nueva.
Feature 100% stateless: no hay tabla de "archivos subidos" — el único rastro
de qué existe vive en el propio bucket y en los campos de dominio que ya
referencian cada `publicUrl` (`Producto.imagenUrl`, etc.), fuera de alcance
de este plan.

## Technical Context

**Language/Version**: TypeScript (modo `strict`) · Node.js LTS ≥ 20
**Primary Dependencies**: Hono + `@hono/zod-openapi`, Zod, `@aws-sdk/client-s3` (ya instalado — se usa `DeleteObjectCommand`, sin dependencias nuevas), `aws-sdk-client-mock` (ya devDependency desde `019`)
**Storage**: Cloudflare R2, mismo bucket fijo `vendora` — sin tablas PostgreSQL nuevas ni modificadas
**Testing**: Vitest — unit del caso de uso con el mismo fake `IAlmacenamientoPort` (extendido con `eliminarArchivo`), unit del adaptador R2 con `aws-sdk-client-mock` (mismo precedente que `019`), integración del endpoint REST con el port fakeado
**Target Platform**: Servidor Render (mismo backend existente)
**Project Type**: Web service (API REST) — extiende el slice hexagonal existente dentro del módulo `tenant`
**Performance Goals**: N/A — una llamada `DeleteObjectCommand` por request, sin I/O de archivo en el backend
**Constraints**: `npx tsc --noEmit` → 0 errores; no se modifica el schema Prisma; no se rompe el contrato existente de `POST /upload-url` (endpoint completamente nuevo y separado)
**Scale/Scope**: 1 endpoint nuevo, 1 método nuevo en un puerto existente, 2 errores de dominio nuevos, 0 dependencias de producción nuevas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Artículo | Criterio | Estado |
|---|---|---|
| **I — Stack** | Cloudflare R2 ya es el storage fijado; `@aws-sdk/client-s3` ya es la dependencia estándar del módulo (sin agregar nada nuevo) | ✅ Cumple |
| **II.1 — Monolito modular** | Se extiende el mismo slice del módulo `tenant` (núcleo compartido); no se crea módulo ni schema nuevo | ✅ Cumple |
| **II.2 — Hexagonal** | `IAlmacenamientoPort` extendido con `eliminarArchivo` + `extraerKeyDesdeUrlPublica` (puerto) + `tenant-upload.errors.ts` (2 clases nuevas, reglas puras) + `eliminar-archivo.usecase.ts` (application, orquesta: pide la key al puerto, valida formato/tenant, delega el borrado al puerto — sin conocer `R2_PUBLIC_BASE_URL` ni ningún detalle de R2) + `r2.almacenamiento.adapter.ts` (infrastructure, implementa ambos métodos nuevos con `DeleteObjectCommand` y el prefijo `publicBaseUrl`) + `tenant-upload.rest.ts` (adapters, validar → delegar → formatear) | ✅ Cumple |
| **II.3 — Transporte-agnóstico** | El caso de uso no conoce Hono; recibe `{ tenantId, url }` y devuelve `void`/lanza error de dominio | ✅ Cumple |
| **III.2/III.3 — Tenant** | `tenantId` se toma de `c.get("tenantId")` (sesión), nunca del body — la pertenencia del archivo se valida contra ese valor, no contra algo que el cliente declare (FR-003) | ✅ Cumple |
| **VIII.1 — Dominio testeable sin infra** | `EliminarArchivoUseCase` se testea con el mismo fake `IAlmacenamientoPort` en memoria, extendido con `eliminarArchivo` | ✅ Cumple |
| **VIII.2 — Integración con infra real** | Mismo precedente ya justificado en `019-upload-r2-presigned` (Complexity Tracking): sin emulador R2 en el stack de test, se usa `aws-sdk-client-mock` para el adaptador — no se reintroduce como violación nueva, es la continuación del mismo patrón ya aceptado | ✅ Cumple (precedente ya justificado) |
| **VIII.3 — Validación en el borde** | `SolicitudEliminarArchivoSchema` (Zod: `url`) valida el body antes del caso de uso | ✅ Cumple |
| **IX.3 — Errores de dominio** | `ReferenciaArchivoInvalida`, `ArchivoNoPerteneceATenant` en `tenant-upload.errors.ts`, mapeadas a 400/403 en el router | ✅ Cumple |
| **IX.4 — Sin lógica en adaptadores** | `tenant-upload.rest.ts` solo valida (Zod), llama al caso de uso y formatea la respuesta — el parsing de la URL y la validación de tenant viven en el caso de uso, no en el adaptador REST | ✅ Cumple |

**Resultado**: Sin violaciones de artículos NO-NEGOCIABLE. Sin desviaciones nuevas — reutiliza la única desviación ya justificada en `019` (testing del adaptador R2 sin Testcontainers).

## Project Structure

### Documentation (this feature)

```text
specs/020-eliminar-archivo-r2/
├── plan.md              # Este archivo
├── research.md          # Fase 0 — decisiones: idempotencia nativa, parsing de key, forma del endpoint
├── data-model.md         # Fase 1 — puerto extendido, errores nuevos, algoritmo de parsing
├── contracts/
│   └── eliminar-archivo.md   # Fase 1 — contrato REST del endpoint
└── quickstart.md         # Fase 1 — guía de validación manual end-to-end
```

### Source Code (repository root)

```text
src/modules/tenant/
├── domain/
│   ├── tenant-upload.errors.ts            # MODIFICAR — agregar ReferenciaArchivoInvalida, ArchivoNoPerteneceATenant
│   └── ports/
│       └── IAlmacenamientoPort.ts         # MODIFICAR — agregar eliminarArchivo(key) y extraerKeyDesdeUrlPublica(url)
├── application/
│   └── eliminar-archivo.usecase.ts        # NUEVO — pide la key al puerto, valida formato/tenant, delega el borrado al puerto
├── infrastructure/
│   └── r2.almacenamiento.adapter.ts       # MODIFICAR — implementar eliminarArchivo (DeleteObjectCommand) y extraerKeyDesdeUrlPublica (strip de this.config.publicBaseUrl)
└── adapters/
    ├── tenant-upload.rest.ts              # MODIFICAR — agregar ruta DELETE /archivo
    └── tenant-upload.schema.ts            # MODIFICAR — agregar SolicitudEliminarArchivoSchema, EliminarArchivoResponseSchema

tests/helpers/fake-almacenamiento.port.ts  # MODIFICAR — implementar eliminarArchivo y extraerKeyDesdeUrlPublica (mismo prefijo fake ya usado por emitirUrlSubida)

tests/unit/modules/tenant/
└── eliminar-archivo.usecase.test.ts       # NUEVO — éxito, referencia inválida, tenant no coincide, idempotencia

tests/unit/modules/tenant/
└── r2.almacenamiento.adapter.test.ts      # MODIFICAR — agregar casos: eliminarArchivo llama DeleteObjectCommand con la key correcta; extraerKeyDesdeUrlPublica hace strip correcto (y devuelve null si el prefijo no matchea)

tests/integration/modules/tenant/
└── upload-url.test.ts                     # MODIFICAR (o archivo hermano nuevo `eliminar-archivo.test.ts`) — DELETE /api/tenant/archivo end-to-end con port fakeado
```

**Structure Decision**: Todo el trabajo vive dentro de `modules/tenant/`,
en los mismos archivos que ya introdujo `019-upload-r2-presigned`, salvo el
caso de uso (`eliminar-archivo.usecase.ts`, nuevo, porque es una operación
con su propia lógica de validación — no tiene sentido mezclarlo dentro de
`generar-url-subida.usecase.ts`, que resuelve un problema distinto). No se
crea un router nuevo: la ruta `DELETE /archivo` se agrega al mismo
`tenantUploadRouter` ya montado en `/api/tenant`, consistente con que ambas
operaciones (`POST /upload-url`, `DELETE /archivo`) son las dos caras del
mismo concepto de dominio ("gestión de archivos de un tenant en R2").

## Complexity Tracking

Ninguna violación nueva que justificar — ver nota en Constitution Check
sobre el precedente ya aceptado en `019-upload-r2-presigned` para el testing
del adaptador R2.
