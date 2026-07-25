# Data Model: Subida de Archivos a Cloudflare R2 con URLs Prefirmadas

**Feature**: `019-upload-r2-presigned` | **Fecha**: 2026-07-24

No hay cambios de schema Prisma. Esta feature es **stateless**: ningún FR
requiere persistir la "solicitud de subida" ni la "autorización de subida"
en PostgreSQL — se generan y se devuelven en la misma request, y el registro
para auditoría (FR-012) se hace vía log estructurado (Pino), no vía tabla.

## Entidades de dominio (en memoria, sin persistencia)

### `PropositoSubida` (config, no entidad persistida)

Registro estático definido en `domain/propositos-subida.ts`. Es el mapeo
"propósito → reglas de validación + ubicación" que exige FR-005/FR-010.

| Campo | Tipo | Descripción |
|---|---|---|
| `tipo` | `string` (clave del registro) | Valor exacto que envía el cliente en el body (`logo`, `equipo-foto`, `catalogo-imagen`, `catalogo-galeria`, `propietario`, `imagen-local`) |
| `tiposMimePermitidos` | `string[]` | Lista cerrada de MIME types aceptados para este propósito |
| `tamanoMaximoBytes` | `number` | Tamaño máximo declarado aceptado, en bytes (asume archivo ya comprimido en el cliente — ver `research.md` §4c) |
| `carpeta` | `string` | Nombre de la sub-carpeta dentro de `tenants/{tenantId}/` en el bucket `vendora` (ver `research.md` §4b) |

**Valores iniciales** (ver `research.md` §2 para la evidencia de uso real en
frontend y §4b para el criterio de nombres de carpeta):

| `tipo` | `tiposMimePermitidos` | `tamanoMaximoBytes` | `carpeta` |
|---|---|---|---|
| `logo` | `image/jpeg`, `image/png`, `image/webp` | 2 MB | `logoTenant` |
| `equipo-foto` | `image/jpeg`, `image/png`, `image/webp` | 2 MB | `fotosEquipo` |
| `catalogo-imagen` | `image/jpeg`, `image/png`, `image/webp` | 5 MB | `imagenesProductos` |
| `catalogo-galeria` | `image/jpeg`, `image/png`, `image/webp` | 5 MB | `galeriaProductos` |
| `propietario` | `image/jpeg`, `image/png`, `image/webp` | 2 MB | `fotoPropietario` |
| `imagen-local` | `image/jpeg`, `image/png`, `image/webp` | 5 MB | `imagenesLocal` |

Agregar un propósito nuevo (FR-010) = agregar una entrada a este `Record`;
no cambia la forma del request/response ni el caso de uso.

### `SolicitudSubida` (value object de entrada, no persistido)

Validado en el borde por Zod (`tenant-upload.schema.ts`) antes de llegar al
caso de uso (Artículo VIII.3).

| Campo | Tipo | Regla |
|---|---|---|
| `tipo` | `string` | Debe existir como clave en el registro de propósitos |
| `filename` | `string` | Nombre original del archivo (solo informativo, no se reutiliza como key final — FR-006) |
| `contentType` | `string` | Debe estar en `tiposMimePermitidos` del propósito |
| `size` | `number` (bytes, > 0) | Debe ser ≤ `tamanoMaximoBytes` del propósito |

### `AutorizacionSubida` (value object de salida, no persistido)

| Campo | Tipo | Descripción |
|---|---|---|
| `uploadUrl` | `string` | URL prefirmada `PUT`, expira en 300s (ver research.md §5) |
| `publicUrl` | `string` | `${R2_PUBLIC_BASE_URL}/${key}`, accesible en cuanto termina la subida |

### `ObjectKey` (construcción interna, no expuesta en el response)

Bucket: `vendora` (fijo, vía `R2_BUCKET_NAME`).
Formato de key dentro del bucket: `tenants/{tenantId}/{carpeta}/{uuid}{extension}`

- `tenantId`: de `c.get("tenantId")` (sesión resuelta, Artículo III.2) — así
  se garantiza el aislamiento entre tenants (FR-005, US2-AS2) sin depender
  de nada que el cliente envíe. Se usa el `id` del tenant (inmutable), no el
  `slug` (editable) — ver `research.md` §4b.
- `carpeta`: nombre legible de la sub-carpeta del `PropositoSubida`
  resuelto (ej. `imagenesProductos`), no el valor crudo de `tipo`.
- `uuid`: `crypto.randomUUID()` — garantiza unicidad por solicitud (FR-006),
  incluso ante dos requests simultáneas del mismo tenant/propósito
  (Edge case: colisión de nombres).
- `extension`: derivada de `contentType` vía un mapa fijo
  (`image/jpeg` → `.jpg`, `image/png` → `.png`, `image/webp` → `.webp`).

Ejemplo completo: `vendora/tenants/clx1a2b3c4/imagenesProductos/9f2e...-uuid.jpg`

## Errores de dominio (`domain/tenant-upload.errors.ts`)

| Clase | Cuándo | HTTP mapeado en el adaptador |
|---|---|---|
| `PropositoInvalido` | `tipo` no existe en el registro (o no habilitado para la vertical activa — mismo tratamiento, ver Assumptions de la spec) | 400 |
| `TipoMimeNoPermitido` | `contentType` no está en `tiposMimePermitidos` del propósito | 400 |
| `TamanoExcedido` | `size` > `tamanoMaximoBytes` del propósito | 400 |

`SIN_TENANT_ACTIVO` (400) y `UNAUTHORIZED` (401) se resuelven con los guards
existentes `requireAuth`/`requireTenantActivo` (`core/hono-context.ts`), no
son errores de dominio nuevos.

## Puerto de dominio

### `IAlmacenamientoPort` (`domain/ports/IAlmacenamientoPort.ts`)

```ts
export interface IAlmacenamientoPort {
  emitirUrlSubida(input: {
    key: string
    contentType: string
    expiresInSeconds: number
  }): Promise<{ uploadUrl: string; publicUrl: string }>
}
```

Implementado por `infrastructure/r2.almacenamiento.adapter.ts` (real, vía
`@aws-sdk/s3-request-presigner`) e inyectado en tiempo de arranque
(`server/index.ts`) mediante el mismo patrón provider ya usado por
`almacen-inventario.port.provider.ts` (`setAlmacenamientoPort` /
`getAlmacenamientoPort`). Los tests del caso de uso usan un fake en memoria
que implementa el mismo puerto.
