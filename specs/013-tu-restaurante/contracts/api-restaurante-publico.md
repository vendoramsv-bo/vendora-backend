# API Contracts: TuRestaurante — Perfil Público

Todos los endpoints siguen el patrón Hono + `@hono/zod-openapi`.
Responses de listas usan el contrato uniforme: `{ data: T[], meta: { take, total, hasMore, nextCursor } }`.

---

## Endpoints Públicos (sin autenticación)

### `GET /api/public/restaurantes`
Lista el directorio de restaurantes activos (`esRestaurante = true`).

**Query params** (contrato uniforme `makeQueryParamsSchema`):
| Param | Tipo | Descripción |
|-------|------|-------------|
| `lat` | `number?` | Latitud del consumidor (activa ordenamiento por cercanía) |
| `lng` | `number?` | Longitud del consumidor |
| `tipoServicio` | `TipoServicioRestaurante?` | Filtro: MESA \| DELIVERY \| PARA_LLEVAR \| MIXTO |
| `especialidad` | `string?` | Búsqueda de texto libre en especialidad |
| `search` | `string?` | Búsqueda en nombre/descripción del tenant |
| `orderBy` | `puntuacion\|seguidores\|cercanía\|createdAt` | Default: `puntuacion` |
| `order` | `asc\|desc` | Default: `desc` |
| `take` | `number` | Máx 100, default 20 |
| `cursor` | `string?` | Paginación por cursor |

**Response** `200`:
```ts
{
  data: {
    slug: string
    nombre: string
    descripcion: string
    logoUrl: string | null
    tipoServicio: TipoServicioRestaurante | null
    especialidad: string | null
    puntuacionPromedio: number | null
    totalValoraciones: number
    totalSeguidores: number
    distanciaKm: number | null    // solo si lat/lng provistos
    ciudad: string | null
    estado: 'ACTIVO'
  }[]
  meta: { take: number; total: number; hasMore: boolean; nextCursor: string | null }
}
```

---

### `GET /api/public/restaurantes/:slug`
Perfil público completo de un restaurante activo.

**Response** `200`:
```ts
{
  slug: string
  nombre: string
  descripcion: string
  logoUrl: string | null
  fotos: string[]
  tipoServicio: TipoServicioRestaurante | null
  especialidad: string | null
  capacidadMesas: number | null
  capacidadComensales: number | null
  duracionPromedioMin: number
  horarios: HorarioPublico[]
  contactoPublico: ContactoPublico | null
  localizaciones: { direccion: string; ciudad: string; lat: number; lng: number }[]
  propietariosVisibles: { nombres: string; imagenUrl: string | null }[]
  equipoPublico: { nombres: string; cargo: string; imagenUrl: string | null }[]
  metricas: { puntuacionPromedio: number | null; totalValoraciones: number; totalSeguidores: number }
}
```

**Response** `404`: restaurante no existe o `esRestaurante = false`.

---

### `GET /api/public/restaurantes/:slug/menus`
Menús en estado PUBLICADO del restaurante.

**Query params**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| `tiempoComida` | `string?` | Filtro por nombre del tiempo de comida |
| `fecha` | `date?` | Filtro por fecha de vigencia (default: hoy) |
| `take` | `number` | Máx 100, default 10 |
| `cursor` | `string?` | Cursor de paginación |

**Response** `200`:
```ts
{
  data: {
    id: string
    nombre: string
    descripcion: string | null
    imagenPortada: string | null
    fechaInicio: string
    fechaFin: string
    items: {
      id: string
      nombreSnapshot: string
      descripcionSnapshot: string | null
      imagenSnapshot: string | null
      precio: number
      esEspecial: boolean
      destacado: boolean
      disponible: boolean
      tiempoComida: string
    }[]
  }[]
  meta: { take: number; total: number; hasMore: boolean; nextCursor: string | null }
}
```
> Nota: `costo` del producto NUNCA se incluye en la respuesta.

---

### `GET /api/public/restaurantes/:slug/valoraciones`
Lista de valoraciones públicas del restaurante.

**Query params**: `take`, `cursor`, `orderBy` (createdAt|puntuacion), `order`

**Response** `200`:
```ts
{
  data: {
    id: string
    puntuacion: number
    resena: string | null
    autor: { nombre: string; avatarUrl: string | null }
    createdAt: string
  }[]
  meta: { take: number; total: number; hasMore: boolean; nextCursor: string | null }
}
```

---

### `GET /api/public/restaurantes/:slug/comentarios`
Árbol de comentarios del restaurante (solo raíz; las respuestas se cargan con `padreId`).

**Query params**: `take`, `cursor`, `padreId?` (para cargar respuestas de un comentario)

**Response** `200`:
```ts
{
  data: {
    id: string
    contenido: string
    editado: boolean
    autor: { nombre: string; avatarUrl: string | null }
    reacciones: { tipo: TipoReaccion; total: number }[]
    totalRespuestas: number
    createdAt: string
  }[]
  meta: { take: number; total: number; hasMore: boolean; nextCursor: string | null }
}
```

---

### `GET /api/public/restaurantes/:slug/preguntas`
Preguntas públicas (estado ACTIVO) con sus respuestas.

**Query params**: `take`, `cursor`

**Response** `200`:
```ts
{
  data: {
    id: string
    pregunta: string
    autor: { nombre: string }
    respuestas: { respuesta: string; autor: { nombre: string }; createdAt: string }[]
    createdAt: string
  }[]
  meta: { take: number; total: number; hasMore: boolean; nextCursor: string | null }
}
```

---

## Endpoints de Consumidor Autenticado (`/api/consumer/restaurantes/:slug/...`)

> Todos requieren sesión de usuario (consumidor sin membresía en el tenant).

### `POST /api/consumer/restaurantes/:slug/reservas`
Crear reserva online.

**Body**:
```ts
{
  fechaLlegada: string  // ISO datetime
  numeroComensales: number  // min 1
  observaciones?: string
}
```

**Response** `201`:
```ts
{
  id: string
  codigo: string
  fechaLlegada: string
  numeroComensales: number
  estado: 'PENDIENTE'
  restaurante: { nombre: string; slug: string }
}
```

**Errors**:
- `422`: Restaurante no acepta reservas de mesa (tipoServicio = DELIVERY o PARA_LLEVAR)
- `422`: Fecha de llegada en el pasado
- `422`: Restaurante no activo (`esRestaurante = false`)

---

### `GET /api/consumer/mis-reservas`
Lista las reservas del consumidor autenticado (todos los restaurantes).

**Query params**: `take`, `cursor`, `estado?` (PENDIENTE|RESERVADA|CONFIRMADA|CANCELADA|…)

**Response** `200`:
```ts
{
  data: {
    id: string
    codigo: string
    fechaLlegada: string
    numeroComensales: number
    estado: EstadoReserva
    observaciones: string | null
    restaurante: { nombre: string; slug: string; logoUrl: string | null }
  }[]
  meta: { take: number; total: number; hasMore: boolean; nextCursor: string | null }
}
```

---

### `DELETE /api/consumer/mis-reservas/:reservaId`
Cancelar reserva propia (solo en estado PENDIENTE).

**Response** `200`: `{ id: string; estado: 'CANCELADA_CLIENTE' }`

**Errors**:
- `404`: Reserva no encontrada o no pertenece al usuario
- `422`: Reserva no está en estado PENDIENTE

---

### `POST /api/consumer/restaurantes/:slug/valorar`
Crear o actualizar valoración del restaurante. Una sola valoración activa por usuario.

**Body**: `{ puntuacion: number (1-5); resena?: string }`

**Response** `200`: `{ id: string; puntuacion: number; resena: string | null }`

---

### `POST /api/consumer/restaurantes/:slug/comentar`
Publicar comentario (o respuesta con `padreId`).

**Body**: `{ contenido: string; padreId?: string }`

**Response** `201`: `{ id: string; contenido: string; createdAt: string }`

---

### `POST /api/consumer/restaurantes/:slug/preguntar`
Publicar pregunta pública.

**Body**: `{ pregunta: string }`

**Response** `201`: `{ id: string; pregunta: string; createdAt: string }`

---

### `POST /api/consumer/restaurantes/:slug/toggle-seguir`
Seguir o dejar de seguir el restaurante.

**Response** `200`: `{ siguiendo: boolean; totalSeguidores: number }`

---

### `POST /api/consumer/restaurantes/:slug/toggle-favorito`
Marcar o desmarcar como favorito.

**Response** `200`: `{ favorito: boolean }`

---

### `POST /api/consumer/restaurantes/:slug/reaccionar`
Reaccionar al perfil del restaurante.

**Body**: `{ tipo: TipoReaccion }`

**Response** `200`: `{ tipo: TipoReaccion; reacciones: { tipo: TipoReaccion; total: number }[] }`

---

## Endpoints de Staff con guard `esRestaurante` (`/api/staff/restaurante/...`)

> Requieren sesión con rol PROPIETARIO o ADMIN en el tenant, y `esRestaurante = true`.

### `POST /api/staff/restaurante/perfil/activar`
Activar perfil público (`esRestaurante = true`).

**Response** `200`: `{ esRestaurante: true; slug: string }`

---

### `POST /api/staff/restaurante/perfil/desactivar`
Desactivar perfil público (`esRestaurante = false`).

**Response** `200`: `{ esRestaurante: false }`

---

### `PATCH /api/staff/restaurante/perfil/configuracion`
Actualizar configuración pública del restaurante.

**Body**:
```ts
{
  especialidad?: string
  tipoServicio?: TipoServicioRestaurante
  capacidadMesas?: number
  capacidadComensales?: number
  duracionPromedioMin?: number
  horarios?: HorarioPublico[]
  fotos?: string[]          // URLs (subidas previamente a R2)
  contactoPublico?: ContactoPublico
}
```

**Response** `200`: configuración actualizada.

---

### `POST /api/staff/restaurante/publicaciones`
Publicar novedad/promoción en el perfil público.

**Body**:
```ts
{
  titulo?: string
  contenido: string
  tipo: TipoPublicacion
  etiquetas?: string[]
  medios?: { tipo: TipoMediaPublicacion; url?: string; embedUrl?: string }[]
}
```

**Response** `201`: `{ id: string; estado: 'PUBLICADO'; createdAt: string }`

---

### `POST /api/staff/restaurante/preguntas/:preguntaId/responder`
Responder una pregunta pública.

**Body**: `{ respuesta: string }`

**Response** `201`: `{ id: string; respuesta: string }`

---

### `PATCH /api/staff/restaurante/preguntas/:preguntaId/ocultar`
Ocultar pregunta (estado INACTIVO). Solo PROPIETARIO/ADMIN.

**Response** `200`: `{ id: string; estado: 'INACTIVO' }`

---

### `PATCH /api/staff/restaurante/preguntas/:preguntaId/mostrar`
Restaurar pregunta a visible (estado ACTIVO).

**Response** `200`: `{ id: string; estado: 'ACTIVO' }`

---

## Eventos Socket.IO (tiempo real)

Sala del tenant: `tenant:${tenantId}` y sala del restaurante: `tenant:${tenantId}:restaurante`

| Evento | Payload | Disparado por |
|--------|---------|---------------|
| `restaurante:perfil_actualizado` | `{ slug, campo }` | Actualizar configuración pública |
| `restaurante:nueva_valoracion` | `{ restauranteSlug, puntuacion, promedio }` | Valorar restaurante |
| `restaurante:nuevo_comentario` | `{ restauranteSlug, comentarioId }` | Comentar restaurante |
| `restaurante:nueva_pregunta` | `{ restauranteSlug, preguntaId }` | Preguntar al restaurante |
| `restaurante:nueva_reserva` | `{ restauranteSlug, reservaId, codigo }` | Crear reserva pública |
| `restaurante:reserva_cancelada` | `{ restauranteSlug, reservaId, codigo }` | Cancelar reserva |
| `restaurante:nuevo_seguidor` | `{ restauranteSlug, totalSeguidores }` | Toggle-seguir |
| `restaurante:nueva_reaccion` | `{ restauranteSlug, tipo, reacciones }` | Reaccionar |
