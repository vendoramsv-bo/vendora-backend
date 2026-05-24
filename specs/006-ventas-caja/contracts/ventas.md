# API Contract: Ventas

**Base path**: `/api/ventas/ventas`  
**Auth**: `requireAuth + requireTenantActivo`

---

## GET /ventas
Filterables: `fecha`, `estadoPago`, `tipoPago`, `puntoVentaId`, `turnoId`, `clienteId`  
Response `200`:
```json
{
  "data": [
    {
      "id": "string",
      "fecha": "ISO8601",
      "puntoVentaId": "string",
      "turnoId": "string",
      "tenantMemberId": "string",
      "aperturaCierreCajaId": "string",
      "clienteId": "string | null",
      "clienteNombre": "string | null",
      "totalCantidad": "number",
      "totalVenta": "decimal",
      "totalDescuento": "decimal",
      "efectivo": "decimal",
      "diferencia": "decimal",
      "tipoPago": "EFECTIVO | QR | TARJETA_CREDITO | TARJETA_DEBITO | OTRO",
      "estadoPago": "PAGADO | EN_ESPERA",
      "referenciaTipo": "PUNTO_DE_VENTA | PEDIDO | OTRO",
      "ventasDetalle": []
    }
  ],
  "meta": { "take": 20, "total": 100, "hasMore": true }
}
```

## GET /ventas/:id
Response `200`: venta with full ventasDetalle  
Error `404`: not found

## POST /ventas
Roles: All authenticated members  
Body:
```json
{
  "aperturaCierreCajaId": "string (required — must be APERTURADA)",
  "puntoVentaId": "string (required)",
  "turnoId": "string (required)",
  "clienteId": "string | null",
  "clienteNombre": "string | null",
  "clienteTipoDocumento": "string | null",
  "clienteNroDocumento": "string | null",
  "clienteEmail": "string | null",
  "tipoPago": "EFECTIVO | QR | TARJETA_CREDITO | TARJETA_DEBITO | OTRO",
  "estadoPago": "PAGADO | EN_ESPERA (default PAGADO)",
  "efectivo": "number (required if tipoPago=EFECTIVO)",
  "detalle": [
    {
      "productoId": "string",
      "varianteId": "string | null",
      "etiquetaVariante": "string | null",
      "precioVolumenId": "string | null",
      "precio": "number",
      "cantidad": "number (integer > 0)",
      "descuento": "number ≥ 0 (default 0)",
      "notaVenta": "string | null"
    }
  ]
}
```
Response `201`: created venta (NO stock decrement yet — use POST /ventas/:id/confirmar)  
Error `422`: caja CERRADA  
Socket event emitted: `ventas:venta:creada`

## POST /ventas/:id/confirmar
Roles: All authenticated members  
Body: `{}` (no body required)  
Response `200`: updated venta + `advertencias: string[]`  
Side effects: decrements ProductoVariante.cantidadStock, creates MovimientoInventario (SALIDA), decrements Insumo.cantidadStock, creates MovimientoAlmacen (SALIDA), updates AperturaCierreDeCaja.montoVentas if tipoPago=EFECTIVO

---

## GET /ventas/reporte-consolidado
Query params: `fechaDesde`, `fechaHasta`, `puntoVentaId?`, `turnoId?`, `tipoPago?`, `fuente?` (VENTA|CONSULTORIO), `take`, `skip`  
Response `200`:
```json
{
  "data": [
    {
      "id": "string",
      "fecha": "ISO8601",
      "monto": "decimal",
      "tipoPago": "string",
      "estado": "string",
      "fuente": "VENTA | CONSULTORIO",
      "clienteNombre": "string | null",
      "puntoVentaId": "string | null"
    }
  ],
  "meta": { "take": 50, "total": 320, "hasMore": true }
}
```
