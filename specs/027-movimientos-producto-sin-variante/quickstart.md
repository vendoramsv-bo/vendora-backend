# Quickstart: validación de movimientos con y sin variante

**Feature**: `027-movimientos-producto-sin-variante`

## Automático

```bash
DATABASE_URL=<postgres con los schemas migrados> pnpm vitest run tests/integration/almacen/movimientos-sin-variante.test.ts
```

El test crea un tenant propio, ejerce venta, reintento, ajuste, recuento e
inicialización con un producto simple y con una variante, y borra sus datos al
terminar. Sin `DATABASE_URL` se omite. Es el patrón de `tests/consultorio/integration`.

## Manual (con el POS)

1. Migración aplicada; backend corriendo.
2. Un producto **sin** variantes con stock 10, cargado con un ajuste aprobado (US2).
3. Vender 3 unidades desde el POS.
4. `GET /api/almacen/movimientos?filterField=origen&filterOp=equals&filterValue=VARIANTE`:
   aparece una SALIDA con `cantidad: -3`, `stockAntes: 10`, `stockDespues: 7`.
5. El stock del producto es 7 (SC-002).
6. Intentar vender un producto **con** variantes sin elegir variante (por ejemplo con
   `curl`): `422 VARIANTE_REQUERIDA`, y la venta no se crea.
7. `POST /api/almacen/inicializar` dos veces: la segunda no crea movimientos y el
   producto sigue en 7.
8. Forzar un fallo (por ejemplo, vender un `productoId` inexistente): la venta responde
   201 y el log del servidor muestra `[almacen] registrarSalidaVenta falló` con la venta y
   el producto (SC-005).

## Después de desplegar

Las 26 ventas anteriores no se reparan (Assumptions). Recomendación: un recuento de los
productos vendidos para dejar el stock real.
