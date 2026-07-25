# Contrato: `POST /api/tenant/upload-url`

**Router**: nuevo `tenantUploadRouter` (`src/modules/tenant/adapters/tenant-upload.rest.ts`),
montado en `server/index.ts` con `app.route("/api/tenant", tenantUploadRouter)`
— mismo prefijo que `tenantRouter` y `wizardRouter`, coincide exactamente con
el path ya asumido por `packages/shared/src/hooks/use-upload-presigned.ts`
en el frontend.

**Middleware**: `[requireAuth, requireTenantActivo]` (mismo guard que
`GET /api/tenant/actual`).

## Request

```http
POST /api/tenant/upload-url
Authorization: Bearer <token>
Content-Type: application/json

{
  "tipo": "catalogo-imagen",
  "filename": "producto-1.jpg",
  "contentType": "image/jpeg",
  "size": 2048576
}
```

| Campo | Tipo | Obligatorio | Regla |
|---|---|---|---|
| `tipo` | `string` | sí | Debe ser una clave del registro de propósitos (ver `data-model.md`) |
| `filename` | `string` | sí | No vacío. Solo informativo — no determina la ubicación final |
| `contentType` | `string` | sí | Debe estar en la lista de MIME permitidos del propósito |
| `size` | `number` | sí | Bytes, entero positivo, ≤ máximo permitido del propósito |

> Nota de compatibilidad: el stub actual del frontend
> (`use-upload-presigned.ts`) todavía NO envía `size`. Este campo se agrega
> al contrato en esta feature (permitido por la spec); el frontend deberá
> incorporarlo en un cambio posterior y coordinado — hasta entonces, las
> requests sin `size` fallan validación Zod con 400. Ver Complexity Tracking
> en `plan.md`.

## Response — 200 OK

```json
{
  "uploadUrl": "https://<account>.r2.cloudflarestorage.com/vendora/tenants/<tenantId>/imagenesProductos/<uuid>.jpg?X-Amz-...",
  "publicUrl": "https://cdn.vendora.app/tenants/<tenantId>/imagenesProductos/<uuid>.jpg"
}
```

`vendora` es el nombre fijo del bucket (`R2_BUCKET_NAME`). `<tenantId>` es
el `id` del Tenant (no el `slug` — ver `research.md` §4b). El segmento tras
el `tenantId` es la sub-carpeta del propósito resuelto (`data-model.md`),
no el valor crudo de `tipo`.

- `uploadUrl`: URL prefirmada `PUT`, expira en 300 segundos. El cliente debe
  hacer `PUT` directo a esta URL con el header `Content-Type` igual al
  `contentType` declarado (si no coincide, R2 responde `403 SignatureDoesNotMatch`).
- `publicUrl`: URL de lectura pública, válida en cuanto la subida `PUT`
  termina — sin paso de confirmación adicional (FR-009).

## Errores

| HTTP | `error` | Cuándo |
|---|---|---|
| 400 | `SIN_TENANT_ACTIVO` | No hay tenant activo en la sesión (guard existente) |
| 400 | `PROPOSITO_INVALIDO` | `tipo` no existe en el registro de propósitos |
| 400 | `TIPO_MIME_NO_PERMITIDO` | `contentType` no permitido para el propósito — `message` incluye los tipos aceptados |
| 400 | `TAMANO_EXCEDIDO` | `size` excede el máximo del propósito — `message` incluye el límite |
| 400 | (Zod) | Body inválido (falta un campo, tipo incorrecto) |
| 401 | `UNAUTHORIZED` | Sin sesión activa (guard existente) |

Todas las respuestas de error siguen `ErrorResponseSchema` existente
(`{ error: string, message: string }`, `core/openapi-responses.ts`).

## Fuera de este contrato (flujo completo, referencia)

1. Cliente llama `POST /api/tenant/upload-url` → recibe `{ uploadUrl, publicUrl }`.
2. Cliente hace `PUT` directo a `uploadUrl` con el archivo (sin pasar por el
   backend de VENDORA — Artículo I de ambas constituciones).
3. Cliente usa `publicUrl` como valor del campo correspondiente (ej.
   `imagenUrl` de un producto) en la mutación normal de ese recurso — eso ya
   lo maneja cada módulo consumidor (`catalogo`, `tenant`, etc.) y no es
   parte de esta feature.
