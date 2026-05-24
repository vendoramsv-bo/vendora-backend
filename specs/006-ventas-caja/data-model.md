# Data Model: Sistema de Ventas y Caja

**Feature**: 006-ventas-caja  
**Schema**: `ventas` (50-ventas.prisma) — all models already exist  
**Date**: 2026-05-24

---

## Entities

### PuntosDeVenta
**Schema table**: `ventas.PuntosDeVenta`

| Field         | Type              | Constraints                    |
|---------------|-------------------|--------------------------------|
| id            | String (cuid)     | PK                             |
| tenantId      | String            | FK Tenant, required            |
| nombre        | String            | Unique per tenant              |
| tipo          | TipoPuntoDeVenta  | CAJA \| SUCURSAL, default CAJA |
| direccion     | String?           | Optional                       |
| telefono      | String?           | Optional                       |
| sucursal      | String?           | Optional                       |
| estado        | Estado            | ACTIVO \| INACTIVO             |
| createdById   | String?           | Audit                          |
| updatedById   | String?           | Audit                          |

**Validation**: `nombre` unique within tenant (`@@unique([tenantId, nombre])`).  
**State transitions**: ACTIVO → INACTIVO → ACTIVO (toggle). INACTIVO points of sale cannot be selected for caja apertura.

---

### TurnosDeAtencion
**Schema table**: `ventas.TurnosDeAtencion`

| Field         | Type     | Constraints            |
|---------------|----------|------------------------|
| id            | String   | PK                     |
| tenantId      | String   | FK Tenant              |
| turno         | String   | Unique per tenant      |
| descripcion   | String?  | Optional               |
| estado        | Estado   | ACTIVO \| INACTIVO     |
| createdById   | String?  | Audit                  |
| updatedById   | String?  | Audit                  |

**Validation**: `turno` unique within tenant (`@@unique([tenantId, turno])`).

---

### AperturaCierreDeCaja
**Schema table**: `ventas.AperturaCierreDeCaja`

| Field              | Type          | Constraints                                  |
|--------------------|---------------|----------------------------------------------|
| id                 | String        | PK                                           |
| tenantId           | String        | FK Tenant                                    |
| puntoVentaId       | String        | FK PuntosDeVenta (ACTIVO required)           |
| turnoId            | String        | FK TurnosDeAtencion (ACTIVO required)        |
| tenantMemberId     | String        | FK TenantMember                              |
| fecha              | DateTime      | Calendar date (day-level)                    |
| montoIngresos      | Decimal(10,2) | Sum of IngresosCaja, default 0               |
| montoEgresos       | Decimal(10,2) | Sum of EgresosCaja, default 0               |
| montoVentas        | Decimal(10,2) | Sum of ventas efectivo, default 0           |
| montoDescuentos    | Decimal(10,2) | Sum of descuentos, default 0                |
| montoArqueoCaja    | Decimal(10,2) | Monto contado al cerrar, default 0          |
| estadoCaja         | EstadoDeCaja  | APERTURADA \| CERRADA                        |
| createdById        | String?       | Audit                                        |
| updatedById        | String?       | Audit                                        |

**Uniqueness**: `@@unique([tenantId, puntoVentaId, turnoId, tenantMemberId, fecha])` — one open caja per member/punto/turno/day.  
**Derived field**: `efectivoEsperado = montoInicial + montoIngresos - montoEgresos + montoVentas` (computed at close, not stored separately; `montoInicial` is derived from first snapshot — stored as opening balance in `montoIngresos` with motivo "Apertura").  
**State transitions**: APERTURADA → CERRADA (terminal). Closed cajas cannot receive new ventas, ingresos, or egresos.

---

### IngresosCaja
**Schema table**: `ventas.IngresosCaja`

| Field                | Type          | Constraints              |
|----------------------|---------------|--------------------------|
| id                   | String        | PK                       |
| aperturaCierreCajaId | String        | FK AperturaCierreDeCaja  |
| motivo               | String        | Required                 |
| montoIngreso         | Decimal(10,2) | ≥ 0                      |

---

### EgresosCaja
**Schema table**: `ventas.EgresosCaja`

| Field                | Type          | Constraints              |
|----------------------|---------------|--------------------------|
| id                   | String        | PK                       |
| aperturaCierreCajaId | String        | FK AperturaCierreDeCaja  |
| motivo               | String        | Required                 |
| montoEgreso          | Decimal(10,2) | ≥ 0                      |

---

### Venta
**Schema table**: `ventas.Venta`

| Field                | Type                | Constraints                            |
|----------------------|---------------------|----------------------------------------|
| id                   | String              | PK                                     |
| tenantId             | String              | FK Tenant                              |
| puntoVentaId         | String              | FK PuntosDeVenta                       |
| turnoId              | String              | FK TurnosDeAtencion                    |
| tenantMemberId       | String              | FK TenantMember (vendor)               |
| aperturaCierreCajaId | String              | FK AperturaCierreDeCaja (APERTURADA)  |
| fecha                | DateTime            | Default now                            |
| clienteId            | String?             | FK Cliente (optional — registered)     |
| clienteNombre        | String?             | Free-text for ocasional client         |
| clienteTipoDocumento | String?             | Optional                               |
| clienteNroDocumento  | String?             | Optional                               |
| clienteEmail         | String?             | Optional                               |
| totalCantidad        | Int                 | Auto-computed                          |
| totalVenta           | Decimal(10,2)       | Auto-computed                          |
| totalDescuento       | Decimal(10,2)       | Auto-computed                          |
| efectivo             | Decimal(10,2)       | Cash tendered                          |
| diferencia           | Decimal(10,2)       | efectivo - totalVenta (cambio)         |
| tipoPago             | TipoDePago          | EFECTIVO\|QR\|TARJETA_CREDITO\|TARJETA_DEBITO\|OTRO |
| estadoPago           | EstadoDePago        | PAGADO \| EN_ESPERA                    |
| referenciaId         | String?             | pedido.id if from a pedido             |
| referenciaTipo       | ReferenciaTipoVenta | PUNTO_DE_VENTA \| PEDIDO \| OTRO       |
| createdById          | String?             | Audit                                  |
| updatedById          | String?             | Audit                                  |

**Confirmation** triggers: stock decrement on `ProductoVariante` + `MovimientoInventario` (SALIDA) + insumo decrement on `Insumo` + `MovimientoAlmacen` (SALIDA).

---

### VentaDetalle
**Schema table**: `ventas.VentaDetalle`

| Field           | Type          | Constraints                          |
|-----------------|---------------|--------------------------------------|
| id              | String        | PK                                   |
| ventaId         | String        | FK Venta                             |
| productoId      | String        | FK Producto                          |
| varianteId      | String?       | FK ProductoVariante (optional)       |
| etiquetaVariante| String?       | Snapshot of variant label            |
| precioVolumenId | String?       | FK ProductoPrecioVolumen (optional)  |
| etiquetaVolumen | String?       | Snapshot of volume label             |
| precio          | Decimal(10,2) | Price at time of sale                |
| cantidad        | Int           | Units sold                           |
| descuento       | Decimal(10,2) | Per-line discount                    |
| total           | Decimal(10,2) | (precio × cantidad) - descuento      |
| notaVenta       | String?       | Free note                            |

**Uniqueness**: `@@unique([ventaId, productoId, varianteId])`.

---

### Gastos
**Schema table**: `ventas.Gastos`

| Field         | Type          | Constraints              |
|---------------|---------------|--------------------------|
| id            | String        | PK                       |
| tenantId      | String        | FK Tenant                |
| tenantMemberId| String?       | FK TenantMember          |
| fecha         | DateTime      | Required                 |
| motivo        | String        | Required                 |
| totalGasto    | Decimal(10,2) | ≥ 0                      |
| estado        | Estado        | ACTIVO \| ELIMINADO      |
| createdById   | String?       | Audit                    |
| updatedById   | String?       | Audit                    |

---

### Pedido
**Schema table**: `ventas.Pedido`

| Field         | Type          | Constraints                             |
|---------------|---------------|-----------------------------------------|
| id            | String        | PK                                      |
| tenantId      | String        | FK Tenant                               |
| userId        | String        | FK User (public portal user)            |
| fecha         | DateTime      | Default now                             |
| totalCantidad | Int           | Auto-computed                           |
| totalPedido   | Decimal(10,2) | Auto-computed                           |
| respuesta     | String?       | Staff notes on the order                |
| estado        | Estado        | See state machine below                 |
| createdById   | String?       | Audit                                   |
| updatedById   | String?       | Audit                                   |

**State machine** (Estado enum values):

```
PENDIENTE → ELABORADO (EN_PROCESO) → FINALIZADO (COMPLETADO)
PENDIENTE → RECHAZADO (CANCELADO)
ELABORADO → RECHAZADO (CANCELADO)
```

FINALIZADO and RECHAZADO are terminal — no further state changes allowed.

---

### PedidoDetalle
**Schema table**: `ventas.PedidoDetalle`

| Field           | Type          | Constraints                         |
|-----------------|---------------|-------------------------------------|
| id              | String        | PK                                  |
| pedidoId        | String        | FK Pedido                           |
| productoId      | String        | FK Producto                         |
| varianteId      | String?       | FK ProductoVariante (optional)      |
| etiquetaVariante| String?       | Snapshot                            |
| precioVolumenId | String?       | FK ProductoPrecioVolumen (optional) |
| etiquetaVolumen | String?       | Snapshot                            |
| precio          | Decimal(10,2) | Price at order time                 |
| cantidad        | Int           | Units ordered                       |
| total           | Decimal(10,2) | precio × cantidad                   |

**Uniqueness**: `@@unique([pedidoId, productoId, varianteId])`.

---

## Cross-Vertical Entity: ReporteIngreso (DTO only — not a DB model)

Used by the consolidated report use case to unify ventas + consultorio cobros.

| Field     | Type   | Source                              |
|-----------|--------|-------------------------------------|
| id        | String | venta.id or atencion.id             |
| fecha     | DateTime | venta.fecha or atencion.fechaAtencion |
| monto     | Decimal | venta.totalVenta or atencionPago.monto |
| tipoPago  | String | TipoDePago or TipoPagoMedico        |
| estado    | String | EstadoDePago or EstadoAtencion      |
| fuente    | "VENTA" \| "CONSULTORIO" | discriminator field |
| clienteNombre | String? | optional identifier              |
| puntoVentaId  | String? | only for VENTA source            |

---

## Enums (all pre-existing)

- `TipoPuntoDeVenta`: CAJA, SUCURSAL
- `EstadoDeCaja`: APERTURADA, CERRADA
- `TipoDePago`: EFECTIVO, QR, TARJETA_CREDITO, TARJETA_DEBITO, OTRO
- `EstadoDePago`: PAGADO, EN_ESPERA
- `ReferenciaTipoVenta`: PUNTO_DE_VENTA, PEDIDO, VENTA_DIARIA, OTRO
- `Estado` (reused): PENDIENTE, ELABORADO, FINALIZADO, RECHAZADO, ACTIVO, INACTIVO

---

## Key Relationships

```
Tenant
├── PuntosDeVenta (1:N)
├── TurnosDeAtencion (1:N)
├── AperturaCierreDeCaja (1:N)
│   ├── IngresosCaja (1:N)
│   ├── EgresosCaja (1:N)
│   └── Venta (1:N)
│       └── VentaDetalle (1:N)
│           ├── Producto (N:1)
│           └── ProductoVariante (N:1, optional)
├── Venta (1:N, also linked to AperturaCierreDeCaja)
├── Pedido (1:N)
│   └── PedidoDetalle (1:N)
│       └── Producto, ProductoVariante
├── Gastos (1:N)
└── Cliente (1:N, existing) — referenced by Venta.clienteId
```
