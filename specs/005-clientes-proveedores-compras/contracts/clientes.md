# API Contract: Clientes

**Module**: ventas  
**Base path**: `/api/ventas/clientes`  
**Auth**: All endpoints require `requireAuth + requireTenantActivo`  
**Roles**: Read — any authenticated member; Write — `PROPIETARIO | ADMIN`

---

## GET /api/ventas/clientes

List clients for the tenant with pagination, filtering, and name search.

**Query params** (via `makeQueryParamsSchema`):

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| take | number | 20 | Max 100 |
| skip | number | 0 | Offset |
| search | string? | — | Search by nombre |
| estado | ACTIVO\|INACTIVO? | — | Filter by estado |
| orderBy | string? | createdAt | Sortable: nombre, createdAt |
| order | asc\|desc | desc | Sort direction |

**Response 200**:
```json
{
  "data": [
    {
      "id": "cuid",
      "nombre": "María García",
      "email": "maria@example.com",
      "telefono": "+591 70000000",
      "direccion": "Av. Principal 123",
      "diaNacimiento": 15,
      "mesNacimiento": 8,
      "estado": "ACTIVO",
      "createdAt": "2026-05-23T00:00:00.000Z"
    }
  ],
  "meta": { "take": 20, "total": 150, "hasMore": true, "nextCursor": null }
}
```

---

## POST /api/ventas/clientes

Create a new client. Requires `PROPIETARIO | ADMIN`.

**Request body**:
```json
{
  "nombre": "María García",
  "email": "maria@example.com",
  "telefono": "+591 70000000",
  "direccion": "Av. Principal 123",
  "diaNacimiento": 15,
  "mesNacimiento": 8
}
```

**Response 201**: Full client object.

**Errors**:
- `409 ClienteNombreDuplicado` — nombre already exists in tenant
- `409 ClienteEmailDuplicado` — email already exists in tenant
- `400 VALIDACION` — schema validation failure

---

## GET /api/ventas/clientes/:id

Get a single client.

**Response 200**: Full client object.  
**Errors**: `404 ClienteNoEncontrado`

---

## PATCH /api/ventas/clientes/:id

Update a client's data. Requires `PROPIETARIO | ADMIN`.

**Request body** (all fields optional):
```json
{
  "nombre": "string?",
  "email": "string? | null",
  "telefono": "string? | null",
  "direccion": "string? | null",
  "diaNacimiento": "number? | null",
  "mesNacimiento": "number? | null"
}
```

**Response 200**: Updated client object.  
**Errors**: `404`, `409 ClienteNombreDuplicado`, `409 ClienteEmailDuplicado`

---

## PATCH /api/ventas/clientes/:id/estado

Change client status. Requires `PROPIETARIO | ADMIN`.

**Request body**:
```json
{ "estado": "ACTIVO" | "INACTIVO" }
```

**Response 200**: Updated client object.  
**Errors**: `404 ClienteNoEncontrado`
