# Contrato: `DELETE /api/tenant/archivo`

**Router**: mismo `tenantUploadRouter` de `019-upload-r2-presigned`
(`src/modules/tenant/adapters/tenant-upload.rest.ts`), ya montado en
`server/index.ts` bajo `/api/tenant`.

**Middleware**: `[requireAuth, requireTenantActivo]` (mismo guard que
`POST /api/tenant/upload-url`).

## Request

```http
DELETE /api/tenant/archivo
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://pub-xxxx.r2.dev/tenants/<tenantId>/imagenesProductos/<uuid>.jpg"
}
```

| Campo | Tipo | Obligatorio | Regla |
|---|---|---|---|
| `url` | `string` | sí | Debe ser exactamente la `publicUrl` devuelta por `POST /upload-url` (o guardada tal cual el cliente la recibió) |

## Response — 200 OK

```json
{ "eliminado": true }
```

Idempotente: si el archivo ya no existe (borrado previo, o nunca existió),
la respuesta es igualmente `200 { "eliminado": true }` — no es un error (FR-004).

## Errores

| HTTP | `error` | Cuándo |
|---|---|---|
| 400 | `SIN_TENANT_ACTIVO` | No hay tenant activo en la sesión (guard existente) |
| 400 | `REFERENCIA_INVALIDA` | `url` no empieza con `R2_PUBLIC_BASE_URL`, o la key resultante no tiene el formato `tenants/{id}/{carpeta}/{archivo}` |
| 400 | (Zod) | Body inválido (falta `url`, o no es string) |
| 401 | `UNAUTHORIZED` | Sin sesión activa (guard existente) |
| 403 | `ARCHIVO_NO_PERTENECE_A_TENANT` | La key es válida en formato pero pertenece a otro tenant |
| 500 | `INTERNAL_ERROR` | Falla del proveedor de almacenamiento al intentar borrar (mismo patrón que "almacenamiento no configurado" en `POST /upload-url`) — no debe interpretarse como "ya eliminado" (FR-006) |

Todas las respuestas de error siguen `ErrorResponseSchema` existente
(`{ error: string, message: string }`, `core/openapi-responses.ts`).

## Fuera de este contrato (flujo completo, referencia)

1. Cliente ya tiene una `publicUrl` guardada (de una subida previa vía
   `019-upload-r2-presigned`), referenciada en algún campo de un recurso
   propio (ej. `Producto.galeria[]`, `Propietario.imagenUrl`).
2. Cliente quita la referencia de su propio estado/mutación (ej. saca la URL
   del array `galeria` y guarda el producto) — eso lo maneja cada módulo
   consumidor, no es parte de esta feature.
3. Cliente llama `DELETE /api/tenant/archivo` con esa misma `url` para que el
   archivo físico deje de existir en el bucket. El orden entre 2 y 3 no está
   prescripto por este contrato — lo define quien lo consuma (a definir en el
   spec de frontend que conecte esto a la UI de la galería).
