# Research: Movimientos de inventario a nivel tenant

**Feature**: `020-movimientos-inventario-tenant` | **Fecha**: 2026-10-01

Todo lo que sigue se verificó contra el código de `main` (`11c2ac4`).

## 1. Paginación: offset, no cursor

**Decision**: el listado tenant usa `take`/`skip` y responde con `paginate()`
(`{ data, total, page, take, totalPaginas, hayPaginaSiguiente, hayPaginaAnterior }`).
Orden estable: `<campo> <dir>, id <dir>`.

**Rationale**: `core/query-params.ts` solo implementa offset, y **todos** los listados
del backend —incluidos los dos de movimientos por entidad— devuelven esa forma. El
frontend ya la consume. La spec mencionaba un cursor (US1-AS7, SC-006) siguiendo la
redacción del Artículo IV, que no coincide con lo implementado. Decisión del usuario
del 2026-10-01: offset, y SC-006 se enmienda en la spec.

**Limitación aceptada**: con orden "más reciente primero", un movimiento que se
registra mientras alguien recorre páginas desplaza todo una posición, y la última fila
de una página reaparece al principio de la siguiente. No se pierden filas; puede
repetirse una. El desempate por `id` garantiza que, **sin escrituras concurrentes**,
el recorrido es exacto.

**Alternatives considered**: cursor keyset solo en este endpoint (forma de respuesta
distinta al resto); cursor opcional en `core` para todos (alcance de otra spec).

## 2. Cómo unir dos tablas: `UNION ALL` parametrizado

**Decision**: `$queryRaw` con `Prisma.sql`, un `UNION ALL` de
`almacen."MovimientoAlmacen"` ⋈ `almacen."Insumo"` y
`almacen."MovimientoInventario"` ⋈ `catalogo."Producto"`, con el filtro de tenant
**dentro de cada rama** y `ORDER BY … LIMIT … OFFSET` sobre el conjunto unido. Se
hace un `COUNT(*)` con el mismo `WHERE` en paralelo.

**Rationale**: es la única opción en la que la base pagina el conjunto unido. El
`tenantId` dentro de cada rama permite que cada una use su índice
`(tenantId, createdAt)` (§5) y hace imposible que un filtro externo mal armado lo
pierda.

**Alternatives considered**:
- *Fusión en memoria* (`findMany` de cada tabla con `take: skip + take`, merge, slice):
  sin SQL crudo, pero el costo crece linealmente con el número de página.
- *Vista SQL + `previewFeatures = ["views"]`*: reutilizaría `toPrismaArgs` tal cual,
  pero `views` sigue en preview en Prisma 7, cambia el generador para todo el
  proyecto y Prisma Migrate no gestiona vistas.
- *Tabla unificada de movimientos*: rediseño de dos módulos de escritura. Fuera de
  alcance (la spec asume que los movimientos ya se registran y no cambia esos flujos).

## 3. Vocabulario de `tipo` unificado

**Decision**: el listado tenant expone un único enum
`CREACION | ENTRADA | SALIDA | AJUSTE | RECUENTO`. `INGRESO` (insumos) se normaliza a
`ENTRADA` en la rama de insumos (`CASE`). Los filtros por `tipo` se aplican **después**
de normalizar, así que `tipo = ENTRADA` devuelve ingresos de insumos y entradas de
variantes.

**Rationale**: los dos enums (`TipoMovimiento`, `TipoMovimientoAlmacen`) difieren
solo en ese valor. Un consumidor que filtra por "entradas" no tiene por qué saber que
en una tabla se llaman distinto. El origen sigue siendo explícito en `origen`.

**Alternatives considered**: exponer los valores crudos y documentar los dos
vocabularios (traslada la diferencia al frontend y rompe los filtros cruzados).

## 4. `filterField` acotado (Artículo IV, y requisito de seguridad del SQL crudo)

**Decision**:
- Listado tenant: `filterField ∈ {origen, tipo, motivo, cantidad, createdAt}`,
  `orderBy ∈ {tipo, cantidad, createdAt}`. Cada nombre se traduce a una columna
  mediante un mapa fijo; el valor siempre va como parámetro.
- Endpoints por entidad: `QueryParamsMovimientosSchema` pasa de
  `filterField: z.string()` a `z.enum(["tipo","cantidad","motivo","createdAt"])`.
- `filterValue` se convierte según el campo: número para `cantidad`, fecha para
  `createdAt`; un valor inválido → 400.

**Rationale**: hoy `filterField` es un string libre que va directo al `where` de
Prisma. Un campo inexistente o `cantidad gt "5"` (string contra `Int`) hace fallar a
Prisma y termina en **500**. En SQL crudo, un campo libre sería inyección. Acotarlo es
lo que pide el Artículo IV y lo que exige FR-013 (lo declarado coincide con lo procesado).

**Cambio de comportamiento**: un `filterField` desconocido pasa de 500 a 400. Ningún
consumidor legítimo depende de un 500.

## 5. Índices

**Decision**: migración nueva con `@@index([tenantId, createdAt])` en
`MovimientoAlmacen` y `MovimientoInventario`.

**Rationale**: ninguna de las dos tablas tiene un índice que sirva al listado tenant
(solo `@@unique` con `tenantId` como primera columna, sin `createdAt`). La spec marca
el volumen como edge case: el histórico nunca se depura.

## 6. Aislamiento por tenant

**Hallazgo**: `crearPrismaScoped` (`src/core/prisma-scoped.ts`) declara
`query: {} as any`. **No inyecta `tenantId` en ninguna query**, aunque su comentario y
el Artículo III.3 dicen que sí. Cada repositorio lo pone a mano en el `where`.

**Decision**: el SQL crudo sigue la misma práctica y pone `tenantId` en cada rama. Un
test unitario del builder verifica que ambas ramas llevan el parámetro.

**Fuera de alcance**: que el Artículo III.3 no se cumpla en todo el backend es un
hallazgo para su propia spec. Se registra acá para no perderlo.

## 7. Contrato de respuesta tipado (US2)

**Decision**: se agrega `paginadoSchema(item)` a `core/openapi-responses.ts`, que
describe la forma real de `paginate()`. Los tres endpoints la usan con un esquema de
ítem concreto. El commit `11c2ac4` declaró la query pero dejó la respuesta como
`z.record(...)`; este helper es reutilizable para cerrar ese hueco en otros módulos.

**Detalle de serialización**: `MovimientoAlmacen.cantidad` es `Decimal`, y `c.json`
la serializa como **string** (`"1.5000"`). El endpoint por insumo se declara tal como
responde hoy (`cantidad: string`) para no cambiar su comportamiento. El listado
tenant, que es nuevo, la normaliza a `number`.

## 8. Entidades dadas de baja

- **Insumo / producto con baja lógica** (`estado`): el `JOIN` no filtra por estado,
  así que el histórico sigue visible (edge case de la spec ✅).
- **Variante borrada físicamente**: `varianteId` queda en `NULL` (`onDelete: SetNull`),
  pero `productoId` y `etiquetaVariante` se conservan, así que la fila sigue siendo legible ✅.
- **Insumo o producto borrado físicamente**: `onDelete: Cascade` borra sus
  movimientos. Es comportamiento preexistente del schema y contradice "el histórico
  no se borra". No se cambia acá (implica migrar FKs de dos tablas); se registra como
  riesgo.

## 9. Ruta y permisos

**Decision**: router nuevo `movimiento.rest.ts`, montado en
`almacenApp.route("/movimientos", …)` → `GET /api/almacen/movimientos`,
`operationId: almacen_listar_movimientos_tenant`. Sin `requireRol`, igual que los
dos listados por entidad: basta con sesión y tenant activo, que `almacenApp` ya exige.
