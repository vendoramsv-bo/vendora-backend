# API Contract: TuConsultorio — Endpoints Públicos y Consumer

**Feature**: 015-tu-consultorio  
**Date**: 2026-06-05  
**Base path**: `/api/public/consultorios` (sin auth) · `/api/consultorio` (staff) · `/api/consumer/consultorios` (consumer auth)

---

## Autenticación

| Prefijo | Auth requerida | Tipo de usuario |
|---------|---------------|-----------------|
| `GET /api/public/consultorios/*` | ❌ No | Cualquier visitante |
| `GET/POST /api/consumer/consultorios/*` | ✅ Sí (Bearer token) | Usuario registrado sin membresía en el tenant |
| `GET/POST/PATCH /api/consultorio/*` | ✅ Sí + `esConsultorio=true` | Staff con membresía en el tenant |

---

## 1. Endpoints Públicos — `/api/public/consultorios`

### `GET /api/public/consultorios`
Directorio público de consultorios activos.

**Query params**:
```
lat?:           number   — latitud del usuario
lon?:           number   — longitud del usuario
especialidad?:  string   — filtra por especialidad (ej: "Pediatría")
tipoServicio?:  PRESENCIAL | TELECONSULTA | AMBOS
orderBy?:       puntuacion | seguidores | distancia | fecha  (default: puntuacion)
order?:         asc | desc  (default: desc)
page?:          number   (default: 1)
take?:          number   (default: 20, max: 100)
```

**Response 200**:
```json
{
  "data": [
    {
      "slug": "clinica-san-jose",
      "nombre": "Clínica San José",
      "descripcion": "Atención médica integral para toda la familia",
      "logo": "https://...",
      "especialidades": ["Medicina General", "Pediatría"],
      "tipoServicio": "PRESENCIAL",
      "promedioValoracion": 4.7,
      "totalValoraciones": 34,
      "totalSeguidores": 120,
      "localizacion": { "lat": -17.783, "lon": -63.182 },
      "distanciaKm": 1.4
    }
  ],
  "total": 45,
  "page": 1,
  "take": 20,
  "totalPaginas": 3,
  "hayPaginaSiguiente": true,
  "hayPaginaAnterior": false
}
```

---

### `GET /api/public/consultorios/:slug`
Perfil completo de un consultorio.

**Response 200**:
```json
{
  "slug": "clinica-san-jose",
  "nombre": "Clínica San José",
  "descripcion": "...",
  "logo": "https://...",
  "fotos": ["https://..."],
  "especialidades": ["Medicina General", "Pediatría"],
  "nroRegistro": "RES-001234",
  "tipoServicio": "AMBOS",
  "horarios": [
    { "diaSemana": 0, "horaInicio": "08:00", "horaFin": "18:00", "activo": true }
  ],
  "contactoPublico": {
    "telefono": "+591 70000000",
    "email": "info@clinicasanjose.com",
    "redesSociales": [{ "nombre": "Facebook", "url": "https://..." }]
  },
  "medicos": [
    {
      "id": "med_xxx",
      "nombre": "Dr. Carlos Méndez",
      "especialidad": "Pediatría",
      "fotoUrl": "https://...",
      "bio": "Especialista en pediatría con 15 años de experiencia"
    }
  ],
  "promedioValoracion": 4.7,
  "totalValoraciones": 34,
  "totalSeguidores": 120,
  "localizacion": { "lat": -17.783, "lon": -63.182, "direccion": "Av. San Martín 123" }
}
```

**Errors**: `404` si slug no existe o `esConsultorio=false`.

---

### `GET /api/public/consultorios/:slug/servicios`
Catálogo de servicios públicos del consultorio.

**Query params**:
```
especialidad?: string
page?: number  take?: number (max 100)
```

**Response 200**:
```json
{
  "data": [
    {
      "id": "svc_xxx",
      "nombre": "Consulta General",
      "descripcion": "Atención médica de primera consulta",
      "especialidad": "Medicina General",
      "duracionMin": 30,
      "precio": "150.00"
    }
  ],
  "total": 12, "page": 1, "take": 20, "totalPaginas": 1,
  "hayPaginaSiguiente": false, "hayPaginaAnterior": false
}
```

> `precio` solo aparece si `ServicioMedico.mostrarPrecio = true`.

---

### `GET /api/public/consultorios/:slug/disponibilidad`
Slots disponibles para un médico y servicio en un rango de fechas.

**Query params**:
```
medicoId:    string   (requerido)
servicioId:  string   (requerido)
fechaDesde:  string   ISO8601 date (requerido)
fechaHasta:  string   ISO8601 date (requerido, máx 30 días desde fechaDesde)
```

**Response 200**:
```json
{
  "data": [
    {
      "fechaHora": "2026-06-10T09:00:00.000Z",
      "disponible": true
    },
    {
      "fechaHora": "2026-06-10T09:30:00.000Z",
      "disponible": false
    }
  ]
}
```

**Errors**: `400` si fechaHasta > 30 días, si medicoId no existe o no es visible, si servicioId no existe o no es público.

---

### `GET /api/public/consultorios/:slug/reacciones`
Reacciones agrupadas del consultorio.

**Response 200**: `[{ "tipo": "LIKE", "total": 42 }]`

---

### `GET /api/public/consultorios/:slug/comentarios`
Comentarios públicos (paginación cursor-based).

**Query params**: `take?, cursor?, order? (asc|desc), padreId?`

**Response 200**: `{ data: ConsultorioComentario[], meta: { take, total, hasMore, nextCursor } }`

---

### `GET /api/public/consultorios/:slug/valoraciones`
Valoraciones (paginación cursor-based).

**Query params**: `take?, cursor?, order?, orderBy? (puntuacion|fecha)`

**Response 200**: `{ data, meta: { take, total, hasMore, nextCursor }, promedio: number }`

---

### `GET /api/public/consultorios/:slug/preguntas`
Preguntas con respuestas (solo estado ACTIVO).

**Query params**: `take?, cursor?, order?`

**Response 200**: `{ data: ConsultorioPregunta[], meta }`

---

### `GET /api/public/consultorios/:slug/seguidores/count`
Total de seguidores.

**Response 200**: `{ total: 120 }`

---

### `GET /api/public/consultorios/:slug/publicaciones`
Novedades publicadas.

**Query params**: `take?, cursor?`

**Response 200**: `{ data: Publicacion[], meta }`

---

## 2. Endpoints Consumer — `/api/consumer/consultorios`

> Requiere token Bearer (Better-Auth). El usuario NO tiene membresía en el tenant consultorio.

---

### `POST /api/consumer/consultorios/:slug/citas`
Crear cita online.

**Body**:
```json
{
  "medicoId": "med_xxx",
  "servicioId": "svc_xxx",
  "fechaHora": "2026-06-10T09:00:00.000Z",
  "motivo": "Consulta de control rutinario"
}
```

**Response 201**:
```json
{
  "id": "cit_xxx",
  "estado": "PENDIENTE",
  "fechaHora": "2026-06-10T09:00:00.000Z",
  "medico": { "nombre": "Dr. Carlos Méndez", "especialidad": "Pediatría" },
  "servicio": { "nombre": "Consulta General", "duracionMin": 30 },
  "createdAt": "2026-06-05T12:00:00.000Z"
}
```

**Errors**:
- `409 SLOT_NO_DISPONIBLE` — el slot ya está ocupado
- `400 MEDICO_NO_DISPONIBLE` — médico no visible públicamente
- `400 SERVICIO_NO_DISPONIBLE` — servicio no marcado como público

---

### `GET /api/consumer/consultorios/mis-citas`
Historial de citas del consumidor autenticado.

**Query params**:
```
estado?: PENDIENTE | CONFIRMADA | ATENDIDA | CANCELADA_CLIENTE | RECHAZADA | CANCELADA | NO_ASISTIO
page?: number  take?: number (default: 20, max: 100)
orderBy?: fechaHora  order?: asc | desc (default: desc)
```

**Response 200**:
```json
{
  "data": [
    {
      "id": "cit_xxx",
      "estado": "PENDIENTE",
      "fechaHora": "2026-06-10T09:00:00.000Z",
      "consultorio": { "slug": "clinica-san-jose", "nombre": "Clínica San José" },
      "medico": { "nombre": "Dr. Carlos Méndez" },
      "servicio": { "nombre": "Consulta General" },
      "createdAt": "2026-06-05T12:00:00.000Z"
    }
  ],
  "total": 5, "page": 1, "take": 20,
  "totalPaginas": 1, "hayPaginaSiguiente": false, "hayPaginaAnterior": false
}
```

---

### `PATCH /api/consumer/consultorios/mis-citas/:citaId/cancelar`
Cancelar una cita propia.

**Body**: `{}` (sin body requerido)

**Response 200**: `{ "id": "cit_xxx", "estado": "CANCELADA_CLIENTE" }`

**Errors**:
- `403` si la cita no pertenece al consumidor autenticado
- `409 CITA_NO_CANCELABLE` — estado ATENDIDA, PAGADA, RECHAZADA, CANCELADA o CANCELADA_CLIENTE

---

### `POST /api/consumer/consultorios/:slug/reaccionar`
Upsert de reacción (toggle si mismo tipo).

**Body**: `{ "tipo": "LIKE" }`

**Response 200**: `{ "tipo": "LIKE" | null, "removed": false, "reacciones": [{ "tipo": "LIKE", "total": 43 }] }`

---

### `POST /api/consumer/consultorios/:slug/comentarios`
Crear comentario o respuesta.

**Body**: `{ "contenido": "Muy buena atención", "padreId"?: "com_xxx" }`

**Response 201**: `ConsultorioComentario`

---

### `POST /api/consumer/consultorios/:slug/valorar`
Crear/actualizar valoración (upsert).

**Body**: `{ "puntuacion": 5, "resena"?: "Excelente atención" }`

**Response 201**: `ConsultorioValoracion`

---

### `POST /api/consumer/consultorios/:slug/preguntas`
Crear pregunta pública.

**Body**: `{ "pregunta": "¿Atienden urgencias pediátricas?" }`

**Response 201**: `ConsultorioPregunta`

---

### `POST /api/consumer/consultorios/:slug/seguir`
Toggle seguimiento (seguir / dejar de seguir).

**Response 200**: `{ "siguiendo": true, "totalSeguidores": 121 }`

---

### `POST /api/consumer/consultorios/:slug/favorito`
Toggle favorito.

**Response 200**: `{ "favorito": true }`

---

## 3. Endpoints Staff — `/api/consultorio`

> Requieren membresía en el tenant con `esConsultorio=true`.

---

### `POST /api/consultorio/activar-perfil-publico`
Activar visibilidad pública del consultorio.

**Body**: `{}`

**Response 200**: `{ "esConsultorio": true }`

---

### `POST /api/consultorio/desactivar-perfil-publico`
Desactivar visibilidad pública.

**Response 200**: `{ "esConsultorio": false }`

---

### `PATCH /api/consultorio/configuracion-publica`
Actualizar perfil público del consultorio.

**Body** (todos opcionales):
```json
{
  "horarios": [{ "diaSemana": 0, "horaInicio": "08:00", "horaFin": "17:00", "activo": true }],
  "contactoPublico": { "telefono": "+591 70000000", "email": "info@..." },
  "tipoServicio": "AMBOS",
  "fotos": ["https://..."],
  "especialidades": ["Medicina General", "Pediatría"]
}
```

**Response 200**: `Consultorio (campos públicos)`

---

### `PATCH /api/consultorio/medicos/:medicoId/visibilidad`
Cambiar visibilidad pública de un médico.

**Body**: `{ "visiblePublico": true }`

**Response 200**: `{ "id": "med_xxx", "visiblePublico": true }`

---

### `PATCH /api/consultorio/servicios/:servicioId/visibilidad`
Cambiar visibilidad y precio público de un servicio.

**Body**: `{ "visiblePublico": true, "mostrarPrecio"?: false }`

**Response 200**: `{ "id": "svc_xxx", "visiblePublico": true, "mostrarPrecio": false }`

---

### `GET /api/consultorio/citas-online`
Listado de citas creadas online por consumidores.

**Query params**: `estado?, page?, take?, order?`

**Response 200**: Listado paginado de citas con `origenOnline=true`.

---

### `PATCH /api/consultorio/citas-online/:citaId/confirmar`
Confirmar una cita online.

**Response 200**: `{ "estado": "CONFIRMADA" }`

---

### `PATCH /api/consultorio/citas-online/:citaId/rechazar`
Rechazar una solicitud de cita online.

**Body**: `{ "motivo"?: "Horario ya ocupado" }`

**Response 200**: `{ "estado": "RECHAZADA" }`

---

### `GET /api/consultorio/social/preguntas`
Preguntas del consultorio (incluye INACTIVO para staff).

**Query params**: `incluirInactivas?: boolean, take?, cursor?, order?`

---

### `POST /api/consultorio/social/preguntas/:preguntaId/responder`
Responder pregunta. Requiere rol PROPIETARIO o ADMIN.

**Body**: `{ "respuesta": "Sí, atendemos urgencias de lunes a sábado" }`

---

### `PATCH /api/consultorio/social/preguntas/:preguntaId/ocultar`
Ocultar pregunta. Requiere rol PROPIETARIO o ADMIN.

---

### `PATCH /api/consultorio/social/preguntas/:preguntaId/mostrar`
Restaurar visibilidad. Requiere rol PROPIETARIO o ADMIN.

---

### `POST /api/consultorio/social/novedades`
Publicar novedad. Requiere rol PROPIETARIO o ADMIN.

**Body**:
```json
{
  "titulo"?: "Nueva tecnología disponible",
  "contenido": "Incorporamos equipo de radiografía digital",
  "tipo": "TEXTO",
  "etiquetas"?: ["equipamiento"],
  "medios"?: [{ "tipo": "IMAGEN", "url": "https://..." }]
}
```

**Response 201**: `{ "id": "pub_xxx", "estado": "PUBLICADO", "createdAt": "..." }`

---

## 4. Eventos Socket.IO

Todos los eventos se emiten a los rooms `tenant:${tenantId}` y `tenant:${tenantId}:consultorio`.

| Evento | Datos | Disparado por |
|--------|-------|---------------|
| `consultorio:nueva-cita-online` | `{ consultorioSlug, citaId, fechaHora, medicoId }` | Consumer crea cita |
| `consultorio:nueva-valoracion` | `{ consultorioSlug, promedio, total }` | Consumer valora |
| `consultorio:nuevo-comentario` | `{ consultorioSlug, comentarioId }` | Consumer comenta |
| `consultorio:nueva-pregunta` | `{ consultorioSlug, preguntaId }` | Consumer pregunta |
| `consultorio:nuevo-seguidor` | `{ consultorioSlug, totalSeguidores }` | Consumer sigue |
| `consultorio:nueva-publicacion` | `{ consultorioSlug, publicacionId }` | Staff publica novedad |
| `consultorio:perfil-actualizado` | `{ consultorioSlug }` | Staff actualiza perfil |
