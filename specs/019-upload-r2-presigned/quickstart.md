# Quickstart: Validación manual — Subida a R2 con URLs prefirmadas

**Feature**: `019-upload-r2-presigned`

## Prerrequisitos

1. Bucket R2 creado en Cloudflare, con acceso público (custom domain o
   `*.r2.dev` habilitado).
2. Variables en `.env`:
   ```
   R2_ACCOUNT_ID="..."
   R2_ACCESS_KEY_ID="..."
   R2_SECRET_ACCESS_KEY="..."
   R2_BUCKET_NAME="..."
   R2_PUBLIC_BASE_URL="https://<tu-dominio-o-r2.dev>"
   ```
3. Servidor corriendo: `pnpm dev`.
4. Un usuario con sesión y tenant activo (login normal, tomar el token de
   `Authorization: Bearer`).

## 1. Camino feliz — imagen de producto

```bash
curl -X POST http://localhost:3000/api/tenant/upload-url \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tipo":"catalogo-imagen","filename":"prueba.jpg","contentType":"image/jpeg","size":102400}'
```

**Esperado**: `200` con `{ uploadUrl, publicUrl }`. `publicUrl` debe
contener `tenants/<tu-tenant-id>/imagenesProductos/`.

```bash
curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: image/jpeg" \
  --data-binary @prueba.jpg
```

**Esperado**: `200` de R2. Luego `curl "$PUBLIC_URL"` debe devolver el
archivo subido (SC-001, US1-AS1/AS2).

## 2. Dos tenants, mismo propósito — sin colisión

Repetir el paso 1 con dos usuarios de tenants distintos y el mismo
`filename`. **Esperado**: `publicUrl` de cada uno difiere en el segmento
`tenants/<tenantId>/...` y ninguno sobrescribe al otro (US2-AS2, SC-003).

## 3. Propósito distinto — logo de tenant

```bash
curl -X POST http://localhost:3000/api/tenant/upload-url \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"tipo":"logo","filename":"logo.png","contentType":"image/png","size":51200}'
```

**Esperado**: `publicUrl` bajo `tenants/<tenantId>/logoTenant/`, distinto
del namespace de `catalogo-imagen` (`imagenesProductos`) (US2-AS1).

## 4. Rechazos (US3)

| Caso | Request | Esperado |
|---|---|---|
| Sin sesión | Omitir `Authorization` | `401 UNAUTHORIZED` |
| Tipo MIME no permitido | `"contentType":"application/x-msdownload"` con `"tipo":"catalogo-imagen"` | `400 TIPO_MIME_NO_PERMITIDO`, mensaje lista los tipos aceptados |
| Tamaño excedido | `"size": 999999999` | `400 TAMANO_EXCEDIDO`, mensaje indica el límite |
| Propósito inexistente | `"tipo":"documento-legal"` (no registrado) | `400 PROPOSITO_INVALIDO` |

En todos los casos: verificar que la respuesta **no** incluye `uploadUrl`
(SC-002 — 100% de rechazos sin emitir URL).

## 5. Expiración

Emitir una `uploadUrl`, esperar 6 minutos, luego intentar el `PUT`.
**Esperado**: R2 responde error de firma expirada (`403`), no `200`
(SC-005, FR-007).

## 6. Frontend real (opcional, si se coordina el cambio de `size`)

Una vez el frontend agregue `size` al body de
`usePresignedUpload().upload()`, probar desde `tu-tienda` en local:
subir la imagen principal de un producto desde `ProductoFormContainer` y
confirmar que la imagen final se ve en el catálogo (US1-AS3).
