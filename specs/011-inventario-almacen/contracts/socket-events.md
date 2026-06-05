# Socket.IO Events: Inventario y Almacén

**Branch**: `011-inventario-almacen` | **Date**: 2026-05-26

Los eventos de tiempo real del módulo `almacen` no cambian de contrato en esta feature. Solo se extiende el origen de los eventos: antes los emitía `registrarAjuste` y `crearIngreso/Salida`; ahora los emiten `aprobarAjuste`, `aprobarRecuento`, `aprobarIngreso` y `aprobarSalida`.

## Eventos server → client

### `almacen:stock-critico`

Se emite cuando el stock de un producto o variante cae por debajo de su `stockMinimo` tras aprobar un ajuste, recuento, o registrar una salida de venta.

**Sala**: `tenant:${tenantId}`

```ts
{
  productoId: string
  productoNombre: string
  varianteId?: string
  varianteSku?: string | null
  stockActual: number
  stockMinimo: number
  tenantId: string
}
```

### `almacen:stock-normalizado`

Se emite cuando el stock de un producto o variante supera o iguala su `stockMinimo` tras aprobar un ajuste o recuento.

**Sala**: `tenant:${tenantId}` — mismo payload que `stock-critico`

### `almacen:insumo-stock-critico`

Se emite cuando el stock de un insumo cae por debajo de su `stockMinimo` tras aprobar una salida de almacén.

**Sala**: `tenant:${tenantId}`

```ts
{
  insumoId: string
  insumoNombre: string
  stockActual: number
  stockMinimo: number
  tenantId: string
}
```

### `almacen:insumo-stock-normalizado`

Se emite cuando el stock de un insumo supera o iguala su `stockMinimo` tras aprobar un ingreso de almacén.

**Sala**: `tenant:${tenantId}` — mismo payload que `insumo-stock-critico`

## Aislamiento de tenant

El `IAlmacenNotificador` existente ya usa `io.to(\`tenant:${tenantId}\`)`, garantizando que los eventos de un tenant nunca llegan a usuarios de otro tenant (FR-018).
