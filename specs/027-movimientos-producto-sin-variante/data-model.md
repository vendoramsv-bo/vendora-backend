# Data Model: Movimientos de inventario de productos con y sin variante

**Feature**: `027-movimientos-producto-sin-variante` | **Fecha**: 2026-10-05

## Cambio de schema

Ninguna columna nueva. Cambia una restricción:

```sql
-- migración <ts>_movimiento_inventario_nulls_not_distinct
DROP INDEX "almacen"."MovimientoInventario_tenantId_productoId_varianteId_tipo_re_key";
CREATE UNIQUE INDEX "MovimientoInventario_tenantId_productoId_varianteId_tipo_re_key"
  ON "almacen"."MovimientoInventario" ("tenantId", "productoId", "varianteId", "tipo", "referenciaId")
  NULLS NOT DISTINCT;
```

Mismo nombre, para que Prisma siga reconociendo su `@@unique`. En
`prisma/40-almacen.prisma` se agrega un comentario sobre el `@@unique` que remite a esta
migración.

## `MovimientoInventario` — reglas

| Regla | Detalle |
|---|---|
| Unicidad | `(tenantId, productoId, varianteId, tipo, referenciaId)` con `NULLS NOT DISTINCT`: un producto simple tampoco puede tener dos movimientos del mismo tipo para la misma referencia |
| `cantidad` | **Delta con signo**: `stockDespues − stockAntes`. SALIDA < 0, CREACION = 0, AJUSTE y RECUENTO con su signo |
| `varianteId` | `NULL` para productos simples |
| `etiquetaVariante` | Se completa en la SALIDA de una variante si la línea de venta la trae |
| Inmutabilidad | Una vez insertado no se actualiza. El reintento no lo toca (`insertado: false`) |

### `referenciaId` por tipo

| Tipo | `referenciaId` | Lo escribe |
|---|---|---|
| CREACION | `init-<productoId>` / `init-<varianteId>` | inicialización individual y masiva |
| SALIDA | `ventaId` | salida por venta (único camino) |
| AJUSTE | `ajusteId` | aprobación de ajuste |
| RECUENTO | `recuentoId` | aprobación de recuento |
| ENTRADA | `compraId` | confirmación de compra (`compra.prisma.repository`), solo líneas con variante e inventario activado; `cantidad` = delta positivo. No toca productos simples ni recalcula el padre (fuera de alcance) |

## Helper `registrarMovimiento`

```ts
// almacen/infrastructure/movimiento-inventario.writer.ts
registrarMovimiento(tx, {
  tenantId, productoId, varianteId: string | null, etiquetaVariante?: string | null,
  tipo, stockAntes, stockDespues, motivo?: string | null, referenciaId, createdById?: string | null,
}): Promise<{ insertado: boolean }>
// cantidad = stockDespues − stockAntes, calculada adentro: nadie la pasa a mano
```

## Flujo por operación

| Operación | Orden dentro de la transacción |
|---|---|
| Salida por venta (por línea) | 1. `SELECT cantidadStock … FOR UPDATE` con `tenantId` · 2. `registrarMovimiento` · 3. si `insertado`: `decrement` (+ recalcular el padre si es variante) |
| Aprobar ajuste / recuento | Igual que hoy (pre-chequeo, `estado`/`version`). El `upsert` se reemplaza por `registrarMovimiento`, y si `insertado` se actualiza el stock |
| Inicializar producto simple | `registrarMovimiento(CREACION, stockAntes = stockDespues = stock actual)`. **No toca el stock** |
| Inicializar variante | Si `inventarioActivado = false`: activar + stock 0 + `registrarMovimiento(CREACION)`. Igual que hoy |

## `ventas` — nuevo en el puerto del repositorio

```ts
// IVentaRepository
productosQueRequierenVariante(tenantId: string, productoIds: string[]): Promise<string[]>
// productos de la lista con al menos una variante en estado ACTIVO
```

Error de dominio: `VarianteRequeridaError` (`code: "VARIANTE_REQUERIDA"`, HTTP 422,
expone `productoIds`).

## `confirmar` (venta)

| Hoy | Después |
|---|---|
| Descuenta el stock de variantes con inventario activado y escribe una SALIDA `+cantidad` | **No toca** el stock de productos ni de variantes. No escribe `MovimientoInventario` |
| Descuenta los insumos de la receta | Sin cambios (fuera de alcance, research §7) |
| Actualiza el estado de pago y la caja | Sin cambios |
