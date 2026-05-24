# API Contract: Puntos de Venta y Turnos de Atención

**Base path**: `/api/ventas`  
**Auth**: All endpoints require `requireAuth + requireTenantActivo`  
**Write endpoints**: require `requireRol(["PROPIETARIO","ADMIN"])`

---

## Puntos de Venta

### GET /puntos-venta
Query params: `take`, `skip`, `search`, `filter`, `order` (via `makeQueryParamsSchema`)  
Filterables: `nombre`, `tipo`, `estado`, `createdAt`

Response `200`:
```json
{
  "data": [
    {
      "id": "string",
      "nombre": "string",
      "tipo": "CAJA | SUCURSAL",
      "direccion": "string | null",
      "telefono": "string | null",
      "estado": "ACTIVO | INACTIVO",
      "createdAt": "ISO8601",
      "createdById": "string | null"
    }
  ],
  "meta": { "take": 20, "total": 5, "hasMore": false, "nextCursor": null }
}
```

### POST /puntos-venta
Roles: PROPIETARIO, ADMIN

Body:
```json
{
  "nombre": "string (required)",
  "tipo": "CAJA | SUCURSAL (default CAJA)",
  "direccion": "string | null",
  "telefono": "string | null",
  "sucursal": "string | null"
}
```

Response `201`: created punto de venta object  
Error `409`: nombre already exists in tenant

### PATCH /puntos-venta/:id
Roles: PROPIETARIO, ADMIN  
Body: same fields as POST (all optional)  
Response `200`: updated object  
Error `404`: not found

### PATCH /puntos-venta/:id/estado
Roles: PROPIETARIO, ADMIN  
Body: `{ "estado": "ACTIVO | INACTIVO" }`  
Response `200`: updated object

---

## Turnos de Atención

### GET /turnos-atencion
Filterables: `turno`, `estado`, `createdAt`  
Response `200`: same paginated structure

### POST /turnos-atencion
Roles: PROPIETARIO, ADMIN  
Body: `{ "turno": "string", "descripcion": "string | null" }`  
Response `201`: created turno  
Error `409`: turno name duplicate

### PATCH /turnos-atencion/:id
Body: `{ "turno": "string?", "descripcion": "string | null" }`  
Response `200`: updated

### PATCH /turnos-atencion/:id/estado
Body: `{ "estado": "ACTIVO | INACTIVO" }`  
Response `200`: updated
