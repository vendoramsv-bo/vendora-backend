# Research: Movimientos de inventario de productos con y sin variante

**Feature**: `027-movimientos-producto-sin-variante` | **Fecha**: 2026-10-05

Verificado contra el código actual y la base de desarrollo (Neon, PostgreSQL 17.11,
solo lecturas).

## 1. Cómo escribir el movimiento sin el `upsert` sobre la clave compuesta

**Decision**: un helper `registrarMovimiento(tx, datos): Promise<{ insertado: boolean }>`
que hace `tx.movimientoInventario.createMany({ data: [datos], skipDuplicates: true })`
y devuelve `insertado = count === 1`.

**Rationale**:
- `createMany` no busca por la clave compuesta, así que acepta `varianteId: null` (FR-002).
- `skipDuplicates` se traduce a `INSERT … ON CONFLICT DO NOTHING`: el chequeo lo hace la
  base, atómico y sin carrera entre leer y escribir.
- `count` dice si la operación ya estaba aplicada. Eso permite saltear el cambio de
  stock en un reintento (§3).

**Alternatives considered**:
- `findFirst` + `create`: dos requests concurrentes pueden pasar el `findFirst` a la vez.
  Sin restricción en la base, ambos crean.
- `create` + capturar `P2002`: en PostgreSQL un error dentro de una transacción la aborta
  entera, y habría que envolverlo en un savepoint.

## 2. La base tiene que garantizar la unicidad con `varianteId` nulo

**Hallazgo**: la restricción `MovimientoInventario_tenantId_productoId_varianteId_tipo_re_key`
es un `UNIQUE` común. En PostgreSQL, `NULL` es distinto de `NULL` para un `UNIQUE`, así
que dos movimientos `SALIDA` de la misma venta y el mismo producto simple **no chocan**.
`ON CONFLICT DO NOTHING` no tendría conflicto que detectar.

**Decision**: una migración que recrea la restricción como `UNIQUE NULLS NOT DISTINCT`
(disponible desde PostgreSQL 15; Neon corre 17.11). Es segura ahora: la tabla tiene 0
filas, así que no puede haber duplicados que la hagan fallar.

**Consecuencia para Prisma**: el schema sigue declarando `@@unique([...])`. Prisma no
modela `NULLS NOT DISTINCT` ni lo compara en `migrate diff`, así que no genera drift. Se
deja un comentario en `40-almacen.prisma` que remite a la migración.

**Alternatives considered**: índice único parcial `WHERE "varianteId" IS NULL` sobre
`(tenantId, productoId, tipo, referenciaId)`. Funciona, pero son dos índices para una
regla y `skipDuplicates` tendría que inferir cuál aplica.

## 3. La idempotencia tiene que cubrir también el stock

**Hallazgo**: en `registrarMovimientoSalidaIdempotente`, un reintento hace `upsert`
(actualiza el movimiento) y después **vuelve a ejecutar el `decrement`**. Para
variantes, que es donde el `upsert` funciona, un reintento descuenta dos veces. El
nombre promete una idempotencia que el stock no tiene. Hoy no se nota porque nadie
reintenta y porque para productos simples todo falla antes.

**Decision**: en las cuatro operaciones, primero se inserta el movimiento y **solo si
`insertado`** se cambia el stock. Ajuste y recuento ya están protegidos por
`estado`/`version`, pero usan el mismo helper por consistencia.

## 4. `stockAntes` correcto con ventas concurrentes

**Decision**: dentro de la transacción de salida, leer el stock con
`SELECT "cantidadStock" … FOR UPDATE` (`$queryRaw`) sobre la fila del producto o de la
variante, filtrando por `tenantId`. El lock dura hasta el commit, así que dos ventas del
mismo producto se serializan y cada movimiento registra el `stockAntes` real.

## 5. Inicialización

**Hallazgos**:
- `Producto` no tiene `inventarioActivado`; solo lo tiene `ProductoVariante`. Los dos
  métodos que filtran por ese campo fallan siempre en la rama de productos.
- La inicialización masiva pone `cantidadStock: 0`. En un producto simple que ya tiene
  stock (cargado por ajuste o recuento), lo **borraría**.

**Decision**:
- **Producto sin variantes**: está "inicializado" si tiene su movimiento `CREACION`
  (`referenciaId = init-<productoId>`). Inicializar = `registrarMovimiento` con
  `stockAntes = stockDespues = stock actual`, `cantidad 0`. **No toca `cantidadStock`.**
  Repetirlo no hace nada (`insertado: false`).
- **Producto con variantes**: el padre no se inicializa; su stock es la suma de las
  variantes.
- **Variante**: sin cambio de comportamiento (usa `inventarioActivado`), pero con el helper.
- Masiva: `producto.findMany({ where: { tenantId, variantes: { none: {} } } })` + variantes
  con `inventarioActivado: false`.

## 6. Errores silenciosos → log

**Decision**:
- `AlmacenInventarioPortAdapter` registra con Pino (`error`) la operación, el
  `tenantId`, la referencia (venta o producto) y los `productoId`/`varianteId`, y
  **relanza**.
- `CrearVentaUseCase` y `ConvertirPedidoEnVentaUseCase` hacen `await` dentro de un
  `try/catch` que **no** relanza: la venta ya está confirmada y responder 500
  provocaría que el cliente la reintente y la duplique. El rastro queda en el log del
  adaptador (FR-005, SC-005).
- `producto.rest.ts`: los dos `.catch(() => {})` pasan a `.catch((err) => logger.error(…))`.

**Por qué `await` y no seguir con *fire-and-forget***: el stock queda descontado antes de
responder (el POS puede releerlo enseguida), y en tests el resultado es determinista.

## 7. Un solo camino de descuento (US4) y convención de signo (FR-007)

**Decision**:
- La venta descuenta al crearse (puerto de almacén), con cualquier `estadoPago`.
- `confirmar` deja de tocar el stock de productos y variantes, y deja de escribir
  `MovimientoInventario`. Sigue cambiando el estado de pago y la caja.
- **Convención**: `cantidad = stockDespues − stockAntes` (delta con signo) en todos los
  tipos. `SALIDA` es negativa, `AJUSTE` y `RECUENTO` llevan su delta, `CREACION` es 0.
  Es lo que ya hacen la salida por venta, el ajuste y el recuento; el único que la
  rompía era `confirmar` (`+cantidad`), que deja de escribir movimientos.

**Hallazgo fuera de alcance — insumos de receta**: `confirmar` también descuenta los
insumos de la receta (`productoInsumo` → `MovimientoAlmacen`). Ese consumo no existe en
el camino de la venta, y `POST /api/almacen/consumo` no lo llama el frontend. Hoy
ninguna venta consume insumos (ninguna pasa por `confirmar`). **Se deja como está**:
mover el consumo de insumos al registro de la venta cambia el stock de insumos de los
restaurantes y merece su propia spec.

## 8. Variante requerida (FR-008)

**Decision**: `IVentaRepository.productosQueRequierenVariante(tenantId, productoIds)`
devuelve los productos de la lista que tienen al menos una variante con
`estado: ACTIVO`. Un producto cuyas variantes están todas dadas de baja se vende como
simple. Si alguna línea
trae uno de esos sin `varianteId`, el caso de uso lanza `VarianteRequeridaError`
(→ `422 VARIANTE_REQUERIDA`, con los `productoIds`) **antes** de crear la venta. Se
aplica en `CrearVentaUseCase` y en `ConvertirPedidoEnVentaUseCase`.

**Riesgo**: hoy ninguna de las 61 líneas de venta trae `varianteId`. Si alguna venta del
POS es de un producto con variantes, después de este cambio se rechaza. Según el commit
`11c2ac4`, el POS ya abre el diálogo de variantes para esos productos, pero hay que
confirmarlo en el frontend antes de desplegar.

## 9. Variante sin inventario activado

**Decision**: la salida por venta descuenta igual y registra el movimiento, aunque el
stock quede negativo, igual que en un producto simple. Es la regla que ya aplica el
camino que se conserva. La advertencia de `confirmar` desaparece con su lógica de stock.
Bloquear stock negativo sigue fuera de alcance (Assumptions de la spec).
