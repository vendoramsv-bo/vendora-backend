# API Contract: Pedidos y Gastos

**Base path**: `/api/ventas`  
**Auth**: `requireAuth + requireTenantActivo`

---

## Pedidos

### GET /pedidos
Filterables: `estado`, `fecha`, `userId`  
Response `200`:
```json
{
  "data": [
    {
      "id": "string",
      "userId": "string",
      "fecha": "ISO8601",
      "estado": "PENDIENTE | ELABORADO | FINALIZADO | RECHAZADO",
      "totalCantidad": "number",
      "totalPedido": "decimal",
      "respuesta": "string | null",
      "pedidosDetalle": []
    }
  ],
  "meta": { "take": 20, "total": 10, "hasMore": false }
}
```

### GET /pedidos/:id
Response `200`: pedido with full pedidosDetalle  
Error `404`: not found

### POST /pedidos
Body:
```json
{
  "userId": "string (required — public portal user)",
  "detalle": [
    {
      "productoId": "string",
      "varianteId": "string | null",
      "etiquetaVariante": "string | null",
      "precio": "number",
      "cantidad": "number (integer > 0)"
    }
  ]
}
```
Response `201`: created pedido with estado=PENDIENTE  
Socket event emitted: `ventas:pedido:actualizado`

### PATCH /pedidos/:id/estado
Roles: PROPIETARIO, ADMIN (staff only)  
Body: `{ "estado": "ELABORADO | FINALIZADO | RECHAZADO", "respuesta": "string | null" }`  
Response `200`: updated pedido  
Error `422`: state transition not allowed (FINALIZADO/RECHAZADO are terminal)  
Socket event emitted: `ventas:pedido:actualizado`

### POST /pedidos/:id/convertir-en-venta
Roles: PROPIETARIO, ADMIN, VENDEDOR  
Body:
```json
{
  "aperturaCierreCajaId": "string",
  "puntoVentaId": "string",
  "turnoId": "string",
  "tipoPago": "EFECTIVO | QR | TARJETA_CREDITO | TARJETA_DEBITO | OTRO",
  "estadoPago": "PAGADO | EN_ESPERA",
  "efectivo": "number | null"
}
```
Response `201`: created Venta (referenciaTipo=PEDIDO); pedido estado → FINALIZADO  
Error `422`: pedido is FINALIZADO or RECHAZADO

---

## Gastos

### GET /gastos
Filterables: `fecha`, `estado`, `createdAt`  
Response `200`:
```json
{
  "data": [
    {
      "id": "string",
      "tenantMemberId": "string | null",
      "fecha": "ISO8601",
      "motivo": "string",
      "totalGasto": "decimal",
      "estado": "ACTIVO | ELIMINADO",
      "createdById": "string | null"
    }
  ],
  "meta": { "take": 20, "total": 5, "hasMore": false }
}
```

### POST /gastos
Roles: PROPIETARIO, ADMIN  
Body:
```json
{
  "fecha": "ISO8601 (required)",
  "motivo": "string (required)",
  "totalGasto": "number > 0 (required)"
}
```
Response `201`: created gasto

### PATCH /gastos/:id
Roles: PROPIETARIO, ADMIN  
Body: any subset of POST body fields  
Response `200`: updated gasto

### DELETE /gastos/:id
Roles: PROPIETARIO, ADMIN  
Response `200`: gasto estado → ELIMINADO (soft delete)
