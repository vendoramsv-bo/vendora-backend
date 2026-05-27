# Prompts ejecutables para `/speckit.specify` — VENDORA con reglas de negocio reales

> Cada bloque está listo para **copiar y pegar** directamente en
> `/speckit.specify`. Combinan el QUÉ del módulo con las reglas de negocio
> extraídas de la versión en producción (TuTiendaAmigaBackend), redactadas como
> **comportamiento observable** — sin nombres de archivo ni jerga de código,
> que es lo que Spec-Kit espera.
>
> **Orden de ejecución (por dependencia):** Spec 3 (Catálogo) → Spec 4
> (Inventario/Almacén) → Spec 5 (Compras) → Spec 6 (Ventas/Caja). Hacé el ciclo
> completo de cada uno (`specify → clarify → plan → tasks → analyze →
> implement`) antes de pasar al siguiente.
>
> Estos NO reemplazan los Specs 1, 2, 7, 8, 9 de `especificaciones-speckit.md`
> (auth, identidad, consultorio, restaurante, social). Son la versión enriquecida
> de los Specs 3–6 con las reglas confirmadas en código.

---

## PROMPT — Spec 3: Catálogo de productos y servicios

```
Construir el módulo de catálogo comercial del tenant. Cualquier tenant, sin
importar su vertical de negocio, puede gestionar productos.

ESTRUCTURA DEL PRODUCTO
Un producto tiene código, nombre, descripción, imagen, unidad de medida,
precio, stock actual, stock mínimo, y un tipo: comercialización (producto
físico), servicio, plato, bebida, postre o complemento. Cada producto pertenece
a una categoría y a una actividad económica. Los productos pueden tener
variantes (por ejemplo talla o color), cada una con su propio precio, stock e
imagen, definidas combinando atributos. Un producto puede tener precios por
volumen (paquetes con descuento por cantidad), ofertas con vigencia de fechas, y
un historial de cambios de precio.

VALIDACIONES AL CREAR O EDITAR UN PRODUCTO
Son obligatorios: la actividad económica, la categoría, el código, el nombre, la
unidad de medida, el tipo de producto, el tipo de descuento y el estado. La
descripción y la imagen son opcionales. Antes de crear un producto, el sistema
permite verificar si un código ya existe en el tenant (devolviendo si existe y
qué producto lo usa) para evitar duplicados. El código y el nombre de un
producto son únicos dentro de su categoría y tenant.

REGISTRO DE STOCK INICIAL
Cuando se crea un producto de tipo comercialización, el sistema registra
automáticamente un movimiento de inventario de tipo "creación" con la cantidad
de stock inicial. Los productos de tipo servicio no generan movimientos de
inventario. La cantidad de stock inicial solo puede modificarse mientras el
producto no tenga ningún otro movimiento de inventario (ninguna venta, ajuste o
recuento); una vez que el producto registró movimientos reales, su stock inicial
queda fijo y solo cambia mediante ventas, compras, ajustes o recuentos. Al
eliminar un producto, se eliminan sus movimientos de inventario de tipo
"creación".

ALTA MASIVA DESDE CATÁLOGO MAESTRO
El sistema mantiene un catálogo maestro de plantillas de productos
(clasificadores). Un tenant puede crear múltiples productos de golpe
seleccionando una lista de plantillas: por cada plantilla se crea un producto en
el tenant. La operación requiere al menos una plantilla seleccionada. Durante el
alta masiva, si la categoría o la unidad de medida de la plantilla no existen aún
en el tenant, se crean automáticamente vinculándolas al maestro. Los productos
creados por alta masiva nacen con stock cero; su stock se carga después mediante
ingresos o compras.

CONSULTAS PARAMETRIZABLES
Los listados de productos deben aceptar un contrato uniforme de consulta:
cantidad de registros por página (por defecto 10, máximo 100), filtro por campo,
ordenamiento ascendente o descendente, y búsqueda. Los campos por los que se
puede ordenar están acotados a una lista fija (nombre, código, precio, stock,
fecha de creación, fecha de actualización), con orden por defecto descendente
por fecha de creación; no se permite ordenar por campos arbitrarios. Los filtros
disponibles incluyen: nombre y código por coincidencia parcial; precio mínimo y
máximo; estado (valor de una lista fija); tipo de producto; tipo de descuento;
rango de stock; y rango de fecha de creación. La respuesta de un listado incluye
los datos, el total de registros, la página, el límite, el total de páginas, y si
hay página siguiente y anterior.

AUDITORÍA Y TIEMPO REAL
Cada producto, categoría y oferta guarda quién lo creó y quién lo modificó por
última vez. Cuando un usuario crea, actualiza o elimina un producto, categoría u
oferta, los demás usuarios conectados del tenant lo ven en tiempo real sin
recargar.
```

---

## PROMPT — Spec 4: Inventario y almacén

```
Construir el control de inventario de productos y el almacén de insumos del
tenant.

INVENTARIO DE PRODUCTOS
Cada producto y cada variante tiene un stock actual y un stock mínimo. Todo
cambio de stock queda registrado como un movimiento de inventario, de tipo
creación, entrada, salida, ajuste o recuento, con su cantidad (que puede ser
negativa para reflejar salidas), su motivo y una referencia a la operación que
lo originó. Cuando el stock de un producto cae por debajo de su stock mínimo, se
genera una notificación.

REGLA DE MOVIMIENTOS IDEMPOTENTES
Los movimientos de inventario son idempotentes respecto a su operación de
origen: si ya existe un movimiento para la misma combinación de producto,
variante, tipo y operación de referencia, se actualiza en lugar de crear uno
nuevo. Esto evita movimientos duplicados cuando una venta o un ajuste se
reprocesa.

AJUSTES Y RECUENTOS (PATRÓN CREAR-BORRADOR-APROBAR)
Los ajustes de inventario (corrección manual con motivo) y los recuentos
(comparación entre stock físico contado y stock del sistema) se crean primero en
estado borrador y NO afectan el stock hasta que se aprueban. Al aprobar:
- Un ajuste aplica su cantidad de ajuste (positiva o negativa) al stock y
  registra un movimiento de tipo "ajuste".
- Un recuento aplica la diferencia (stock físico menos stock del sistema) al
  stock y registra un movimiento de tipo "recuento".
En ambos casos, si la operación dejaría el stock de un producto o variante en
valor negativo, se rechaza con un error que identifica el producto (y la variante
si aplica) que quedaría negativo. Cuando el ajuste o recuento es sobre una
variante, el cambio se aplica a la variante y luego el stock del producto padre
se recalcula como la suma de los stocks de todas sus variantes.

ALMACÉN DE INSUMOS
El tenant gestiona insumos (materias primas, ingredientes) con nombre, unidad de
medida, stock, stock mínimo, costo unitario y fecha de vencimiento. Un producto
puede estar compuesto por varios insumos en cantidades definidas (su receta o
composición). Los movimientos de almacén son de tipo ingreso o salida.

INGRESOS Y SALIDAS DE ALMACÉN (PATRÓN CREAR-BORRADOR-APROBAR)
Los ingresos de almacén (con proveedor y lote) y las salidas de almacén se crean
en borrador y solo afectan el stock al aprobarse, pasando a estado aprobado.
- Al aprobar un ingreso, cada línea incrementa el stock del insumo y registra un
  movimiento de almacén de tipo "ingreso".
- Al aprobar una salida, cada línea descuenta el stock del insumo y registra un
  movimiento de almacén de tipo "salida".
En ambos casos, si la operación dejaría el insumo con stock negativo, se rechaza
con un error que identifica el insumo afectado.

TRANSACCIONALIDAD
Toda aprobación que afecta stock y registra movimientos debe ejecutarse de forma
atómica: si cualquier paso falla, no debe aplicarse ningún cambio parcial.

AUDITORÍA, CONSULTAS Y TIEMPO REAL
Cada ajuste, recuento, ingreso y salida guarda quién lo realizó. Los listados de
movimientos, insumos, ajustes y recuentos aceptan el contrato uniforme de
consulta (cantidad por página con máximo 100, filtro, orden ascendente o
descendente por campo acotado, paginación). Cuando cambia el stock de un producto
o insumo, los usuarios conectados del tenant lo ven en tiempo real, en especial
las alertas de stock por debajo del mínimo.
```

---

## PROMPT — Spec 5: Clientes, proveedores y compras

```
Construir la gestión de clientes, proveedores y compras del tenant.

CLIENTES
Personas o empresas que compran al tenant, con nombre, dirección, email,
teléfono y fecha de cumpleaños (día y mes). El nombre y el email son únicos
dentro del tenant.

PROVEEDORES
Empresas que abastecen al tenant, con nombre, dirección, teléfono, NIT,
departamento, productos que ofrece y sitio web. El nombre y el NIT son únicos
dentro del tenant.

COMPRAS (PATRÓN CREAR-BORRADOR-APROBAR)
El tenant registra compras a proveedores. Una compra tiene fecha, proveedor,
descripción, y un detalle de productos donde cada línea indica la cantidad, el
precio de compra y un precio estimado de venta. Una compra puede tener costos
adicionales (flete, impuestos) con su motivo. La compra se crea en estado
borrador y NO afecta el stock hasta que se aprueba, momento en el que pasa a
estado aprobado. Al aprobar una compra:
- Cada línea del detalle incrementa el stock del producto correspondiente y
  registra un movimiento de inventario.
- Si la línea tiene un precio estimado de venta mayor que cero, el precio de
  venta del producto se actualiza a ese valor; si el precio estimado es cero, el
  precio de venta del producto se conserva sin cambios.
La aprobación debe ser atómica: si algún paso falla, no se aplica ningún cambio.

AUDITORÍA, CONSULTAS Y TIEMPO REAL
Cada cliente, proveedor y compra guarda quién lo creó y modificó. Los listados
aceptan el contrato uniforme de consulta (cantidad por página con máximo 100,
filtro por campo, orden ascendente o descendente, paginación, búsqueda por
nombre). Los cambios en clientes, proveedores y compras se reflejan en tiempo
real para los usuarios conectados del tenant.
```

---

## PROMPT — Spec 6: Ventas y caja universal

```
Construir el sistema de ventas y caja del tenant, compartido por todas las
verticales de negocio.

PUNTOS DE VENTA Y TURNOS
El tenant define puntos de venta (cajas, sucursales) y turnos de atención con su
horario.

APERTURA Y CIERRE DE CAJA
Un miembro abre una caja indicando punto de venta, turno y fecha. No puede
existir más de una apertura de caja para la misma combinación de tenant, fecha,
punto de venta, turno y usuario; un intento duplicado se rechaza. Durante el
turno se registran ingresos y egresos de caja con su motivo. La caja acumula
automáticamente el total de ventas y el total de descuentos a medida que se
registran ventas.

Una caja no se puede cerrar si no registra ningún movimiento: cero ventas, cero
ingresos de caja, cero egresos de caja y descuentos en cero o negativos; cerrar
una caja vacía se rechaza. Una caja en estado cerrada no se puede eliminar.
Una caja que tenga ventas, ingresos o egresos asociados tampoco se puede
eliminar (el sistema informa cuántos registros lo impiden).

VENTAS
Una venta ocurre en un punto de venta, turno y caja, y la realiza un miembro.
Tiene un cliente (registrado, o bien ocasional con sus datos sueltos: tipo y
número de documento, nombre, email), un detalle de productos vendidos con
cantidad, precio, descuento y total por línea, y los totales de la venta. Registra
el tipo de pago (efectivo, QR, tarjeta), el monto en efectivo recibido, la
diferencia (vuelto) y el estado del pago.

VALIDACIONES AL CREAR UNA VENTA
- La venta debe tener al menos un producto en el detalle; si no, se rechaza.
- La caja referenciada debe existir y estar en estado aperturada; si no, se
  rechaza.
- La fecha de la venta debe coincidir con la fecha de la apertura de caja,
  comparadas en zona horaria de Bolivia (La Paz); si no coinciden, se rechaza.
- Si la venta proviene de un pedido, el identificador del pedido es obligatorio,
  el pedido debe existir y debe estar en estado aceptado; de lo contrario se
  rechaza.

EFECTOS AL CONFIRMAR UNA VENTA (ATÓMICOS, EN UNA TRANSACCIÓN)
- Por cada línea de un producto de tipo comercialización, se descuenta el stock.
  Los productos de tipo servicio no afectan stock.
- Si la línea usa un precio por volumen (paquete), la cantidad descontada del
  stock es la cantidad de paquetes multiplicada por las unidades que contiene
  cada paquete, no la cantidad de paquetes a secas.
- Si la línea tiene variante, se descuenta el stock de la variante y luego el
  stock del producto padre se recalcula como la suma del stock de todas sus
  variantes.
- Cada producto vendido genera un movimiento de inventario de tipo salida.
- La caja incrementa su total de ventas y su total de descuentos con los totales
  de la venta.
- Si la venta provenía de un pedido, el pedido pasa a estado vendido.

ACTUALIZACIÓN Y ELIMINACIÓN DE VENTAS (REVERSA EXACTA)
Al actualizar una venta, el sistema primero restaura el stock de los productos
del detalle anterior, elimina sus movimientos de inventario y revierte los montos
en la caja; luego aplica los nuevos detalles repitiendo todos los efectos de una
venta nueva. Al eliminar una venta, se restaura el stock, se eliminan los
movimientos de inventario y se revierten los montos en la caja; los detalles de
la venta se eliminan en cascada.

PEDIDOS
Un cliente puede armar un pedido en línea (lista de productos con cantidades) que
luego se convierte en venta. El pedido tiene estados (por ejemplo aceptado,
vendido). Al crearse un pedido, se notifica automáticamente al propietario del
tenant con la cantidad de productos y el total del pedido.

GASTOS
El tenant registra gastos operativos con motivo, monto y fecha.

REPORTES, AUDITORÍA Y TIEMPO REAL
Los reportes consolidados de ventas del tenant deben poder consultarse en una
sola vista, sin importar de qué vertical provino la venta. Cada venta, compra,
caja y gasto guarda quién la realizó. Los listados de ventas, pedidos y cajas
aceptan el contrato uniforme de consulta (cantidad por página con máximo 100,
filtro por fecha, estado o cliente, orden ascendente o descendente, paginación).
Cuando se crea una venta, se abre o cierra una caja, o cambia un pedido, los
usuarios conectados del tenant lo ven en tiempo real.
```

---

## Notas de uso

1. **Convención de fechas:** los prompts fijan zona horaria de Bolivia
   (`America/La_Paz`) para las comparaciones de fecha de venta vs. caja, tal como
   está en la versión de producción. Si VENDORA opera en otra zona, ajustá esa
   línea antes de pegar.

2. **Patrón crear-borrador-aprobar:** aparece en compras, ajustes, recuentos,
   ingresos y salidas. Es una regla de negocio fuerte de la versión original —
   las operaciones que mueven stock no lo hacen al crearse sino al aprobarse.
   Está incorporado en los prompts de los Specs 4 y 5.

3. **El esquema Prisma ya existe:** recordá indicar en `/speckit.plan` que use
   la carpeta `prisma/` existente (con Prisma 7 y `@@schema` por dominio) en
   lugar de derivar tablas nuevas, como dice la nota 3 de
   `especificaciones-speckit.md`.

4. **Trazabilidad:** si querés verificar de dónde sale cada regla, el archivo
   `reglas-negocio-tutienda.md` mantiene la versión con referencias `[CÓDIGO:
   archivo]` al repositorio original.

5. **Paginación offset vs. cursor:** estos prompts describen el comportamiento
   en términos de página/límite (como el original). Si preferís cursor (como
   sugiere el Artículo IV de la constitución), cambiá "página" por "cursor" en
   la sección de consultas parametrizables antes de pegar. La decisión es tuya;
   ambos cumplen el requisito de consulta parametrizable.
```
