# Especificaciones VENDORA — Prompts para `/speckit.specify`

Lista ordenada por **prioridad de dependencia**: cada spec asume que los
anteriores ya existen. Pegá cada bloque como prompt de `/speckit.specify`,
ejecutá `/speckit.clarify` → `/speckit.plan` → `/speckit.tasks` →
`/speckit.implement`, y recién entonces pasá al siguiente.

Los prompts describen el **QUÉ** (comportamiento observable), nunca el stack —
ese ya está fijado en la constitución. El agente derivará Hono, Prisma,
PostgreSQL, REST/OpenAPI, Socket.IO, arquitectura hexagonal, etc. desde
`.specify/memory/constitution.md`.

---

## FASE 0 — Cimientos (sin estos, nada funciona)

### Spec 1 — Identidad, autenticación y multi-tenancy
> **Prioridad: máxima.** Todo lo demás depende de poder autenticar usuarios y
> resolver el tenant activo.

```
Construir el cimiento de autenticación y multi-tenancy de la plataforma.

Un usuario puede registrarse con email y contraseña, verificar su email, e
iniciar sesión. También puede iniciar sesión con Google. Tras iniciar sesión,
el usuario tiene una sesión activa con un token.

Un usuario puede pertenecer a varias organizaciones (tenants). Cada tenant
representa un negocio y tiene un nombre, un identificador legible para URLs
(slug), una descripción y un logo. Un tenant puede activar una o varias
capacidades de negocio mediante flags (es tienda, es consultorio, es
restaurante), de forma independiente y combinable.

Un usuario que crea un tenant queda como su propietario. El propietario o un
administrador pueden invitar a otros usuarios por email a unirse al tenant con
un rol específico. La invitación llega con un enlace; al aceptarla, el invitado
se convierte en miembro del tenant con el rol asignado. Los roles son cadenas
libres que cada vertical define.

En todo momento el usuario tiene un "tenant activo" en su sesión, y todas las
operaciones se realizan en el contexto de ese tenant. Ningún usuario puede ver
ni modificar datos de un tenant al que no pertenece.

Cada tenant guarda quién creó y quién modificó por última vez sus registros
principales, para auditoría.

Cuando se crea, actualiza o elimina un tenant, los usuarios conectados a ese
tenant deben verlo reflejado en tiempo real.
```

### Spec 2 — Identidad y presentación del negocio
> Datos públicos del tenant que comparten las tres verticales.

```
Construir la gestión de la identidad pública de cada tenant, común a todas las
verticales de negocio.

Cada tenant puede registrar:
- Uno o más propietarios, con nombre, teléfono, domicilio y una persona de
  referencia con su teléfono.
- Un equipo de trabajo: personas con nombre, teléfono, cargo, domicilio y foto.
- Imágenes del local o negocio, cada una con descripción y un orden de
  visualización.
- Descripciones promocionales del negocio, con un orden de visualización.
- Una o más localizaciones geográficas, con coordenadas (latitud, longitud),
  dirección, barrio, ciudad y departamento.

Todos estos datos pertenecen al tenant y son visibles según su perfil público.
Cada registro guarda quién lo creó y modificó. Los teléfonos y nombres de
propietarios y del equipo son únicos dentro de cada tenant.

Los listados (equipo, imágenes, localizaciones) deben ser parametrizables:
permitir indicar cuántos registros traer, filtrar por un campo, ordenar por un
campo de forma ascendente o descendente, y paginar.

Cuando se crea, actualiza o elimina cualquiera de estos registros, los usuarios
conectados del tenant lo ven en tiempo real.
```

---

## FASE 1 — Núcleo comercial (compartido por las tres verticales)

### Spec 3 — Catálogo de productos y servicios
> Base de tienda, farmacia del consultorio y platos del restaurante.

```
Construir el catálogo comercial del tenant. Cualquier tenant, sin importar su
vertical, puede gestionar productos.

Un producto tiene código, nombre, descripción, imagen, unidad de medida,
precio, y un tipo: comercialización (producto físico), servicio, plato, bebida,
postre o complemento. Los productos se organizan en categorías jerárquicas
(una categoría puede tener subcategorías) y se agrupan por actividad económica.

Un producto puede tener variantes (por ejemplo talla o color), cada una con su
propio precio, stock e imagen. Las variantes se definen combinando atributos
(por ejemplo "color: rojo", "talla: M"). Un producto puede tener precios por
volumen (descuento por cantidad), opciones adicionales, y ofertas con vigencia
de fechas y precio promocional. El historial de cambios de precio se conserva.

Cada producto y categoría guarda quién lo creó y modificó. El código y el
nombre de un producto son únicos dentro de su categoría y tenant.

Los listados de productos deben ser parametrizables: cantidad de registros a
traer, filtro por campo (estado, categoría, tipo, etc.), ordenamiento
ascendente o descendente por campo (nombre, precio, stock, fecha), paginación
por cursor, y búsqueda de texto libre por nombre y descripción.

Cuando un usuario crea, actualiza o elimina un producto, categoría u oferta,
los demás usuarios conectados del tenant lo ven en tiempo real sin recargar.
```

### Spec 4 — Inventario y almacén
> Control de stock de productos e insumos. Depende del catálogo.

```
Construir el control de inventario de productos y el almacén de insumos del
tenant.

INVENTARIO DE PRODUCTOS: cada producto y variante tiene un stock actual y un
stock mínimo. Todo cambio de stock se registra como un movimiento de inventario
(creación, entrada, salida, ajuste, recuento) con su cantidad y motivo. El
sistema permite hacer ajustes de inventario (corrección manual con motivo) y
recuentos (comparar stock del sistema contra stock físico contado, registrando
la diferencia). Cuando el stock de un producto cae por debajo de su mínimo, se
genera una notificación.

ALMACÉN DE INSUMOS: el tenant gestiona insumos (materias primas, ingredientes)
con nombre, unidad de medida, stock, stock mínimo, costo unitario y fecha de
vencimiento. Los insumos tienen sus propios movimientos (ingreso, salida,
ajuste, recuento). Un producto puede estar compuesto por varios insumos en
cantidades definidas (receta/composición), de modo que vender el producto
descuenta sus insumos. Se registran ingresos de almacén (con proveedor, lote y
costo) y salidas de almacén.

Cada operación principal (ajuste, recuento, ingreso, salida) guarda quién la
realizó. Los listados de movimientos, insumos y recuentos son parametrizables
(cantidad, filtro, orden, paginación).

Cuando cambia el stock de un producto o insumo, los usuarios conectados del
tenant lo ven en tiempo real, especialmente las alertas de stock crítico.
```

### Spec 5 — Clientes, proveedores y compras
> Entidades comerciales que alimentan ventas e inventario.

```
Construir la gestión de clientes, proveedores y compras del tenant.

CLIENTES: personas o empresas que compran al tenant, con nombre, dirección,
email, teléfono y fecha de cumpleaños (día y mes). El nombre y el email son
únicos dentro del tenant.

PROVEEDORES: empresas que abastecen al tenant, con nombre, dirección, teléfono,
NIT, departamento, productos que ofrece y sitio web. El nombre y el NIT son
únicos dentro del tenant.

COMPRAS: el tenant registra compras a proveedores. Una compra tiene fecha,
proveedor, descripción, y un detalle de productos con cantidad, precio de
compra y precio estimado de venta. Una compra puede tener costos adicionales
(flete, impuestos) con su motivo. Al confirmar una compra, el stock de los
productos comprados aumenta. La compra tiene estados (pendiente, confirmada).

Cada cliente, proveedor y compra guarda quién lo creó y modificó. Los listados
son parametrizables (cantidad, filtro, orden, paginación, búsqueda por nombre).

Los cambios en clientes, proveedores y compras se reflejan en tiempo real para
los usuarios conectados del tenant.
```

### Spec 6 — Ventas y caja universal
> El corazón transaccional. Lo usan tienda, farmacia del consultorio y
> restaurante. Depende de catálogo, inventario y clientes.

```
Construir el sistema de ventas y caja del tenant, compartido por todas las
verticales.

PUNTOS DE VENTA Y TURNOS: el tenant define puntos de venta (cajas, sucursales)
y turnos de atención (mañana, tarde, etc.) con su horario.

APERTURA Y CIERRE DE CAJA: un miembro abre una caja en un punto de venta y
turno, registrando montos. Durante el turno se registran ingresos y egresos de
caja con su motivo. Al final, se cierra la caja con un arqueo que compara el
efectivo esperado contra el contado. Una caja tiene estados (aperturada,
cerrada).

VENTAS: una venta ocurre en un punto de venta, turno, caja abierta y la realiza
un miembro. Tiene un cliente (registrado u ocasional con datos sueltos), un
detalle de productos vendidos con cantidad, precio, descuento y total. La venta
calcula totales, registra el tipo de pago (efectivo, QR, tarjeta) y el estado
del pago. Al confirmar una venta, el stock de los productos vendidos disminuye
automáticamente (y el de sus insumos si aplica).

PEDIDOS: un cliente puede armar un pedido en línea (lista de productos con
cantidades) que luego se convierte en venta. El pedido tiene estados.

GASTOS: el tenant registra gastos operativos con motivo, monto y fecha.

Cada venta, compra, caja y gasto guarda quién la realizó. Los reportes
consolidados de ventas del tenant deben poder consultarse en una sola vista,
sin importar de qué vertical provino la venta.

Los listados de ventas, pedidos y cajas son parametrizables (cantidad, filtro
por fecha/estado/cliente, orden, paginación).

Cuando se crea una venta, se abre o cierra una caja, o cambia un pedido, los
usuarios conectados del tenant lo ven en tiempo real.
```

---

## FASE 2 — Verticales de negocio (cada una independiente, sobre el núcleo)

### Spec 7 — TuConsultorio (módulo médico)
> Vertical completo de consultorio. Reutiliza catálogo (farmacia), ventas
> (cobro) y clientes. Requiere flag esConsultorio.

```
Construir el módulo de consultorio médico, disponible solo para tenants con la
capacidad de consultorio activada.

PERFIL: el consultorio define sus especialidades, número de registro y datos.

MÉDICOS: miembros del tenant con perfil de médico (especialidad, matrícula
profesional, biografía, foto) y sus horarios de atención por día y franja.

PACIENTES: personas atendidas, con datos demográficos, tipo de sangre,
alergias y datos de seguro médico.

SERVICIOS MÉDICOS: catálogo de prestaciones (consulta, radiografía, etc.) con
duración y precio base.

CITAS: se agenda una cita entre paciente y médico para una fecha/hora, validando
que el médico no tenga otra cita solapada en ese horario. Una cita pendiente se
puede confirmar (solo si es futura) o cancelar (solo si no fue atendida). Se
envían recordatorios por email, SMS o WhatsApp. Los estados de la cita son
pendiente, confirmada, atendida, cancelada, no asistió.

HISTORIA CLÍNICA: cada consulta genera una historia clínica con motivo,
diagnóstico, tratamiento y observaciones. Según la especialidad tiene
extensiones: odontología (odontograma por pieza dental), pediatría (peso, talla,
percentiles de crecimiento) y medicina general (signos vitales, recetas). Se
adjuntan archivos (radiografías, análisis) y se registran vacunaciones.

ATENCIÓN MÉDICA: el registro económico de la consulta (no es factura). Tiene al
médico que atendió, al paciente, los servicios/tratamientos entregados con su
tipo de tratamiento, los totales y los pagos (que pueden ser parciales). Al
cobrar, se enlaza con una venta del tenant para usar la caja unificada.

RECETA MÉDICA: el médico prescribe medicamentos en una receta. Cada ítem puede
referenciar un producto del catálogo (si la farmacia del tenant lo tiene) o ser
texto libre (se compra afuera). La receta tiene posología (dosis, frecuencia,
duración, vía de administración) e indicaciones por ítem, permite sustitución
por genéricos, tiene vigencia (fecha de emisión y vencimiento) y estados
(emitida, parcial, despachada, vencida, anulada). Si el paciente compra los
medicamentos en la farmacia del propio tenant, esa compra se registra como una
venta normal del módulo de ventas (caja unificada); la receta en sí no rastrea
el despacho.

Cada registro principal guarda quién lo creó y modificó. Los listados (citas,
pacientes, atenciones) son parametrizables. Al crear o cambiar el estado de una
cita, atención o receta, los usuarios conectados del consultorio lo ven en
tiempo real (especialmente la agenda de citas).
```

### Spec 8 — TuRestaurant (módulo de restaurante)
> Vertical completo de restaurante. Reutiliza catálogo (platos), inventario
> (insumos), ventas (cobro). Requiere flag esRestaurante.

```
Construir el módulo de restaurante, disponible solo para tenants con la
capacidad de restaurante activada.

PERFIL: el restaurante define su capacidad de mesas y comensales, tipo de
servicio (mesa, delivery, para llevar), duración promedio por comensal, y la
configuración de publicación automática de su menú en redes sociales.

TIEMPOS DE COMIDA: el restaurante define sus franjas (desayuno, almuerzo, cena,
brunch, etc.) con horario de inicio y fin y un orden de visualización.

MENÚS: el restaurante arma menús con vigencia (diario, semanal, especial,
permanente, evento). Un menú agrupa platos, bebidas y postres del catálogo,
cada uno asignado a un tiempo de comida, con su precio en ese menú (que puede
diferir del precio base), y banderas de destacado, especial y disponible hoy.
Un menú tiene estados (borrador, aprobado, publicado, archivado).

RESERVAS: un cliente arma un pedido en línea (lista de platos del menú con
observaciones tipo "sin cebolla") para una fecha y hora de llegada, indicando
número de comensales. La reserva tiene un código, datos del cliente (registrado
u ocasional) y estados: reservada, confirmada (cliente llegó), en preparación,
lista, entregada, pagada, cancelada, no asistió. Al pagar se enlaza con una
venta del tenant (caja unificada).

PANEL DE COCINA: cada plato de una reserva tiene su propio estado de cocina
(pendiente, en preparación, listo, entregado), de modo que la cocina ve el
avance plato por plato. Cada cambio de estado se registra para medir tiempos.

PUBLICACIÓN EN REDES: el menú del día se puede publicar automáticamente en
redes sociales (Instagram, Facebook, WhatsApp, TikTok) a una hora programada,
generando una imagen y registrando métricas (alcance, reacciones).

Cada registro principal guarda quién lo creó y modificó. Los listados (menús,
reservas) son parametrizables. El panel de cocina y el estado de las reservas
deben actualizarse en TIEMPO REAL para todos los usuarios conectados del
restaurante: cuando un mesero crea una reserva o la cocina cambia el estado de
un plato, todos lo ven al instante.
```

---

## FASE 3 — Capa social (transversal, último porque depende de todo)

### Spec 9 — Interacciones sociales y publicaciones
> Reacciones, comentarios, valoraciones sobre productos y tenants. Depende de
> catálogo y tenant.

```
Construir la capa social de la plataforma, transversal a todas las verticales.

SOBRE PRODUCTOS: los usuarios pueden reaccionar (emoji), comentar (con
respuestas anidadas y reacciones a comentarios), valorar (puntuación con
reseña), preguntar y responder, y marcar como favorito cualquier producto.

SOBRE EL TENANT (vitrina pública del negocio): los usuarios pueden reaccionar,
comentar, valorar, preguntar, marcar como favorito y seguir a un tenant.

PUBLICACIONES: un tenant publica contenido (texto, imágenes, video, video
externo de YouTube/TikTok) con título, etiquetas y estado (borrador, publicado,
archivado). Los usuarios reaccionan, comentan (anidado) y comparten las
publicaciones en redes sociales externas.

Cada interacción identifica a su autor. Una valoración por usuario y producto;
una reacción por usuario y elemento. Los listados de comentarios, valoraciones
y publicaciones son parametrizables (cantidad, filtro, orden por fecha o
puntuación, paginación).

Cuando alguien reacciona, comenta, valora o publica, los usuarios conectados
que estén viendo ese producto, tenant o publicación lo ven en tiempo real.
```

---

## Notas de ejecución

1. **Respetá el orden.** Specs 1–6 son cimientos y núcleo; sin ellos las
   verticales (7, 8) no tienen catálogo ni caja donde apoyarse. La social (9)
   va al final porque referencia productos, tenants y publicaciones.

2. **Un spec a la vez, ciclo completo.** Para cada spec:
   ```
   /speckit.specify   (pegás el bloque)
   /speckit.clarify   (resolvés ambigüedades que detecte)
   /speckit.plan      (valida contra la constitución)
   /speckit.tasks     (desglosa en tareas)
   /speckit.analyze   (quality gate)
   /speckit.implement (escribe el código)
   ```

3. **El esquema Prisma ya existe.** Como ya tenés el `schema.prisma` modular
   diseñado, en la fase `/speckit.plan` indicá al agente que use el schema
   existente como base de datos en lugar de derivar uno nuevo. Esto alinea las
   specs con los modelos que ya definimos.

4. **Cada vertical verifica su flag.** Las specs 7 y 8 dicen "disponible solo
   para tenants con la capacidad X activada" — esto se traduce en los guards de
   capability del Artículo III.4 de la constitución.

5. **Tiempo real en cada spec.** Todas las specs terminan con el requisito de
   sincronización en vivo, porque es un principio constitucional (Artículo VI),
   no un extra de cada módulo.
```
