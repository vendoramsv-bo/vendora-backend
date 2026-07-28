# Phase 1 Data Model: Eliminación Real de Archivos en Cloudflare R2

Sin cambios de esquema Prisma — esta feature no persiste estado nuevo en base de datos (igual que `019-upload-r2-presigned`, es stateless respecto a qué archivos existen; la única fuente de verdad es el propio bucket).

## 1. `IAlmacenamientoPort` (extendido)

```ts
// domain/ports/IAlmacenamientoPort.ts
export interface EmitirUrlSubidaInput { key: string; contentType: string; expiresInSeconds: number }
export interface EmitirUrlSubidaResultado { uploadUrl: string; publicUrl: string }

export interface IAlmacenamientoPort {
  emitirUrlSubida(input: EmitirUrlSubidaInput): Promise<EmitirUrlSubidaResultado>
  eliminarArchivo(key: string): Promise<void>   // NUEVO
  /**
   * Deriva la key interna a partir de una publicUrl, o null si la URL no
   * pertenece a este backend de almacenamiento (prefijo no coincide). La
   * forma de una publicUrl es un detalle de cada adaptador (R2, y a futuro
   * cualquier otro) — el caso de uso no debe conocer R2_PUBLIC_BASE_URL
   * directamente (Artículo II.3: transporte/infra-agnóstico).
   */
  extraerKeyDesdeUrlPublica(url: string): string | null   // NUEVO
}
```

## 2. Solicitud de eliminación (entrada al caso de uso)

```ts
// application/eliminar-archivo.usecase.ts
export interface EliminarArchivoInput {
  tenantId: string   // de la sesión activa (c.get("tenantId")), no del body
  url: string         // publicUrl tal cual la tiene guardada el cliente
}
```

## 3. Errores de dominio nuevos

```ts
// domain/tenant-upload.errors.ts (agregar a las 3 ya existentes)
export class ReferenciaArchivoInvalida extends Error {
  readonly code = "REFERENCIA_INVALIDA"
  constructor(url: string) {
    super(`La referencia de archivo "${url}" no tiene un formato válido`)
    this.name = "ReferenciaArchivoInvalida"
  }
}

export class ArchivoNoPerteneceATenant extends Error {
  readonly code = "ARCHIVO_NO_PERTENECE_A_TENANT"
  constructor() {
    super("El archivo no pertenece al tenant activo")
    this.name = "ArchivoNoPerteneceATenant"
  }
}
```

## 4. Parsing de `publicUrl` → `key` (repartido entre puerto y caso de uso)

El paso 1 (específico de cómo cada adaptador arma sus URLs públicas) vive en
el **puerto/adaptador**; los pasos 2-4 (formato genérico de key + validación
de tenant, agnósticos del proveedor de almacenamiento) viven en el
**caso de uso**:

```
Entrada:  publicUrl = "https://pub-xxxx.r2.dev/tenants/T1/fotoPropietario/uuid.jpg"
                       (o el dominio custom que R2_PUBLIC_BASE_URL tenga configurado)

[infrastructure] R2AlmacenamientoAdapter.extraerKeyDesdeUrlPublica(publicUrl):
Paso 1:   quitar el prefijo this.config.publicBaseUrl + "/" → si no matchea
          el prefijo, devolver null

[application] EliminarArchivoUseCase.ejecutar({ tenantId, url }):
Paso 2:   key = almacenamiento.extraerKeyDesdeUrlPublica(url)
          → si es null, lanzar ReferenciaArchivoInvalida
Paso 3:   split(key, "/") → debe dar exactamente 4 segmentos y segments[0] === "tenants",
          si no, lanzar ReferenciaArchivoInvalida
Paso 4:   si segments[1] !== tenantId (de la sesión), lanzar ArchivoNoPerteneceATenant
Paso 5:   key válida → almacenamiento.eliminarArchivo(key)
```

## 5. Contrato REST (request/response)

```ts
// adapters/tenant-upload.schema.ts (agregar)
export const SolicitudEliminarArchivoSchema = z.object({
  url: z.string().min(1).openapi({ example: "https://pub-xxxx.r2.dev/tenants/.../imagenesProductos/x.jpg" }),
})

export const EliminarArchivoResponseSchema = z.object({
  eliminado: z.literal(true),
})
```

## Relaciones

```
DELETE /api/tenant/archivo { url }
  → EliminarArchivoUseCase.ejecutar({ tenantId, url })
      → parsear url → key (o lanzar ReferenciaArchivoInvalida)
      → validar tenant del segmento (o lanzar ArchivoNoPerteneceATenant)
      → IAlmacenamientoPort.eliminarArchivo(key)
          → R2AlmacenamientoAdapter → DeleteObjectCommand (idempotente)
```
