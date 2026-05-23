# Socket.IO Events Contract: Inventario y Almacén

**Sala**: `tenant:${tenantId}` (aislamiento total por tenant)
**Emisión**: Desde los casos de uso via `IAlmacenNotificador`

---

## Eventos Server → Client

### `almacen:stock:critico`
Emitido cuando el stock de una variante de producto cae por debajo de su `stockMinimo` tras registrar un movimiento.

```typescript
interface StockCriticoPayload {
  productoId: string
  productoNombre: string
  varianteId: string
  varianteSku: string | null
  stockActual: number
  stockMinimo: number
  tenantId: string
}
```

**Cuándo se emite**: Al registrar cualquier movimiento (ajuste, consumo, salida por receta) que deja `cantidadStock < stockMinimo`.
**No se re-emite**: Mientras el stock sigue bajo el mínimo sin nuevos movimientos.

---

### `almacen:stock:normalizado`
Emitido cuando el stock de una variante que estaba en estado crítico vuelve a `stockActual >= stockMinimo`.

```typescript
interface StockNormalizadoPayload {
  productoId: string
  productoNombre: string
  varianteId: string
  varianteSku: string | null
  stockActual: number
  stockMinimo: number
  tenantId: string
}
```

**Cuándo se emite**: Al registrar entrada o ajuste positivo que eleva el stock por encima del mínimo cuando antes estaba por debajo.

---

### `almacen:insumo:stock:critico`
Emitido cuando el stock de un insumo cae por debajo de su `stockMinimo`.

```typescript
interface InsumoStockCriticoPayload {
  insumoId: string
  insumoNombre: string
  stockActual: number
  stockMinimo: number
  tenantId: string
}
```

**Cuándo se emite**: Al registrar movimiento (salida, ajuste negativo) que deja `cantidadStock < stockMinimo`.

---

### `almacen:insumo:stock:normalizado`
Emitido cuando el stock de un insumo que estaba en estado crítico vuelve a `cantidadStock >= stockMinimo`.

```typescript
interface InsumoStockNormalizadoPayload {
  insumoId: string
  insumoNombre: string
  stockActual: number
  stockMinimo: number
  tenantId: string
}
```

**Cuándo se emite**: Al registrar ingreso o ajuste positivo que normaliza el stock.

---

## Reglas de Emisión

1. Los eventos se emiten **desde los casos de uso** vía `IAlmacenNotificador`, no desde los adaptadores REST.
2. La comparación antes/después del movimiento determina si emitir: si `stockAntes >= stockMinimo AND stockDespues < stockMinimo` → emitir `critico`; si `stockAntes < stockMinimo AND stockDespues >= stockMinimo` → emitir `normalizado`.
3. Los eventos de insumo siguen la misma lógica con `MovimientoAlmacen`.
4. El aislamiento por tenant es garantizado por la sala `tenant:${tenantId}`.
5. Los eventos son informativos: el cliente actualiza su UI pero no modifica estado en el backend.
