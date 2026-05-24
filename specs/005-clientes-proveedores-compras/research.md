# Research: Gestión de Clientes, Proveedores y Compras

**Feature**: 005-clientes-proveedores-compras
**Date**: 2026-05-23

## Decision 1: Module placement — new `ventas` module

**Decision**: Create `src/modules/ventas/` as a new hexagonal module within the existing monolith.

**Rationale**: The `ventas` module already exists in the PostgreSQL schema (`@@schema("ventas")` in `prisma/50-ventas.prisma`) and is listed in the constitution (Artículo II.2) as part of the nucleus compartido. The Prisma models `Cliente`, `Proveedor`, `Compra`, `CompraDetalle`, `CompraCostoAdicional` are already fully defined there. No new schema file is needed — only one small enum addition.

**Alternatives considered**: Adding clientes/proveedores/compras to the `catalogo` module was rejected — different domain concern. Adding them to `almacen` was rejected — almacen is a distinct vertical.

---

## Decision 2: Estado enum — add CONFIRMADA

**Decision**: Add `CONFIRMADA` to the shared `Estado` enum in `prisma/20-compartido.prisma`.

**Rationale**: The `Compra` model uses `estado Estado @default(PENDIENTE)`. The feature requires a CONFIRMADA state (explicitly specified in spec). No existing enum value (`ACEPTADO`, `APROBADO`, `FINALIZADO`) captures the business semantics of a purchase receipt confirmation with clarity.

**Alternatives considered**: Using `FINALIZADO` — rejected, semantically ambiguous across other models that use the same enum. Using a new `EstadoCompra` enum — rejected, would require schema change AND adds unnecessary complexity when the shared Estado enum already serves this purpose.

---

## Decision 3: Stock update on confirmar — direct Prisma in repository $transaction

**Decision**: `ComprasPrismaRepository.confirmar()` handles the full stock update within a single `$transaction` directly via Prisma, without going through the `IInventarioProductoRepository` port.

**Rationale**: The stock update on purchase confirmation is a single atomic write: update `ProductoVariante.cantidadStock` + create `MovimientoInventario(tipo=ENTRADA)` + update `Compra.estado`. Routing this through the almacen module's port would introduce a cross-module dependency at runtime (the ventas module would need an injected almacen port). Keeping it in the Prisma repository keeps the transaction local and boundary-respecting. The Constitution (Artículo II.1) states "Las dependencias entre módulos son explícitas y unidireccionales" — ventas can read almacen schema tables directly (unidirectional: ventas → almacen) but should not call almacen's ports at runtime.

**Alternatives considered**: Injecting `IInventarioProductoRepository` into `ConfirmarCompraUseCase` — rejected, creates runtime cross-module port coupling. Using a BullMQ job post-confirmation — rejected, breaks atomicity requirement (SC-003).

**Implementation note**: `MovimientoInventario.tipo = ENTRADA` (already in `TipoMovimiento` enum). Only variants with `inventarioActivado = true` get their stock updated; others produce a warning in the result.

---

## Decision 4: IVentasNotificador port — new notificador following existing pattern

**Decision**: Create `IVentasNotificador` port with methods for client, supplier, and purchase events. Follow identical pattern as `ICatalogoNotificador` and `IAlmacenNotificador`.

**Events**:
- `ventas:cliente:creado`
- `ventas:cliente:actualizado`
- `ventas:proveedor:creado`
- `ventas:proveedor:actualizado`
- `ventas:compra:creada`
- `ventas:compra:actualizada`
- `ventas:compra:confirmada`

**Rationale**: Constitution Artículo VI.2 requires events from the application layer via a Notificador port. Null impl at startup, replaced by Socket.IO impl in `server/index.ts`. Consistent with all other modules.

---

## Decision 5: Proveedor shared with almacen IngresoAlmacen

**Decision**: The `Proveedor` entity in the `ventas` schema is the same entity used by `IngresoAlmacen` (Feature 004). No separate Proveedor entity is created for almacen.

**Rationale**: The Prisma schema already defines `Proveedor` with `ingresosAlmacen IngresoAlmacen[]` relation. When Feature 004 (almacen) validates a `proveedorId`, it queries `ventas.Proveedor`. This means Feature 005 implements the full CRUD for the entity that Feature 004 already uses.

**Impact**: Feature 004 (`RegistrarIngresoUseCase`) validates proveedorId against the `Proveedor` table. Feature 005's `IProveedorRepository` is the canonical source for this validation. If a proveedor is deactivated, Feature 004's IngresoAlmacen validation may return 404 — acceptable behavior per spec.

---

## Decision 6: Compra deletion — only PENDIENTE

**Decision**: Compras can only be deleted when in `PENDIENTE` state. `ConfirmarCompra` is irreversible.

**Rationale**: Spec explicitly states CONFIRMADA is terminal; no cancellation or reversal in scope. Cascade delete on `CompraDetalle` and `CompraCostoAdicional` is already configured in the schema.

---

## Decision 7: Router mounting path

**Decision**: Mount `ventasApp` at `/api/ventas` in `src/server/hono.ts`.

**Rationale**: Consistent with `/api/almacen`, `/api/catalogo`, `/api/consultorio`. Endpoints will be:
- `GET/POST /api/ventas/clientes`
- `GET/PATCH/DELETE /api/ventas/clientes/:id`
- `PATCH /api/ventas/clientes/:id/estado`
- `GET/POST /api/ventas/proveedores`
- `GET/PATCH/DELETE /api/ventas/proveedores/:id`
- `PATCH /api/ventas/proveedores/:id/estado`
- `GET/POST /api/ventas/compras`
- `GET/PATCH/DELETE /api/ventas/compras/:id`
- `POST /api/ventas/compras/:id/confirmar`
- `POST /api/ventas/compras/:id/detalles` / `PATCH/DELETE /api/ventas/compras/:id/detalles/:detalleId`
- `POST /api/ventas/compras/:id/costos` / `PATCH/DELETE /api/ventas/compras/:id/costos/:costoId`
