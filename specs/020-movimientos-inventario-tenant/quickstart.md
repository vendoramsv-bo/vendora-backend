# Quickstart: validación de movimientos de inventario

**Feature**: `020-movimientos-inventario-tenant`

## Prerrequisitos

1. `pnpm db:migrate` (aplica la migración de índices).
2. `pnpm dev`.
3. Dos usuarios de **tenants distintos** (A y B), con sus tokens en `$TOKEN_A` y `$TOKEN_B`.
4. En el tenant A: al menos un insumo con un ingreso o ajuste, y una variante con un
   ajuste de stock (los flujos existentes ya registran el movimiento).

```bash
API=http://localhost:3000/api/almacen
```

## 1. Contrato publicado (US2, FR-011/012/014)

```bash
curl -s localhost:3000/api/openapi.json | jq '.paths
  | with_entries(select(.key | test("movimientos")))
  | map_values(.get | {params: [.parameters[].name], resp: .responses."200".content."application/json".schema.properties | keys})'
```

**Esperado**: las tres rutas listan `take, skip, orderBy, order, search, filterField,
filterOp, filterValue` (más el parámetro de ruta), y la respuesta declara
`data, total, page, take, totalPaginas, hayPaginaSiguiente, hayPaginaAnterior`.

## 2. Listado tenant — los dos orígenes (US1-AS1/2/3)

```bash
curl -s "$API/movimientos" -H "Authorization: Bearer $TOKEN_A" | jq '.data[] | {origen, nombreEntidad, tipo, createdAt}'
```

**Esperado**: aparecen filas con `origen: "INSUMO"` y con `origen: "VARIANTE"`,
ordenadas por `createdAt` descendente.

## 3. Aislamiento (US1-AS5, SC-004)

```bash
curl -s "$API/movimientos?take=100" -H "Authorization: Bearer $TOKEN_A" | jq '[.data[].id]' > a.json
curl -s "$API/movimientos?take=100" -H "Authorization: Bearer $TOKEN_B" | jq '[.data[].id]' > b.json
jq -n --slurpfile a a.json --slurpfile b b.json '$a[0] - ($a[0] - $b[0]) | length'
```

**Esperado**: `0` (ningún id en común).

## 4. Recorrido de páginas (US1-AS7, SC-006)

Sin registrar movimientos mientras corre:

```bash
for s in 0 2 4 6; do curl -s "$API/movimientos?take=2&skip=$s" -H "Authorization: Bearer $TOKEN_A" | jq -r '.data[].id'; done | sort | uniq -d
```

**Esperado**: salida vacía (sin repetidos), y el total de ids coincide con `total`.

## 5. Vacío y errores (US1-AS4/6, FR-010)

| Caso | Request | Esperado |
|---|---|---|
| Tenant sin movimientos | token de un tenant recién creado | `200`, `data: []`, `total: 0` |
| Sin sesión | sin `Authorization` | `401` |
| `take` excedido | `?take=500` | `400` |
| Campo no permitido | `?filterField=tenantId&filterOp=equals&filterValue=x` | `400` |
| Filtro por tipo normalizado | `?filterField=tipo&filterOp=equals&filterValue=ENTRADA` | ingresos de insumos **y** entradas de variantes |

## 6. Endpoints por entidad (US2-AS3)

```bash
curl -s "$API/insumos/$INSUMO_ID/movimientos?take=1" -H "Authorization: Bearer $TOKEN_A" | jq '{n: (.data|length), total, hayPaginaSiguiente}'
```

**Esperado**: `n: 1` y `hayPaginaSiguiente: true` si el insumo tiene más de un movimiento.
