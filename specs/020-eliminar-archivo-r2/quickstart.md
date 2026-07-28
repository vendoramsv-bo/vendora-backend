# Quickstart: Probar la eliminación de archivos en R2

**Prerrequisito**: variables `R2_*` configuradas en `.env` (ya lo están, `019-upload-r2-presigned`).

## 1. Camino feliz

1. Emitir una URL de subida y subir un archivo de prueba (repetir el quickstart de `019-upload-r2-presigned`), guardando la `publicUrl` resultante.
2. Confirmar que la URL sirve el archivo (`curl -I <publicUrl>` → `200`).
3. Llamar:
   ```bash
   curl -X DELETE http://localhost:3000/api/tenant/archivo \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"url": "<publicUrl>"}'
   ```
4. Verificar `200 { "eliminado": true }`.
5. Repetir el `curl -I <publicUrl>` del paso 2 → ahora `404`.

## 2. Idempotencia (FR-004)

Repetir el paso 3 del camino feliz sobre la misma `publicUrl` una segunda vez → debe seguir devolviendo `200 { "eliminado": true }`, no un error.

## 3. Aislamiento entre tenants (FR-003)

Con una sesión autenticada sobre el Tenant A, llamar `DELETE /api/tenant/archivo` con una `url` cuyo segmento de tenant corresponda a un Tenant B distinto → debe devolver `403 ARCHIVO_NO_PERTENECE_A_TENANT`, y el archivo de B debe seguir accesible.

## 4. Referencia inválida (FR-005)

Llamar con `{"url": "https://example.com/no-es-de-nuestro-bucket.jpg"}` → debe devolver `400 REFERENCIA_INVALIDA`, sin ningún intento de borrado.
