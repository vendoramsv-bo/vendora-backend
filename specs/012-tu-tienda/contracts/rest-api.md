# REST API Contracts: TuTienda

Base URL: `/api`  
Auth header: `Authorization: Bearer {token}` (solo endpoints marcados con 🔒)  
Tenant scope: middleware `requireTenantActivo` resuelve `tenantId` desde `session.activeOrganizationId`  
Capability guard: `requireCapabilidad("esTienda")` en endpoints de staff  

---

## Módulo: Perfil y Configuración de Tienda (Staff)

### PATCH /api/tenant/tienda/activar
🔒 PROPIETARIO  
Activa el perfil público de la tienda (`esTienda = true`). Si no existe `Tienda` ni `Configuracion`, los crea con defaults.

**Response 200**:
```json
{ "esTienda": true, "tiendaId": "string" }
```

---

### PATCH /api/tenant/tienda/desactivar
🔒 PROPIETARIO  
Desactiva el perfil público (`esTienda = false`). No borra datos.

**Response 200**:
```json
{ "esTienda": false }
```

---

### GET /api/tenant/tienda/configuracion
🔒 PROPIETARIO | ADMIN  
Obtiene la configuración actual de la tienda (tema, despliegue, etc.).

**Response 200**:
```json
{
  "id": "string",
  "tipoDespliegueVentas": "BARRA_LATERAL | BARRA_SUPERIOR | BARRA_INFERIOR",
  "tema": "string",
  "tipoLineado": "string",
  "tipoDeTienda": "PEQUENA | MEDIANA | EMPRESARIAL"
}
```

---

### PATCH /api/tenant/tienda/configuracion
🔒 PROPIETARIO | ADMIN  
Actualiza la configuración visual de la tienda.

**Request Body**:
```json
{
  "tipoDespliegueVentas": "BARRA_LATERAL | BARRA_SUPERIOR | BARRA_INFERIOR",
  "tema": "string",
  "tipoLineado": "string"
}
```

**Response 200**: configuración actualizada  
**Socket.IO**: emite `tienda:configuracion:actualizada` a `tenant:{tenantId}`

---

## Módulo: Productos Destacados (Staff)

### GET /api/tenant/tienda/destacados
🔒 PROPIETARIO | ADMIN  
Lista los productos destacados actuales de la vitrina.

**Response 200**:
```json
{
  "data": [
    { "id": "string", "productoId": "string", "nombre": "string", "imagenUrl": "string", "orden": 0 }
  ],
  "total": 3
}
```

---

### POST /api/tenant/tienda/destacados
🔒 PROPIETARIO | ADMIN  
Agrega un producto a los destacados. Máximo 20.

**Request Body**:
```json
{ "productoId": "string", "orden": 0 }
```

**Response 201**: producto destacado creado  
**Errors**: 409 si ya es destacado | 422 si supera límite 20 | 422 si producto inactivo o no visible públicamente  
**Socket.IO**: emite `tienda:destacados:actualizados`

---

### DELETE /api/tenant/tienda/destacados/:productoId
🔒 PROPIETARIO | ADMIN  
Quita un producto de los destacados.

**Response 200**: `{ "ok": true }`  
**Socket.IO**: emite `tienda:destacados:actualizados`

---

### PATCH /api/tenant/tienda/destacados/reordenar
🔒 PROPIETARIO | ADMIN  
Reordena los productos destacados.

**Request Body**:
```json
{ "orden": ["productoId1", "productoId2", "productoId3"] }
```

**Response 200**: lista ordenada  
**Socket.IO**: emite `tienda:destacados:actualizados`

---

## Módulo: Directorio Público (Sin Auth)

### GET /api/public/tiendas
Sin autenticación requerida.  
Lista las tiendas activas (`esTienda = true`) con filtros, búsqueda por cercanía y paginación.

**Query Params**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| `lat` | number | Latitud para búsqueda por cercanía (opcional) |
| `lng` | number | Longitud para búsqueda por cercanía (opcional) |
| `actividadEconomicaId` | string | Filtro por actividad económica (opcional) |
| `categoriaId` | string | Filtro por categoría (opcional) |
| `busqueda` | string | Búsqueda por nombre/descripción (opcional) |
| `ordenarPor` | `puntuacion \| seguidores \| createdAt \| distancia` | Default: `createdAt` |
| `orden` | `asc \| desc` | Default: `desc` |
| `page` | number | Página (default: 1) |
| `limit` | number | Por página, máx 100 (default: 20) |

**Response 200**:
```json
{
  "data": [
    {
      "tiendaId": "string",
      "tenantSlug": "string",
      "nombre": "string",
      "descripcion": "string",
      "logoUrl": "string",
      "actividadesEconomicas": ["string"],
      "categorias": ["string"],
      "puntuacionPromedio": 4.2,
      "totalValoraciones": 15,
      "totalSeguidores": 230,
      "distanciaKm": 1.4,
      "localizacion": { "latitud": 0.0, "longitud": 0.0, "ciudad": "string", "barrio": "string" }
    }
  ],
  "total": 120,
  "page": 1,
  "limit": 20,
  "totalPaginas": 6,
  "hayPaginaSiguiente": true,
  "hayPaginaAnterior": false
}
```

---

### GET /api/public/tiendas/:slug
Sin autenticación requerida.  
Perfil público completo de una tienda activa.

**Response 200**:
```json
{
  "tiendaId": "string",
  "tenantSlug": "string",
  "nombre": "string",
  "descripcion": "string",
  "logoUrl": "string",
  "imagenes": [{ "url": "string", "descripcion": "string", "orden": 0 }],
  "propietarios": [{ "nombres": "string", "imagenUrl": "string" }],
  "equipoDeTrabajo": [{ "nombres": "string", "cargo": "string", "imagenUrl": "string" }],
  "horarios": [],
  "localizaciones": [{ "latitud": 0.0, "longitud": 0.0, "direccion": "string", "ciudad": "string" }],
  "actividadesEconomicas": ["string"],
  "configuracion": {
    "tema": "string",
    "tipoLineado": "string"
  },
  "productosDestacados": [
    { "productoId": "string", "nombre": "string", "precio": 0.0, "imagenUrl": "string", "orden": 0 }
  ],
  "metricas": {
    "puntuacionPromedio": 4.2,
    "totalValoraciones": 15,
    "totalSeguidores": 230,
    "totalComentarios": 48
  }
}
```

**Errors**: 404 si `esTienda = false` o tenant no existe (sin revelar si el tenant existe)

---

### GET /api/public/tiendas/:slug/productos
Sin autenticación requerida.  
Catálogo público: productos activos y visibles públicamente. Acepta contrato uniforme de consulta.

**Query Params**: `categoriaId`, `busqueda`, `page`, `limit`, `ordenarPor`, `orden`

**Response 200**: `{ data: Producto[], total, page, limit, totalPaginas, hayPaginaSiguiente, hayPaginaAnterior }`

---

## Módulo: Interacciones Sociales (Extensión — Auth Requerida)

### POST /api/public/tiendas/:slug/preguntas
🔒 Cualquier usuario autenticado  
*(Ya existe en tienda-social.rest.ts — sin cambios)*

---

### PATCH /api/tenant/tienda/preguntas/:preguntaId/ocultar
🔒 PROPIETARIO | ADMIN  
Oculta una pregunta (`estado = INACTIVO`).

**Response 200**: `{ "id": "string", "estado": "INACTIVO" }`

---

### PATCH /api/tenant/tienda/preguntas/:preguntaId/mostrar
🔒 PROPIETARIO | ADMIN  
Hace visible una pregunta (`estado = ACTIVO`).

**Response 200**: `{ "id": "string", "estado": "ACTIVO" }`

---

## Módulo: Publicaciones del Comercio (Staff)

### POST /api/tenant/publicaciones
🔒 PROPIETARIO | ADMIN (cambio: actualmente cualquier miembro autenticado)  
*(Endpoint ya existe en publicacion-staff.rest.ts — se agrega restricción de rol)*

---

## Socket.IO Events (Server → Client)

| Evento | Sala | Descripción |
|--------|------|-------------|
| `tienda:configuracion:actualizada` | `tenant:{tenantId}` | Configuración visual actualizada |
| `tienda:destacados:actualizados` | `tenant:{tenantId}` | Vitrina de destacados modificada |
| `tienda:nueva:valoracion` | `tenant:{tenantId}` | Nueva valoración recibida |
| `tienda:nuevo:comentario` | `tenant:{tenantId}` | Nuevo comentario en el perfil |
| `tienda:nueva:pregunta` | `tenant:{tenantId}` | Nueva pregunta pública |
| `tienda:nuevo:seguidor` | `tenant:{tenantId}` | Nuevo seguidor |
