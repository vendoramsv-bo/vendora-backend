# Quickstart: Sistema de Ventas y Caja

**Feature**: 006-ventas-caja  
**Date**: 2026-05-24

---

## Scenario 1: Complete Sale Flow

```
1. Admin creates punto de venta "Caja Principal" (POST /puntos-venta)
2. Admin creates turno "Mañana" (POST /turnos-atencion)
3. Vendor opens caja with $500 initial (POST /cajas/abrir)
   → caja.estadoCaja = APERTURADA
4. Vendor registers a venta:
   POST /ventas { aperturaCierreCajaId, 2 products, tipoPago=EFECTIVO, efectivo=600 }
   → venta created, diferencia=50 (cambio), socket event ventas:venta:creada
5. Vendor confirms venta (POST /ventas/:id/confirmar)
   → stock decremented for each variant with inventarioActivado=true
   → MovimientoInventario(SALIDA) created per variant
   → insumos decremented via ProductoInsumo recipe
   → AperturaCierreDeCaja.montoVentas += totalVenta
6. Vendor closes caja with arqueo $520 (POST /cajas/:id/cerrar)
   → efectivoEsperado = montoInicial + montoIngresos - montoEgresos + montoVentas
   → diferencia recorded, estadoCaja = CERRADA
   → socket event ventas:caja:cerrada
```

---

## Scenario 2: Order from Public Portal → Converted to Sale

```
1. Customer creates a pedido via portal (POST /pedidos)
   → estado = PENDIENTE, socket event ventas:pedido:actualizado
2. Staff changes pedido estado to ELABORADO (PATCH /pedidos/:id/estado { estado: "ELABORADO" })
   → socket event ventas:pedido:actualizado
3. Staff converts to venta (POST /pedidos/:id/convertir-en-venta)
   → Venta created with referenciaTipo=PEDIDO, referenciaId=pedidoId
   → pedido estado → FINALIZADO
4. Staff confirms venta to decrement stock (POST /ventas/:id/confirmar)
```

---

## Scenario 3: Consolidated Report — Multi-Vertical

```
GET /ventas/reporte-consolidado?fechaDesde=2026-05-01&fechaHasta=2026-05-31
→ Returns merged array of ReporteIngreso DTOs:
  - Ventas from ventas schema (fuente: "VENTA")
  - AtencionPago from consultorio schema (fuente: "CONSULTORIO") — only if esConsultorio=true
→ Sorted by fecha desc
→ Admin sees unified income view across all tenant verticals
```

---

## Scenario 4: Real-Time Multi-User

```
User A and User B are both connected to the same tenant Socket.IO room.

User A creates venta → User B receives event: { type: "ventas:venta:creada", payload: {...} }
User A opens caja  → User B receives event: { type: "ventas:caja:abierta", payload: {...} }
Customer creates pedido → Both Users A and B receive: { type: "ventas:pedido:actualizado", payload: {...} }
```

---

## Key Unit Test Scenarios

For `abrir-caja.usecase.test.ts`:
- Opens caja and emits `cajaAbierta` event
- Throws `CajaYaAbiertaError` if same member/punto/turno/fecha already open
- Throws `PuntoVentaInactivoError` if punto de venta is INACTIVO

For `confirmar-venta.usecase.test.ts`:
- Confirms venta and calls `repo.confirmar()` with correct stock updates
- Emits no real socket event (uses FakeVentasNotificador)
- Returns `advertencias` for variants without inventario activado

For `convertir-pedido-en-venta.usecase.test.ts`:
- Creates venta with referenciaTipo=PEDIDO
- Pedido estado becomes FINALIZADO
- Throws `PedidoYaFinalizadoError` if pedido in terminal state
