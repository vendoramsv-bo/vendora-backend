# Research: Sistema de Ventas y Caja

**Feature**: 006-ventas-caja  
**Date**: 2026-05-24

## Decision 1: Pedido State Mapping

**Decision**: Map pedido lifecycle to existing `Estado` enum values rather than creating a new enum.

| Spec state   | Estado value used | Rationale                              |
|--------------|-------------------|----------------------------------------|
| PENDIENTE    | PENDIENTE         | Direct match — default on creation     |
| EN_PROCESO   | ELABORADO         | Closest semantic match ("being worked") |
| COMPLETADO   | FINALIZADO        | "Finished" aligns with COMPLETADO      |
| CANCELADO    | RECHAZADO         | Negation/terminal — avoids new enum change |

**Rationale**: No Prisma migration required; all values already exist in `compartido.Estado`. Domain layer will use descriptive constants (`ESTADO_PEDIDO`) to avoid raw string magic.  
**Alternatives considered**: Adding EN_PROCESO/CANCELADO to `Estado` enum (requires migration, breaks other models); creating `EstadoPedido` enum in ventas schema (requires migration, adds complexity).

---

## Decision 2: Venta Confirmation — Stock & Insumos Decrement

**Decision**: All stock decrements execute atomically inside a single Prisma `$transaction` in `VentaPrismaRepository.confirmar()`.

**Approach** (mirrors `confirmar-compra` in Feature 005):
1. For each `VentaDetalle`, if `variante.inventarioActivado === true`:
   - Decrement `ProductoVariante.cantidadStock` by `detalle.cantidad`
   - Create `MovimientoInventario` (type: `SALIDA`, referenciaId: ventaId)
2. For same `VentaDetalle`, query `ProductoInsumo` where `productoId = detalle.productoId AND (varianteId = detalle.varianteId OR varianteId IS NULL)`:
   - For each insumo: decrement `Insumo.cantidadStock` by `(detalle.cantidad × insumo.cantidad)`
   - Create `MovimientoAlmacen` (type SALIDA, referenciaId: ventaId)
3. Update `Venta.estadoPago` (and optionally mark `AperturaCierreDeCaja.montoVentas` if efectivo)

**Note**: Stock negativo is permitted per spec assumption. No pre-check for sufficient stock.  
**Alternatives considered**: Separate use cases for stock and insumos (violates atomicity); async BullMQ job (eventual consistency risk for financial records).

---

## Decision 3: Consolidated Report — Cross-Schema Approach

**Decision**: Application-layer merge via parallel queries, not a database-level JOIN.

**Approach**:
1. `IReporteRepository.getConsolidado(tenantId, filters)` queries:
   - `Venta` (schema `ventas`) — module ventas
   - `AtencionMedica` + `AtencionPago` (schema `consultorio`) — only if tenant has `esConsultorio = true`
2. Both queries return a `ReporteIngreso` DTO with common fields: `id, fecha, monto, fuente: "VENTA"|"CONSULTORIO", tipoPago, estado`
3. Application sorts the merged array by `fecha` descending and paginates in memory
4. For large result sets (>10k), queries use date range filters pushed down to DB

**Rationale**: Prisma does not support cross-schema JOINs natively. Application-layer merge is the canonical pattern for cross-vertical aggregation in this codebase. Respects tenant vertical flags.  
**Alternatives considered**: Raw SQL cross-schema JOIN (breaks ORM abstraction, schema-dependent); dedicated `reporte` schema materialized view (requires migration and background sync).

---

## Decision 4: AperturaCierreDeCaja — Uniqueness and Concurrency

**Decision**: Use Prisma's `@@unique([tenantId, puntoVentaId, turnoId, tenantMemberId, fecha])` constraint (already in schema) as the database-level guard. Application layer does a pre-flight `findFirst` check to return a `CajaYaAbiertaError` before hitting the constraint.

**Rationale**: The unique constraint is already in `50-ventas.prisma`. `fecha` is the calendar date (truncated to day at application layer before persisting). Concurrent requests that bypass the app check will fail at the DB constraint, returning a 409.

---

## Decision 5: Pedido → Venta Conversion

**Decision**: `convertirPedidoEnVenta` creates a `Venta` with `referenciaId: pedido.id` and `referenciaTipo: PEDIDO`, copying all `PedidoDetalle` into `VentaDetalle`. Pedido estado → FINALIZADO. The venta is created in PAGADO state (pending staff confirmation of payment if QR/card).

**Rationale**: `Venta.referenciaId` + `referenciaTipo` are already modeled for this use case. Conversion does not auto-confirm the venta (no stock decrement yet) — staff explicitly confirms via the venta confirmation endpoint.

---

## Decision 6: Notificador Port Extension

**Decision**: Extend `IVentasNotificador` (and its implementations) with new event methods rather than creating a separate `ICajaNotificador`.

New events added:
- `ventaCreada(tenantId, payload)`
- `cajaAbierta(tenantId, payload)`
- `cajaCerrada(tenantId, payload)`
- `pedidoActualizado(tenantId, payload)`

**Rationale**: The NullImpl + SocketImpl + provider pattern already exists; adding methods is less disruptive than new ports. All events belong to the "ventas" bounded context.

---

## No-Schema-Change Confirmation

All Prisma models needed for this feature already exist in `50-ventas.prisma`:
- `PuntosDeVenta`, `TurnosDeAtencion`, `AperturaCierreDeCaja`, `IngresosCaja`, `EgresosCaja`
- `Venta`, `VentaDetalle`, `Gastos`, `Pedido`, `PedidoDetalle`

No new models or enum additions required. No Prisma migration needed for this feature's schema layer.
