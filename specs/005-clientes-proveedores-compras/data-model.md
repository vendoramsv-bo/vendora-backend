# Data Model: Gestión de Clientes, Proveedores y Compras

**Feature**: 005-clientes-proveedores-compras
**Schema**: `ventas` (PostgreSQL)
**Prisma file**: `prisma/50-ventas.prisma` (entities already defined)

## Summary

All entities are already defined in `prisma/50-ventas.prisma`. The only schema change required is adding `CONFIRMADA` to the shared `Estado` enum in `prisma/20-compartido.prisma`.

---

## Entities

### Cliente

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String (cuid) | PK | Auto-generated |
| tenantId | String | FK → Tenant, NOT NULL | Multi-tenancy scope |
| nombre | String | NOT NULL, UNIQUE(tenantId) | |
| email | String? | UNIQUE(tenantId) | Optional |
| direccion | String? | | Optional |
| telefono | String? | | Optional |
| diaNacimiento | Int? | 1–31 | Day only, no year |
| mesNacimiento | Int? | 1–12 | Month only, no year |
| estado | Estado | DEFAULT ACTIVO | ACTIVO / INACTIVO |
| createdAt | DateTime | DEFAULT now() | |
| updatedAt | DateTime? | @updatedAt | |
| createdById | String? | | Audit |
| updatedById | String? | | Audit |

**Unique constraints**: `@@unique([tenantId, nombre])`, `@@unique([tenantId, email])`

**State transitions**:
- ACTIVO → INACTIVO (desactivar)
- INACTIVO → ACTIVO (reactivar)

---

### Proveedor

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String (cuid) | PK | |
| tenantId | String | FK → Tenant, NOT NULL | |
| claProveedorId | String? | | External ref |
| nombre | String | NOT NULL, UNIQUE(tenantId) | |
| direccion | String? | | |
| telefono | String? | | |
| nit | String? | UNIQUE(tenantId) | |
| departamento | String? | | |
| productosOfrece | String? | | Free text |
| sitioWeb | String? | | |
| estado | Estado | DEFAULT ACTIVO | |
| createdAt | DateTime | DEFAULT now() | |
| updatedAt | DateTime? | @updatedAt | |
| createdById | String? | | Audit |
| updatedById | String? | | Audit |

**Relations**:
- `compras Compra[]` — compras registered for this supplier
- `ingresosAlmacen IngresoAlmacen[]` — Feature 004 warehouse entries

**Unique constraints**: `@@unique([tenantId, nombre])`, `@@unique([tenantId, nit])`

**Deletion rule**: Cannot delete if `compras.length > 0` → `ProveedorEnUsoError`

**State transitions**:
- ACTIVO → INACTIVO (desactivar — excluded from new-purchase selector)
- INACTIVO → ACTIVO (reactivar)

---

### Compra

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String (cuid) | PK | |
| tenantId | String | FK → Tenant, NOT NULL | |
| fecha | DateTime | DEFAULT now() | |
| descripcion | String? | | |
| proveedorId | String | FK → Proveedor, NOT NULL | |
| tenantMemberId | String? | FK → TenantMember, OnDelete SetNull | Who created |
| totalCantidad | Int | DEFAULT 0 | Sum of detalle.cantidad |
| totalCompra | Decimal(10,2) | DEFAULT 0 | Sum of detalle.total |
| totalCostoAdicional | Decimal(10,2) | DEFAULT 0 | Sum of costos.costo |
| estado | Estado | DEFAULT PENDIENTE | PENDIENTE / CONFIRMADA |
| createdAt | DateTime | DEFAULT now() | |
| updatedAt | DateTime? | @updatedAt | |
| createdById | String? | | Audit |
| updatedById | String? | | Audit |

**Relations**:
- `comprasDetalle CompraDetalle[]`
- `comprasCostoAdicional CompraCostoAdicional[]`

**State transitions**:
- PENDIENTE → CONFIRMADA (confirmar — irreversible, triggers stock update)

**Deletion rule**: Only in PENDIENTE state; cascade-deletes CompraDetalle and CompraCostoAdicional

---

### CompraDetalle

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String (cuid) | PK | |
| compraId | String | FK → Compra (Cascade) | |
| productoId | String | FK → Producto (Cascade) | |
| varianteId | String? | FK → ProductoVariante (SetNull) | |
| etiquetaVariante | String? | | Snapshot of variant label |
| cantidad | Int | NOT NULL | |
| precio | Decimal(10,2) | DEFAULT 0 | Precio de compra per unit |
| total | Decimal(10,2) | DEFAULT 0 | precio × cantidad |
| precioEstimadoVenta | Decimal(10,2) | DEFAULT 0 | |
| createdAt | DateTime | DEFAULT now() | |
| updatedAt | DateTime? | @updatedAt | |

**Unique constraint**: `@@unique([compraId, productoId, varianteId])`

---

### CompraCostoAdicional

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String (cuid) | PK | |
| compraId | String | FK → Compra (Cascade) | |
| motivo | String | NOT NULL | e.g., "Flete", "Impuesto" |
| costo | Decimal(10,2) | DEFAULT 0 | |
| createdAt | DateTime | DEFAULT now() | |
| updatedAt | DateTime? | @updatedAt | |

**Unique constraint**: `@@unique([compraId, motivo])`

---

## Schema Change Required

### `prisma/20-compartido.prisma` — Estado enum

Add `CONFIRMADA` value:

```prisma
enum Estado {
  PENDIENTE
  ACTIVO
  INACTIVO
  SUSPENDIDO
  ELIMINADO
  FINALIZADO
  ACEPTADO
  RECHAZADO
  APROBADO
  PUBLICADO
  ELABORADO
  VENDIDO
  CONFIRMADA   // ← NEW — for Compra state transition
  @@schema("compartido")
}
```

---

## Cross-Module Relationship

### Stock update on `confirmar`

When `Compra` transitions from PENDIENTE → CONFIRMADA:

For each `CompraDetalle` line:
- If `varianteId` is set AND `ProductoVariante.inventarioActivado = true`:
  - `ProductoVariante.cantidadStock += CompraDetalle.cantidad`
  - Create `MovimientoInventario { tipo: ENTRADA, varianteId, cantidad, stockAntes, stockDespues, compraId (as referencia) }`
- If `varianteId` is set AND `inventarioActivado = false`:
  - Add to `advertencias[]`, skip stock update for this line
- If `varianteId` is null (product-only line):
  - Skip stock update (no variant-level inventory tracking without varianteId)

All within a single `$transaction`.

---

## Entity Relationship Summary

```
Tenant
├── Cliente[] (tenantId)
├── Proveedor[]
│   ├── Compra[] (proveedorId)
│   │   ├── CompraDetalle[] → Producto, ProductoVariante?
│   │   └── CompraCostoAdicional[]
│   └── IngresoAlmacen[] (Feature 004)
```
