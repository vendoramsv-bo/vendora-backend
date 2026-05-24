# API Contract: Compras

**Module**: ventas  
**Base path**: `/api/ventas/compras`  
**Auth**: All endpoints require `requireAuth + requireTenantActivo`  
**Roles**: Read — any authenticated member; Write — `PROPIETARIO | ADMIN`

---

## GET /api/ventas/compras

**Query params**: take, skip, estado (PENDIENTE|CONFIRMADA), proveedorId, orderBy (fecha|createdAt), order

**Response 200**:
```json
{
  "data": [
    {
      "id": "cuid",
      "fecha": "2026-05-23T00:00:00.000Z",
      "descripcion": "Reposición mensual",
      "proveedorId": "cuid",
      "proveedor": { "id": "cuid", "nombre": "Distribuidora ABC" },
      "totalCantidad": 50,
      "totalCompra": "450000.00",
      "totalCostoAdicional": "15000.00",
      "estado": "PENDIENTE",
      "createdAt": "2026-05-23T00:00:00.000Z"
    }
  ],
  "meta": { "take": 20, "total": 8, "hasMore": false, "nextCursor": null }
}
```

---

## POST /api/ventas/compras

Create purchase in PENDIENTE state. Requires `PROPIETARIO | ADMIN`.

**Request body**:
```json
{
  "proveedorId": "cuid",
  "fecha": "2026-05-23T00:00:00.000Z",
  "descripcion": "Reposición mensual",
  "detalles": [
    {
      "productoId": "cuid",
      "varianteId": "cuid",
      "cantidad": 20,
      "precio": 5000.00,
      "precioEstimadoVenta": 8000.00
    }
  ],
  "costosAdicionales": [
    { "motivo": "Flete", "costo": 5000.00 }
  ]
}
```

**Response 201**: Full purchase object with detalles and costos included.

**Errors**:
- `404 ProveedorNoEncontrado`
- `422 DetalleVacioError` — detalles array empty

---

## GET /api/ventas/compras/:id

Full purchase with detalles and costos.

**Response 200**: Full purchase object.  
**Errors**: `404 CompraNoEncontradaError`

---

## PATCH /api/ventas/compras/:id

Update purchase header (fecha, descripcion, proveedorId). Only PENDIENTE purchases.

**Response 200**: Updated purchase.  
**Errors**: `404`, `422 CompraYaConfirmadaError`

---

## DELETE /api/ventas/compras/:id

Delete purchase. Only PENDIENTE. Requires `PROPIETARIO | ADMIN`.

**Response 204**: No content.  
**Errors**: `404`, `422 CompraYaConfirmadaError`

---

## POST /api/ventas/compras/:id/confirmar

Confirm purchase — increments stock for all lines. Requires `PROPIETARIO | ADMIN`.

**Request body**: none (or empty `{}`)

**Response 200**:
```json
{
  "compra": { "id": "cuid", "estado": "CONFIRMADA", ... },
  "advertencias": [
    "Variante cuid1 no tiene inventario activado — stock no actualizado"
  ]
}
```

**Errors**:
- `404 CompraNoEncontradaError`
- `422 CompraYaConfirmadaError`

---

## POST /api/ventas/compras/:id/detalles

Add a detalle to PENDIENTE purchase. Requires `PROPIETARIO | ADMIN`.

**Request body**: `{ productoId, varianteId?, cantidad, precio, precioEstimadoVenta }`

**Response 201**: Created detalle object.  
**Errors**: `404`, `422 CompraYaConfirmadaError`, `409 DetalleYaExiste`

---

## PATCH /api/ventas/compras/:id/detalles/:detalleId

Update a detalle (cantidad, precio, precioEstimadoVenta). Only PENDIENTE.

**Response 200**: Updated detalle.

---

## DELETE /api/ventas/compras/:id/detalles/:detalleId

Remove a detalle from PENDIENTE purchase.

**Response 204**.

---

## POST /api/ventas/compras/:id/costos

Add an additional cost. Requires `PROPIETARIO | ADMIN`. Only PENDIENTE.

**Request body**: `{ "motivo": "Flete", "costo": 5000.00 }`

**Response 201**: Created costo object.  
**Errors**: `409 CostoMotivoYaExiste` — same motivo already exists for this compra

---

## PATCH /api/ventas/compras/:id/costos/:costoId

Update cost amount. Only PENDIENTE.

**Response 200**: Updated costo.

---

## DELETE /api/ventas/compras/:id/costos/:costoId

Remove additional cost. Only PENDIENTE.

**Response 204**.
