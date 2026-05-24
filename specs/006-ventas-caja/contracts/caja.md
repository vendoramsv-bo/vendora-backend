# API Contract: Apertura y Cierre de Caja

**Base path**: `/api/ventas/cajas`  
**Auth**: `requireAuth + requireTenantActivo`

---

## GET /cajas
Filterables: `estadoCaja`, `fecha`, `puntoVentaId`, `turnoId`  
Response `200`:
```json
{
  "data": [
    {
      "id": "string",
      "puntoVentaId": "string",
      "turnoId": "string",
      "tenantMemberId": "string",
      "fecha": "ISO8601",
      "montoIngresos": "decimal",
      "montoEgresos": "decimal",
      "montoVentas": "decimal",
      "montoDescuentos": "decimal",
      "montoArqueoCaja": "decimal",
      "estadoCaja": "APERTURADA | CERRADA",
      "ingresosDeCaja": [],
      "egresosDeCaja": []
    }
  ],
  "meta": { "take": 20, "total": 3, "hasMore": false }
}
```

## GET /cajas/:id
Response `200`: single caja with ingresos, egresos, ventas summary  
Error `404`: not found

## POST /cajas/abrir
Roles: All authenticated members  
Body:
```json
{
  "puntoVentaId": "string (required)",
  "turnoId": "string (required)",
  "montoInicial": "number ≥ 0 (required)"
}
```
Response `201`: created AperturaCierreDeCaja with estadoCaja=APERTURADA  
Error `409`: caja already open for this member/punto/turno/fecha  
Error `422`: punto de venta INACTIVO or turno INACTIVO

## POST /cajas/:id/cerrar
Roles: All authenticated members (must be the same member who opened, or ADMIN)  
Body:
```json
{
  "montoArqueoCaja": "number ≥ 0 (required)"
}
```
Response `200`: updated caja with estadoCaja=CERRADA and diferencia calculated  
Error `404`: caja not found  
Error `422`: caja already CERRADA  
Socket event emitted: `ventas:caja:cerrada`

## POST /cajas/:id/ingresos
Roles: All authenticated members  
Body: `{ "motivo": "string", "montoIngreso": "number > 0" }`  
Response `201`: created IngresosCaja; caja.montoIngresos updated  
Error `422`: caja is CERRADA

## POST /cajas/:id/egresos
Roles: All authenticated members  
Body: `{ "motivo": "string", "montoEgreso": "number > 0" }`  
Response `201`: created EgresosCaja; caja.montoEgresos updated  
Error `422`: caja is CERRADA
