# REST API & Socket.IO Contracts: Capa Social

**Feature**: 009-capa-social  
**Auth levels**: `[public]` = sin auth | `[user]` = cualquier usuario autenticado | `[staff]` = PROPIETARIO|ADMIN del tenant

---

## Convenciones

- **Slug resolution**: `:slug` identifica al tenant. El backend resuelve `tenantId` y `tiendaId` desde el slug.
- **Paginación**: Todos los GET de listas aceptan `?page=N&take=N&order=asc|desc` (max take=100, default take=20).
- **Errores comunes**:
  - `404 PRODUCTO_NO_ENCONTRADO` / `TIENDA_NO_ENCONTRADA` / `PUBLICACION_NO_ENCONTRADA`
  - `403 NO_AUTORIZADO` — intento de operación de staff sin rol adecuado
  - `422 ESTADO_INVALIDO` — transición de estado inválida en publicación
  - `409 YA_EXISTE` — intentar crear favorito/seguidor duplicado (devuelve el existente en su lugar)
  - `400 VALIDACION` — datos de entrada inválidos

---

## US1 — Interacciones sobre Productos

### Reacciones

```
POST   [user] /api/social/productos/:productoId/reaccionar
Body: { emoji: string }
Response 200: { id, emoji, userId, productoId, createdAt }
Response 200: { removed: true } (si el mismo emoji ya existía — toggle)

GET    [public] /api/public/social/:slug/productos/:productoId/reacciones
Response 200: { data: [{ emoji, count }], meta: { total } }

DELETE [user] /api/social/productos/:productoId/reaccionar
Body: { emoji: string }
Response 200: { removed: true }
```

### Comentarios

```
GET    [public] /api/public/social/:slug/productos/:productoId/comentarios
       ?page=1&take=20&order=desc&soloRaiz=true
Response 200: { data: [Comentario + respuestas (si soloRaiz=false)], meta: { total, hasMore, nextCursor } }

POST   [user] /api/social/productos/:productoId/comentarios
Body: { contenido: string, padreId?: string }
Response 201: Comentario

PUT    [user] /api/social/comentarios/producto/:comentarioId
Body: { contenido: string }
Response 200: Comentario
Error 403: si el usuario no es el autor

DELETE [user|staff] /api/social/comentarios/producto/:comentarioId
Response 200: { deleted: true }
Error 403: si no es autor ni staff moderador
```

### Reacciones a comentarios de producto

```
POST   [user] /api/social/comentarios/producto/:comentarioId/reaccionar
Body: { emoji: string }
Response 200: ProductoComentarioReaccion | { removed: true }
```

### Valoraciones

```
GET    [public] /api/public/social/:slug/productos/:productoId/valoraciones
       ?page=1&take=20&order=desc|puntuacion_asc|puntuacion_desc
Response 200: { data: [Valoracion], meta: { total, promedio, hasMore, nextCursor } }

POST   [user] /api/social/productos/:productoId/valorar
Body: { puntuacion: 1|2|3|4|5, resena?: string }
Response 200: Valoracion (crea o actualiza)
```

### Preguntas y Respuestas

```
GET    [public] /api/public/social/:slug/productos/:productoId/preguntas
       ?page=1&take=20&order=desc
Response 200: { data: [Pregunta + respuestas[]], meta: { total, hasMore, nextCursor } }

POST   [user] /api/social/productos/:productoId/preguntas
Body: { pregunta: string }
Response 201: ProductoPregunta

POST   [user] /api/social/preguntas/producto/:preguntaId/respuestas
Body: { respuesta: string }
Response 201: ProductoRespuesta
```

### Favoritos

```
POST   [user] /api/social/productos/:productoId/favorito
Response 200: { favorito: true } | { favorito: false } (toggle)

GET    [user] /api/social/favoritos/productos
       ?page=1&take=20
Response 200: { data: [ProductoFavorito + Producto], meta: { total, hasMore, nextCursor } }
```

---

## US2 — Interacciones sobre la Tienda

> `:slug` resuelve el tenant → tienda. Los endpoints `[public]` leen; los `[user]` escriben.

### Reacciones

```
POST   [user] /api/social/tiendas/:slug/reaccionar
Body: { tipo: TipoReaccion }
Response 200: TiendaReaccion | { removed: true } (toggle, upsert)

GET    [public] /api/public/social/:slug/reacciones
Response 200: { data: [{ tipo, count }], meta: { total } }
```

### Comentarios

```
GET    [public] /api/public/social/:slug/comentarios
       ?page=1&take=20&order=desc
Response 200: { data: [TiendaComentario + respuestas], meta: { total, hasMore, nextCursor } }

POST   [user] /api/social/tiendas/:slug/comentarios
Body: { contenido: string, padreId?: string }
Response 201: TiendaComentario

PUT    [user] /api/social/comentarios/tienda/:comentarioId
Body: { contenido: string }
Response 200: TiendaComentario

DELETE [user|staff] /api/social/comentarios/tienda/:comentarioId
Response 200: { deleted: true }
```

### Valoraciones

```
GET    [public] /api/public/social/:slug/valoraciones
       ?page=1&take=20&order=desc|puntuacion_asc|puntuacion_desc
Response 200: { data: [TiendaValoracion], meta: { total, promedio, hasMore, nextCursor } }

POST   [user] /api/social/tiendas/:slug/valorar
Body: { puntuacion: 1|2|3|4|5, resena?: string }
Response 200: TiendaValoracion (crea o actualiza)
```

### Preguntas y Respuestas

```
GET    [public] /api/public/social/:slug/preguntas
       ?page=1&take=20&order=desc
Response 200: { data: [TiendaPregunta + respuestas[]], meta: { total, hasMore, nextCursor } }

POST   [user] /api/social/tiendas/:slug/preguntas
Body: { pregunta: string }
Response 201: TiendaPregunta

POST   [user] /api/social/preguntas/tienda/:preguntaId/respuestas
Body: { respuesta: string }
Response 201: TiendaRespuesta
```

### Favoritos y Seguimiento

```
POST   [user] /api/social/tiendas/:slug/favorito
Response 200: { favorito: true } | { favorito: false } (toggle)

POST   [user] /api/social/tiendas/:slug/seguir
Response 200: { siguiendo: true } | { siguiendo: false } (toggle)

GET    [public] /api/public/social/:slug/seguidores/count
Response 200: { count: number }

GET    [user] /api/social/favoritos/tiendas
       ?page=1&take=20
Response 200: { data: [TiendaFavorito + Tienda], meta: { total, hasMore, nextCursor } }
```

---

## US3 — Publicaciones del Tenant

### Gestión (staff PROPIETARIO|ADMIN)

```
GET    [staff] /api/social/publicaciones
       ?estado=BORRADOR|PUBLICADO|ARCHIVADO&etiqueta=...&page=1&take=20&order=desc
Response 200: { data: [Publicacion + medios], meta: { total, hasMore, nextCursor } }

POST   [staff] /api/social/publicaciones
Body: {
  titulo?: string,
  contenido?: string,
  tipo: TipoPublicacion,
  etiquetas?: string[],
  medios?: [{
    tipo: TipoMediaPublicacion,
    url?: string,
    embedUrl?: string,
    thumbnailUrl?: string,
    plataforma?: PlataformaMedia,
    titulo?: string,
    orden?: number
  }]
}
Response 201: Publicacion + medios[]

PUT    [staff] /api/social/publicaciones/:id
Body: (mismos campos que POST, parcial)
Response 200: Publicacion + medios[]
Note: Solo en estado BORRADOR

PATCH  [staff] /api/social/publicaciones/:id/estado
Body: { estado: "PUBLICADO" | "ARCHIVADO" }
Response 200: Publicacion
Error 422 ESTADO_INVALIDO: transición no permitida

DELETE [staff] /api/social/publicaciones/:id
Response 200: { deleted: true }
Note: Solo en estado BORRADOR o ARCHIVADO
```

### Lectura pública

```
GET    [public] /api/public/social/:slug/publicaciones
       ?etiqueta=...&page=1&take=20&order=desc
Response 200: { data: [Publicacion + medios], meta: { total, hasMore, nextCursor } }
Note: Solo devuelve estado=PUBLICADO

GET    [public] /api/public/social/:slug/publicaciones/:id
Response 200: Publicacion + medios + reacciones (conteos) + comentarios (primera página)
Error 404: si no existe o no está PUBLICADO
```

### Interacciones sobre publicaciones

```
POST   [user] /api/social/publicaciones/:id/reaccionar
Body: { tipo: TipoReaccion }
Response 200: PublicacionReaccion | { removed: true } (toggle, upsert)

POST   [user] /api/social/publicaciones/:id/comentarios
Body: { contenido: string, padreId?: string }
Response 201: PublicacionComentario

PUT    [user] /api/social/comentarios/publicacion/:comentarioId
Body: { contenido: string }
Response 200: PublicacionComentario

DELETE [user|staff] /api/social/comentarios/publicacion/:comentarioId
Response 200: { deleted: true }

POST   [user] /api/social/publicaciones/:id/compartir
Body: { plataforma: PlataformaCompartido }
Response 201: PublicacionCompartido
Note: Registra el evento; el cliente genera el enlace externo
```

---

## US4 — Socket.IO: Eventos en tiempo real

### Salas

| Sala | Descripción |
|------|-------------|
| `tenant:${tenantId}` | Todos los usuarios del tenant |
| `tenant:${tenantId}:producto:${productoId}` | Usuarios viendo ese producto |
| `tenant:${tenantId}:publicacion:${publicacionId}` | Usuarios viendo esa publicación |

### Eventos emitidos por el servidor

```typescript
// ServerToClientEvents (agregar a tipos existentes)

"social:reaccion": (payload: {
  elementoTipo: "PRODUCTO" | "TIENDA" | "PUBLICACION" | "COMENTARIO_PRODUCTO" | "COMENTARIO_TIENDA" | "COMENTARIO_PUBLICACION"
  elementoId: string
  tenantId: string
  userId: string
  tipo?: TipoReaccion   // para tienda/publicacion
  emoji?: string        // para producto
  removed: boolean
  fecha: string
}) => void

"social:comentario": (payload: {
  elementoTipo: "PRODUCTO" | "TIENDA" | "PUBLICACION"
  elementoId: string
  tenantId: string
  comentarioId: string
  padreId?: string
  userId: string
  contenido: string
  esRespuesta: boolean
  fecha: string
}) => void

"social:valoracion": (payload: {
  elementoTipo: "PRODUCTO" | "TIENDA"
  elementoId: string
  tenantId: string
  userId: string
  puntuacion: number
  nuevoPromedio: number
  fecha: string
}) => void

"social:publicacion-nueva": (payload: {
  tenantId: string
  publicacionId: string
  titulo?: string
  tipo: TipoPublicacion
  etiquetas: string[]
  fecha: string
}) => void
```

---

## Errores de dominio

| Código | HTTP | Descripción |
|--------|------|-------------|
| `PRODUCTO_NO_ENCONTRADO` | 404 | Producto no existe o no pertenece al tenant |
| `TIENDA_NO_ENCONTRADA` | 404 | Tenant no tiene Tienda activa (esTienda=false) |
| `PUBLICACION_NO_ENCONTRADA` | 404 | No existe o no está publicada |
| `COMENTARIO_NO_ENCONTRADO` | 404 | Comentario no existe |
| `PREGUNTA_NO_ENCONTRADA` | 404 | Pregunta no existe |
| `NO_AUTORIZADO` | 403 | Usuario no tiene permiso (no es autor ni staff) |
| `ESTADO_PUBLICACION_INVALIDO` | 422 | Transición de estado no permitida |
| `PUNTUACION_INVALIDA` | 400 | Puntuación fuera del rango 1-5 |
| `COMENTARIO_ES_RESPUESTA` | 422 | Intento de responder a una respuesta (máx. 1 nivel) |
| `SOLO_PROPIETARIO_ADMIN` | 403 | Solo PROPIETARIO o ADMIN pueden gestionar publicaciones |
