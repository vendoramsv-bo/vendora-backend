# Contrato: operaciones de movimientos de inventario

Las tres operaciones están bajo `almacenApp` (`/api/almacen`), que exige sesión válida
y tenant activo. Todas son `GET`, solo lectura.

## Forma paginada común — `paginadoSchema(item)`

Nuevo helper en `src/core/openapi-responses.ts`. Describe lo que `paginate()` ya devuelve:

```ts
{
  data: Item[]
  total: number
  page: number
  take: number
  totalPaginas: number
  hayPaginaSiguiente: boolean
  hayPaginaAnterior: boolean
}
```

## Errores (las tres operaciones)

| Status | Cuándo | Cuerpo |
|---|---|---|
| 400 | Query inválida: `take > 100`, `filterField`/`orderBy` fuera de la lista, `filterValue` no convertible | validación de `@hono/zod-openapi` |
| 401 | Sin sesión | `{ error: "UNAUTHORIZED", message }` |
| 400 | Sin tenant activo | `{ error: "SIN_TENANT_ACTIVO", message }` |

Un tenant sin movimientos → **200** con `data: []`, `total: 0` (FR-010).

---

## 1. `GET /api/almacen/movimientos` — NUEVO (US1)

`operationId: almacen_listar_movimientos_tenant` · tag `Almacén`

**Query**

| Param | Tipo | Default | Notas |
|---|---|---|---|
| `take` | int 1..100 | 20 | |
| `skip` | int ≥ 0 | 0 | |
| `orderBy` | `tipo \| cantidad \| createdAt` | `createdAt` | desempate por `id` |
| `order` | `asc \| desc` | `desc` | |
| `search` | string | — | ILIKE sobre `motivo` y `nombreEntidad` |
| `filterField` | `origen \| tipo \| motivo \| cantidad \| createdAt` | — | |
| `filterOp` | `equals \| contains \| startsWith \| endsWith \| gt \| gte \| lt \| lte` | — | |
| `filterValue` | string | — | convertido según el campo |

**200** → `paginadoSchema(MovimientoTenantSchema)`

```ts
MovimientoTenantSchema = {
  id: string
  origen: "INSUMO" | "VARIANTE"
  insumoId: string | null
  productoId: string | null
  varianteId: string | null
  nombreEntidad: string
  etiquetaVariante: string | null
  tipo: "CREACION" | "ENTRADA" | "SALIDA" | "AJUSTE" | "RECUENTO"
  cantidad: number
  stockAntes: number
  stockDespues: number
  motivo: string | null
  referenciaId: string | null
  createdAt: string            // ISO 8601
}
```

**Ejemplo**

```http
GET /api/almacen/movimientos?take=2&filterField=origen&filterOp=equals&filterValue=INSUMO
```
```json
{
  "data": [
    { "id": "cm1…", "origen": "INSUMO", "insumoId": "cm9…", "productoId": null,
      "varianteId": null, "nombreEntidad": "Harina 000", "etiquetaVariante": null,
      "tipo": "ENTRADA", "cantidad": 25, "stockAntes": 10, "stockDespues": 35,
      "motivo": "Ingreso INS-0042", "referenciaId": "cm7…", "createdAt": "2026-09-30T14:02:11.000Z" }
  ],
  "total": 1, "page": 1, "take": 2, "totalPaginas": 1,
  "hayPaginaSiguiente": false, "hayPaginaAnterior": false
}
```

---

## 2. `GET /api/almacen/insumos/{id}/movimientos` — contrato corregido (US2)

`operationId: almacen_listar_movimientos_insumo` (sin cambio)

**Antes**: `request: { params }` · respuesta `{ data: Record<string, unknown>[] }`.
**Después**: `request: { params, query: QueryParamsMovimientosSchema }` · respuesta
`paginadoSchema(MovimientoInsumoSchema)`.

Query: `take`, `skip`, `orderBy ∈ {tipo, cantidad, motivo, createdAt}`, `order`,
`search` (sobre `motivo`), `filterField ∈ {tipo, cantidad, motivo, createdAt}`,
`filterOp`, `filterValue`.

```ts
MovimientoInsumoSchema = {
  id: string; tenantId: string; insumoId: string
  tipo: "CREACION" | "INGRESO" | "SALIDA" | "AJUSTE" | "RECUENTO"
  cantidad: string           // Decimal serializado; tal cual responde hoy
  motivo: string | null; referenciaId: string | null
  stockAntes: number; stockDespues: number
  createdById: string | null; createdAt: string; updatedAt: string | null
}
```

## 3. `GET /api/almacen/variantes/{varianteId}/movimientos` — contrato corregido (US2)

`operationId: almacen_listar_movimientos_variante` (sin cambio)

Misma query que §2. Respuesta `paginadoSchema(MovimientoVarianteSchema)`:

```ts
MovimientoVarianteSchema = {
  id: string; tenantId: string; productoId: string; varianteId: string | null
  etiquetaVariante: string | null
  tipo: "CREACION" | "ENTRADA" | "SALIDA" | "AJUSTE" | "RECUENTO"
  cantidad: number
  motivo: string | null; referenciaId: string | null
  stockAntes: number; stockDespues: number
  createdById: string | null; createdAt: string; updatedAt: string | null
}
```

**Compatibilidad (§2 y §3)**: la forma de la respuesta no cambia, solo pasa a estar
declarada. El único cambio observable es que un `filterField` fuera de la lista ahora
responde 400 en lugar de 500.
