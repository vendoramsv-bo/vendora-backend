# Contrato: cambios observables

Esta feature no agrega rutas. Cambia el comportamiento y los errores de algunas que ya
existen.

## `POST /api/ventas/ventas` y conversión de pedido en venta

| Caso | Antes | Después |
|---|---|---|
| Línea de producto simple | 201; stock sin descontar, sin movimiento | 201; stock descontado y movimiento SALIDA |
| Línea de variante | 201; stock descontado y movimiento (si no fallaba otra línea) | Igual, y un reintento ya no descuenta dos veces |
| Línea **sin** `varianteId` de un producto con variantes activas | 201; descontaba del padre (luego lo pisa la recalculación) | **422** `{ error: "VARIANTE_REQUERIDA", message, productoIds: string[] }`; no se crea la venta |
| Falla de inventario | 201; ningún rastro | 201; queda en el log del servidor con venta, productos y error |

## `POST /api/ventas/ventas/{id}/confirmar`

Sigue rechazando las ventas `PAGADO`. Para las ventas en espera de pago, ya **no**
descuenta el stock de productos ni de variantes: ya se descontó al registrarlas. La
respuesta conserva su forma; el campo `advertencias`, si existe, deja de incluir el
mensaje "sin inventario activado".

## Aprobar ajuste / recuento (`POST /api/almacen/ajustes/{id}/aprobar`, `/recuentos/{id}/aprobar`)

Con productos simples: antes **500**, después **200** con el stock aplicado y el movimiento.

## Movimientos (`GET /api/almacen/movimientos`, `…/variantes/{id}/movimientos`)

Sin cambios de forma. **Convención documentada**: `cantidad` es el delta con signo
(`stockDespues − stockAntes`); una SALIDA es negativa.

## Inicialización (`POST /api/almacen/inicializar`)

Antes 500 si había productos. Después 200, idempotente, y **no** reinicia el stock de los
productos simples que ya lo tienen.
