# Data Model: Inventario de Productos y Almacén de Insumos

**Branch**: `011-inventario-almacen` | **Date**: 2026-05-26  
**Schema Prisma**: `almacen` (`prisma/40-almacen.prisma`) + cross-schema `catalogo`

---

## Cambios al schema Prisma

Solo se agregan campos a modelos existentes. No se crean nuevos modelos.

### AjusteInventario — agregar campo `version`

```prisma
model AjusteInventario {
  // ... campos existentes ...
  version   Int   @default(0)   // [NEW] Bloqueo optimista (FR-023)
}
```

**Semántica**: La aprobación compara el `version` del payload con el `version` en BD. Si no coinciden, se lanza `ConflictoVersionError`. Al aprobar, el campo se incrementa en 1.

### RecuentoInventario — agregar campo `version`

```prisma
model RecuentoInventario {
  // ... campos existentes ...
  version   Int   @default(0)   // [NEW] Bloqueo optimista (FR-023)
}
```

### IngresoAlmacen — agregar campo `version`

```prisma
model IngresoAlmacen {
  // ... campos existentes ...
  version   Int   @default(0)   // [NEW] Bloqueo optimista (FR-023)
}
```

### SalidaAlmacen — agregar campos `version` y `motivo`

```prisma
model SalidaAlmacen {
  // ... campos existentes ...
  motivo    String?              // [NEW] Motivo obligatorio para salidas manuales (FR-012)
  version   Int   @default(0)   // [NEW] Bloqueo optimista (FR-023)
}
```

---

## Modelos sin cambios de schema (ya satisfacen el spec)

### MovimientoInventario ✅

```prisma
model MovimientoInventario {
  tenantId     String
  productoId   String
  varianteId   String?
  tipo         TipoMovimiento     // CREACION | ENTRADA | SALIDA | AJUSTE | RECUENTO
  cantidad     Int                // positivo o negativo
  motivo       String?
  referenciaId String?            // ID del AjusteInventario, RecuentoInventario, Venta, etc.
  stockAntes   Int
  stockDespues Int
  createdById  String?
  @@unique([tenantId, productoId, varianteId, tipo, referenciaId])  // Idempotencia (FR-003)
}
```

**Idempotencia**: La restricción `@@unique` ya garantiza que no puede haber dos movimientos para la misma combinación. El repositorio usa `upsert` en lugar de `create` para el comportamiento de "actualizar en lugar de duplicar".

### AjusteInventario y AjusteDetalle ✅ (con `version` nuevo)

Estado máquina: `PENDIENTE` → `APROBADO`

- Creación: `estado = PENDIENTE`, `version = 0`
- Actualización (mientras PENDIENTE): campos editables, `version` no cambia
- Aprobación: verifica `version`, aplica stock, `estado = APROBADO`, `version++`

`AjusteDetalle` rastrea por línea: `productoId`, `varianteId?`, `cantidadAjuste`, `stockAnterior`, `stockDespues`.

### RecuentoInventario y RecuentoDetalle ✅ (con `version` nuevo)

Estado máquina: `PENDIENTE` → `APROBADO`

`RecuentoDetalle` rastrea: `stockSistema` (al momento de crear el borrador), `stockFisico` (ingresado por operador), `diferencia = stockFisico - stockSistema`.

### IngresoAlmacen e IngresoDetalle ✅ (con `version` nuevo)

Estado máquina: `PENDIENTE` → `APROBADO`

`IngresoDetalle` rastrea: `insumoId`, `cantidad`, `costoUnitario`, `lote?`, `fechaVencimiento?`.

### SalidaAlmacen y SalidaDetalle ✅ (con `version` y `motivo` nuevos)

Estado máquina: `PENDIENTE` → `APROBADO`

`SalidaDetalle` rastrea: `insumoId`, `cantidad`.

### MovimientoAlmacen ✅

```prisma
model MovimientoAlmacen {
  tenantId     String
  insumoId     String
  tipo         TipoMovimientoAlmacen   // CREACION | INGRESO | SALIDA | AJUSTE | RECUENTO
  cantidad     Decimal
  motivo       String?
  referenciaId String?                 // ID del IngresoAlmacen o SalidaAlmacen
  stockAntes   Int
  stockDespues Int
  @@unique([tenantId, insumoId, tipo, referenciaId])  // Idempotencia (FR-024)
}
```

---

## Stock de productos — cross-schema `catalogo`

El stock de productos y variantes vive en el schema `catalogo` (campos existentes):

| Modelo | Campo | Descripción |
|---|---|---|
| `Producto` | `cantidadStock Int @default(0)` | Stock agregado del producto (suma de variantes) |
| `Producto` | `stockMinimo Int @default(0)` | Stock mínimo del producto |
| `ProductoVariante` | `cantidadStock Int @default(0)` | Stock de la variante específica |
| `ProductoVariante` | `stockMinimo Int @default(0)` | Stock mínimo de la variante |
| `ProductoVariante` | `inventarioActivado Boolean @default(false)` | Si el stock fue inicializado |

**Regla FR-007**: Cuando se aprueba un ajuste o recuento sobre una variante, el sistema actualiza `ProductoVariante.cantidadStock` y recalcula `Producto.cantidadStock = SUM(ProductoVariante.cantidadStock WHERE productoId = X AND inventarioActivado = true)`.

**Regla FR-020/FR-021**: Al auto-inicializar, se pone `inventarioActivado = true` y `cantidadStock = 0` para todos los productos/variantes del tenant.

---

## Nuevo puerto cross-módulo: IAlmacenInventarioPort

Definido en el módulo `ventas`, implementado por `almacen`:

```ts
// src/modules/ventas/domain/ports/IAlmacenInventarioPort.ts
export interface SalidaVentaDetalle {
  productoId: string
  varianteId?: string
  cantidad: number
}

export interface IAlmacenInventarioPort {
  registrarSalidaVenta(
    ventaId: string,
    tenantId: string,
    detalles: SalidaVentaDetalle[]
  ): Promise<void>
  
  inicializarProducto(
    tenantId: string,
    productoId: string,
    varianteId?: string
  ): Promise<void>
}
```

---

## Enums — sin cambios

El enum `Estado` ya tiene los valores necesarios:

```prisma
enum Estado {
  PENDIENTE   // = borrador
  APROBADO    // = aprobado (draft-approve completado)
  ACTIVO      // = otros usos existentes
  // ... resto de valores
}
```

```prisma
enum TipoMovimiento {
  CREACION | ENTRADA | SALIDA | AJUSTE | RECUENTO
}

enum TipoMovimientoAlmacen {
  CREACION | INGRESO | SALIDA | AJUSTE | RECUENTO
}
```

---

## Invariantes del dominio

1. Un documento en estado `APROBADO` es inmutable — no puede editarse ni re-aprobarse (FR-022, Assumptions).
2. La aprobación es atómica — stock + movimiento en una sola transacción Prisma (FR-014).
3. La aprobación usa bloqueo optimista — si `version` en payload ≠ `version` en BD, se rechaza con `ConflictoVersionError` (FR-023).
4. Stock negativo rechazado — si `stockActual + cantidadAjuste < 0` para cualquier ítem, se rechaza toda la operación antes de iniciar la transacción (FR-006, FR-013).
5. Movimientos idempotentes — `upsert` con clave `@@unique` en `MovimientoInventario` y `MovimientoAlmacen` (FR-003, FR-024).
6. Stock de producto padre = suma de variantes — se recalcula en la misma transacción de aprobación (FR-007).
