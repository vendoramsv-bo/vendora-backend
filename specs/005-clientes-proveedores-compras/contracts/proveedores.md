# API Contract: Proveedores

**Module**: ventas  
**Base path**: `/api/ventas/proveedores`  
**Auth**: All endpoints require `requireAuth + requireTenantActivo`  
**Roles**: Read — any authenticated member; Write — `PROPIETARIO | ADMIN`

---

## GET /api/ventas/proveedores

**Query params**: take, skip, search (by nombre), estado, orderBy (nombre|createdAt), order

**Response 200**:
```json
{
  "data": [
    {
      "id": "cuid",
      "nombre": "Distribuidora ABC",
      "nit": "900123456-1",
      "telefono": "+57 300 000 0000",
      "direccion": "Calle 10 # 20-30",
      "departamento": "Cundinamarca",
      "sitioWeb": "https://abc.com",
      "productosOfrece": "Harinas, azúcar, aceites",
      "estado": "ACTIVO",
      "createdAt": "2026-05-23T00:00:00.000Z"
    }
  ],
  "meta": { "take": 20, "total": 45, "hasMore": false, "nextCursor": null }
}
```

---

## POST /api/ventas/proveedores

Create supplier. Requires `PROPIETARIO | ADMIN`.

**Request body**:
```json
{
  "nombre": "Distribuidora ABC",
  "nit": "900123456-1",
  "telefono": "+57 300 000 0000",
  "direccion": "Calle 10 # 20-30",
  "departamento": "Cundinamarca",
  "sitioWeb": "https://abc.com",
  "productosOfrece": "Harinas, azúcar, aceites"
}
```

**Response 201**: Full supplier object.

**Errors**:
- `409 ProveedorNombreDuplicado`
- `409 ProveedorNITDuplicado`

---

## GET /api/ventas/proveedores/:id

**Response 200**: Full supplier object.  
**Errors**: `404 ProveedorNoEncontrado`

---

## PATCH /api/ventas/proveedores/:id

Update supplier data. Requires `PROPIETARIO | ADMIN`. All fields optional.

**Response 200**: Updated supplier.  
**Errors**: `404`, `409 ProveedorNombreDuplicado`, `409 ProveedorNITDuplicado`

---

## PATCH /api/ventas/proveedores/:id/estado

**Request body**: `{ "estado": "ACTIVO" | "INACTIVO" }`  
**Response 200**: Updated supplier.

---

## DELETE /api/ventas/proveedores/:id

Delete supplier. Requires `PROPIETARIO | ADMIN`.

**Response 204**: No content.  
**Errors**:
- `404 ProveedorNoEncontrado`
- `422 ProveedorEnUsoError` — has associated purchases
