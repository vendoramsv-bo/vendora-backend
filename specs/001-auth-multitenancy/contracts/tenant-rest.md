# Contratos REST — Módulo Tenant

> Endpoints propios de la capa de dominio, expuestos vía Hono + `@hono/zod-openapi`.
> Complementan los endpoints de Better-Auth para operaciones de lectura con Prisma
> scopeado y paginación uniforme (Artículo IV).
>
> Todos requieren sesión activa (`Authorization: Bearer <token>`) y tenant activo.

---

## Base URL

```
/api/tenant/**
```

---

## GET /api/tenant/actual

Obtiene los datos completos del tenant activo en la sesión, incluyendo el perfil
del propietario.

**Headers requeridos:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
  "id": "cuid",
  "name": "Mi Negocio",
  "slug": "mi-negocio",
  "logo": "https://...",
  "nombreLargo": "Mi Negocio S.A.S.",
  "descripcion": "Descripción del negocio",
  "esTienda": false,
  "esConsultorio": true,
  "esRestaurante": false,
  "plan": "BASICO",
  "estado": "ACTIVO",
  "createdAt": "2026-05-20T00:00:00Z",
  "propietario": {
    "nombres": "Juan Pérez",
    "telefono": "3001234567",
    "imagenUrl": null
  }
}
```

**Response 401:** Sin sesión activa.
**Response 400:** Sin tenant activo en la sesión.
**Response 404:** Tenant no encontrado o eliminado.

---

## GET /api/tenant

Lista todos los tenants a los que pertenece el usuario autenticado.

**Query params:**

| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| take | number | 20 | Registros por página (máx 100) |
| skip | number | 0 | Offset |
| orderBy | string | createdAt | Campo de orden: `name` \| `createdAt` |
| order | string | desc | `asc` \| `desc` |

**Response 200:**
```json
{
  "data": [
    {
      "id": "cuid",
      "name": "Mi Negocio",
      "slug": "mi-negocio",
      "logo": null,
      "esTienda": false,
      "esConsultorio": true,
      "esRestaurante": false,
      "miRol": "PROPIETARIO"
    }
  ],
  "meta": {
    "take": 20,
    "total": 1,
    "hasMore": false,
    "nextCursor": null
  }
}
```

---

## GET /api/tenant/miembros

Lista los miembros del tenant activo con paginación y filtros.

**Query params:**

| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| take | number | 20 | Registros por página (máx 100) |
| skip | number | 0 | Offset |
| filterField | string | — | Campo a filtrar: `role` \| `estado` |
| filterOp | string | equals | Operador: `equals` |
| filterValue | string | — | Valor del filtro |
| orderBy | string | createdAt | `createdAt` \| `role` |
| order | string | desc | `asc` \| `desc` |
| search | string | — | Busca en nombre o email del usuario |

**Response 200:**
```json
{
  "data": [
    {
      "id": "cuid",
      "userId": "cuid",
      "role": "VENDEDOR",
      "estado": "ACTIVO",
      "createdAt": "2026-05-20T00:00:00Z",
      "usuario": {
        "name": "Ana López",
        "email": "ana@ejemplo.com",
        "image": null
      }
    }
  ],
  "meta": { "take": 20, "total": 5, "hasMore": false, "nextCursor": null }
}
```

**Response 401:** Sin sesión.
**Response 400:** Sin tenant activo.

---

## GET /api/tenant/invitaciones

Lista las invitaciones del tenant activo. Solo accesible por propietario o admin.

**Query params:**

| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| take | number | 20 | Máx 100 |
| skip | number | 0 | Offset |
| filterField | string | — | `status` |
| filterValue | string | — | `pending` \| `accepted` \| `rejected` \| `canceled` |

**Response 200:**
```json
{
  "data": [
    {
      "id": "cuid",
      "email": "invitado@ejemplo.com",
      "role": "VENDEDOR",
      "status": "pending",
      "expiresAt": "2026-05-27T00:00:00Z",
      "invitador": {
        "name": "Juan Pérez",
        "email": "juan@ejemplo.com"
      }
    }
  ],
  "meta": { "take": 20, "total": 2, "hasMore": false, "nextCursor": null }
}
```

**Response 401:** Sin sesión.
**Response 403:** Rol insuficiente (requiere PROPIETARIO o ADMIN).

---

## Códigos de error comunes

| HTTP | Cuándo |
|------|--------|
| 400 | Sin tenant activo en sesión / parámetro inválido |
| 401 | Sin sesión activa o token expirado |
| 403 | Rol insuficiente para la operación |
| 404 | Tenant no encontrado o eliminado |
| 429 | Rate limit superado en endpoints de auth |
