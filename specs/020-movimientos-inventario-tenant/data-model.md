# Data Model: Movimientos de inventario a nivel tenant

**Feature**: `020-movimientos-inventario-tenant` | **Fecha**: 2026-10-01

## Cambios de schema

Solo índices. Ninguna columna nueva.

```prisma
model MovimientoInventario {
  // …sin cambios…
  @@index([tenantId, createdAt])
}

model MovimientoAlmacen {
  // …sin cambios…
  @@index([tenantId, createdAt])
}
```

## Fuentes (existentes, solo lectura)

| | `MovimientoAlmacen` (insumos) | `MovimientoInventario` (variantes) |
|---|---|---|
| Entidad | `insumoId` → `Insumo.nombre` | `productoId` → `Producto.nombre`, `varianteId?`, `etiquetaVariante?` |
| `tipo` | `TipoMovimientoAlmacen`: CREACION, **INGRESO**, SALIDA, AJUSTE, RECUENTO | `TipoMovimiento`: CREACION, **ENTRADA**, SALIDA, AJUSTE, RECUENTO |
| `cantidad` | `Decimal(10,4)` | `Int` |
| Comunes | `stockAntes`, `stockDespues`, `motivo?`, `referenciaId?`, `createdById?`, `createdAt` | ídem |

## Vista de lectura: `MovimientoTenant` (value object, no persistido)

Fila del listado tenant. Se construye en el `UNION ALL` y se tipa en
`domain/movimiento-tenant.ts`.

| Campo | Tipo | Origen INSUMO | Origen VARIANTE |
|---|---|---|---|
| `id` | string | `m.id` | `m.id` |
| `origen` | `"INSUMO" \| "VARIANTE"` | literal | literal |
| `insumoId` | string \| null | `m.insumoId` | `null` |
| `productoId` | string \| null | `null` | `m.productoId` |
| `varianteId` | string \| null | `null` | `m.varianteId` (null si la variante se borró) |
| `nombreEntidad` | string | `Insumo.nombre` | `Producto.nombre` |
| `etiquetaVariante` | string \| null | `null` | `m.etiquetaVariante` |
| `tipo` | `TipoMovimientoTenant` | `INGRESO` → `ENTRADA`; resto igual | igual |
| `cantidad` | number | `Decimal` → number | `Int` |
| `stockAntes` / `stockDespues` | number | | |
| `motivo` / `referenciaId` | string \| null | | |
| `createdAt` | string (ISO 8601) | | |

`TipoMovimientoTenant = "CREACION" | "ENTRADA" | "SALIDA" | "AJUSTE" | "RECUENTO"`

Cumple FR-003 (`origen` + ids + `nombreEntidad`) y FR-004 (`tipo`, `cantidad`,
`stockDespues`, `createdAt`).

## Parámetros de consulta

| Endpoint | `orderBy` | `filterField` | `search` |
|---|---|---|---|
| `GET /movimientos` (nuevo) | `tipo`, `cantidad`, `createdAt` | `origen`, `tipo`, `motivo`, `cantidad`, `createdAt` | `motivo`, `nombreEntidad` |
| `GET /insumos/{id}/movimientos` | `tipo`, `cantidad`, `motivo`, `createdAt` (sin cambio) | **acotado** a los mismos 4 (antes: string libre) | `motivo` (sin cambio) |
| `GET /variantes/{varianteId}/movimientos` | ídem | ídem | ídem |

Comunes (de `makeQueryParamsSchema`): `take` 1..100 (def. 20), `skip` ≥ 0,
`order` asc|desc (def. desc), `filterOp` ∈ equals|contains|startsWith|endsWith|gt|gte|lt|lte.

**Conversión de `filterValue`**: `cantidad` → número; `createdAt` → fecha ISO;
`origen`/`tipo` → deben pertenecer a su enum. Un valor inválido → 400.

**Desempate de orden**: siempre se agrega `id` en la misma dirección, para que el
orden sea total (necesario para que el offset sea estable).

## Puerto

```ts
// domain/ports/IMovimientoTenantRepository.ts
export interface IMovimientoTenantRepository {
  listar(tenantId: string, params: QueryParamsMovimientosTenant):
    Promise<{ data: MovimientoTenant[]; total: number }>
}
```

El caso de uso `ListarMovimientosTenantUseCase` delega en el puerto y envuelve con
`paginate()`, igual que `ListarMovimientosInsumoUseCase`.
