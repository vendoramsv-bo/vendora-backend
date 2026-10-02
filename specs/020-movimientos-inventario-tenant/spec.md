# Feature Specification: Movimientos de inventario — listado a nivel tenant y contrato completo

**Feature Branch**: `020-movimientos-inventario-tenant`
**Created**: 2026-09-30
**Status**: Draft
**Input**: Defecto reportado desde el frontend: la pantalla de Movimientos de inventario pide `GET /api/almacen/movimientos` y recibe `404 {"error":"NOT_FOUND","message":"Ruta no encontrada"}`. Contraparte de la spec `030-movimientos-inventario-tenant` de `vendora-frontend`, que no puede completarse sin este trabajo.

## Resumen

Dos huecos en el contrato del módulo de almacén, encontrados auditando las rutas que
el frontend llama contra el spec OpenAPI publicado:

1. **No existe un listado de movimientos a nivel tenant.** Los movimientos solo se
   pueden consultar por entidad: `/insumos/{id}/movimientos` y
   `/variantes/{varianteId}/movimientos`. Una pantalla que quiera responder "qué se
   movió en el negocio" no tiene a dónde preguntar.

2. **Los dos endpoints que sí existen no declaran los parámetros de consulta que
   aceptan.** Su handler hace `QueryParamsMovimientosSchema.parse(c.req.query())`
   —o sea que soportan `take`, `cursor`, `orderBy` y el filtro genérico del Artículo
   IV— pero su `createRoute` declara únicamente el parámetro de ruta. El resultado es
   que el spec OpenAPI publica un endpoint sin paginación, y el cliente tipado que se
   genera de ahí **no puede pedirla**: cualquier intento es un error de compilación.
   La capacidad está implementada y es inalcanzable.

El segundo es el más instructivo: no es una capacidad que falte, es una que el
contrato no cuenta. Y como el frontend se genera del contrato, lo que el contrato no
dice no existe.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar los movimientos de inventario del negocio (Priority: P1)

Quien administra el inventario necesita responder "qué entró y qué salió en mi
negocio", sin tener que preguntar insumo por insumo ni variante por variante. Hoy esa
pregunta no tiene endpoint: hay que recorrer cada entidad por separado, lo que además
es imposible desde una pantalla de listado.

**Why this priority**: es la capacidad que falta y la que bloquea una pantalla
completa del frontend. Sin ella, la entrada de menú "Movimientos de inventario"
lleva a un error garantizado en las tres aplicaciones.

**Independent Test**: con movimientos registrados de al menos un insumo y de al menos
una variante de producto, pedir el listado a nivel tenant y verificar que devuelve
ambos, del más reciente al más antiguo, con la forma paginada uniforme.

**Acceptance Scenarios**:

1. **Given** un tenant con movimientos de insumos y de variantes, **When** se pide el
   listado de movimientos, **Then** devuelve movimientos de los dos orígenes.
2. **Given** ese listado, **When** se observa un elemento, **Then** indica a qué
   entidad corresponde —insumo o variante— y con qué identidad.
3. **Given** ese listado, **When** no se pide orden explícito, **Then** viene del
   movimiento más reciente al más antiguo.
4. **Given** un tenant sin ningún movimiento, **When** se pide el listado, **Then**
   responde con éxito y una colección vacía, **no** con un error.
5. **Given** movimientos de **otro** tenant, **When** se pide el listado, **Then** no
   aparece ninguno de ellos.
6. **Given** una petición sin sesión válida, **When** se pide el listado, **Then** se
   rechaza por falta de autenticación.
7. **Given** más movimientos de los que entran en una página, **When** se pide la
   página siguiente (`skip` + `take`), **Then** devuelve los siguientes sin
   repetir ni saltear elementos, mientras no se registren movimientos nuevos durante
   el recorrido.

---

### User Story 2 - El contrato declara lo que los endpoints ya aceptan (Priority: P2)

Quien consume la API desde un cliente generado necesita que el contrato describa las
capacidades reales. Hoy `/insumos/{id}/movimientos` y
`/variantes/{varianteId}/movimientos` aceptan paginación, orden y filtro, pero su
declaración OpenAPI solo menciona el parámetro de ruta. Un cliente tipado no puede
pedir la segunda página de un histórico largo: el contrato dice que ese parámetro no
existe.

**Why this priority**: no agrega capacidad, la hace **alcanzable**. Es independiente
de la US1 y mucho más chico, así que puede entregarse antes y desbloquea al frontend
de inmediato para los dos listados por entidad.

**Independent Test**: regenerar el cliente tipado desde el spec publicado y comprobar
que permite pasar paginación y orden a los dos endpoints de movimientos, y que
hacerlo cambia la respuesta.

**Acceptance Scenarios**:

1. **Given** el spec OpenAPI publicado, **When** se inspecciona
   `/insumos/{id}/movimientos`, **Then** declara los parámetros de consulta que el
   endpoint acepta.
2. **Given** lo mismo para `/variantes/{varianteId}/movimientos`, **Then** ídem.
3. **Given** un insumo con más movimientos que el tamaño de página, **When** se pide
   con paginación declarada, **Then** la respuesta la respeta.
4. **Given** esos endpoints, **When** se inspecciona la forma de su respuesta,
   **Then** declara la estructura paginada uniforme del Artículo IV, y no una
   colección de objetos sin forma.

---

### Edge Cases

- **Movimientos de dos orígenes distintos** —insumos y variantes de producto— en un
  mismo listado: el consumidor tiene que poder distinguirlos sin inferirlo. Dos
  movimientos de cosas distintas que se ven iguales son peor que no tenerlos.
- **Un movimiento cuyo insumo o variante fue dado de baja**: el histórico no se borra
  porque el artículo ya no esté activo; tiene que seguir siendo consultable y legible.
- **Aislamiento entre tenants**: es el borde crítico. Un listado a nivel tenant que
  filtre mal expone el inventario de otro negocio.
- **Volumen**: el histórico de movimientos crece sin techo y nunca se depura. El
  listado no puede ofrecer una respuesta sin acotar, y el tope del Artículo IV aplica.
- **Varios filtros a la vez**: el contrato genérico admite **un solo** corte por
  consulta. Si el caso de uso necesita tipo **y** rango de fechas a la vez, es una
  decisión de contrato que hay que tomar explícitamente, no resolver descartando
  filtros en silencio.
- **Orden por un campo no permitido**: se rechaza o se ignora de forma declarada,
  nunca se acepta y se devuelve otro orden.

## Requirements *(mandatory)*

### Functional Requirements

**El listado a nivel tenant (US1)**

- **FR-001**: El sistema MUST ofrecer una operación para listar los movimientos de
  inventario del tenant autenticado, sin acotar a una entidad concreta.
- **FR-002**: Esa operación MUST devolver movimientos tanto de insumos como de
  variantes de producto.
- **FR-003**: Cada elemento MUST identificar a qué entidad corresponde y de qué tipo
  es esa entidad.
- **FR-004**: Cada elemento MUST informar el tipo de movimiento, la cantidad, el stock
  resultante y cuándo ocurrió.
- **FR-005**: La operación MUST respetar el contrato de consultas parametrizables del
  Artículo IV: `take` con su tope, paginación, orden y filtro.
- **FR-006**: La respuesta MUST tener la forma paginada uniforme del Artículo IV.
- **FR-007**: El orden por defecto MUST ser del movimiento más reciente al más antiguo.
- **FR-008**: La operación MUST devolver **solo** movimientos del tenant autenticado.
- **FR-009**: La operación MUST exigir sesión válida.
- **FR-010**: Un tenant sin movimientos MUST recibir una respuesta exitosa con
  colección vacía.

**El contrato de los endpoints existentes (US2)**

- **FR-011**: `/insumos/{id}/movimientos` y `/variantes/{varianteId}/movimientos` MUST
  declarar en su contrato los parámetros de consulta que aceptan.
- **FR-012**: Esos dos endpoints MUST declarar la forma paginada uniforme de su
  respuesta, en vez de una colección de objetos sin estructura.
- **FR-013**: Lo declarado MUST coincidir con lo que el handler efectivamente procesa:
  ni parámetros declarados que se ignoran, ni parámetros aceptados sin declarar.

**Transversal**

- **FR-014**: El spec OpenAPI publicado MUST reflejar estas tres operaciones, de modo
  que un cliente generado pueda consumirlas sin escapes de tipos.

### Key Entities

- **Movimiento de inventario**: el registro inmutable de un cambio de stock. Lleva la
  entidad afectada —un insumo o una variante de producto—, el tipo de movimiento, la
  cantidad, el stock resultante, un motivo o referencia opcional, y cuándo ocurrió.
  Pertenece a un tenant. **No se edita ni se elimina**: es el histórico contra el que
  se audita el inventario.
- **Insumo** y **Variante de producto**: los dos orígenes de stock del negocio. Son
  entidades distintas con su propio ciclo, y un movimiento pertenece a una de las dos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La pantalla de Movimientos de inventario del frontend carga datos en
  las tres aplicaciones. Hoy falla el 100% de las veces.
- **SC-002**: Cero respuestas 404 en el camino normal de esa pantalla.
- **SC-003**: Un tenant sin movimientos obtiene una respuesta exitosa vacía, no un
  error — distinguible por el consumidor sin interpretar.
- **SC-004**: Un listado de movimientos de un tenant **nunca** incluye movimientos de
  otro, verificado con dos tenants con datos.
- **SC-005**: El cliente tipado generado desde el contrato puede pedir paginación y
  orden en las tres operaciones de movimientos, sin escapes de tipos. Hoy no puede en
  ninguna.
- **SC-006**: Recorrer un histórico de más de una página devuelve cada movimiento
  exactamente una vez, sin repetir ni saltear, en ausencia de escrituras concurrentes.

  *Enmienda 2026-10-01*: la paginación es por offset, como en el resto del backend, no
  por cursor. Con escrituras concurrentes, una fila puede repetirse al principio de la
  página siguiente, pero ninguna se pierde. Ver `research.md` §1.
- **SC-007**: Lo que el contrato declara y lo que los handlers procesan coinciden en
  las tres operaciones.

## Assumptions

- **Los movimientos ya se registran.** Esta feature trata de **consultarlos**, no de
  generarlos. El stock se mueve en los flujos de ingreso, salida, ajuste y recuento, y
  esta spec no cambia ninguno. Si se comprobara que algún flujo no está registrando
  movimientos, eso es un defecto aparte con su propio alcance.
- **El histórico es de solo lectura** vía API: no se expone edición ni borrado.
- **El contrato de listas del Artículo IV aplica sin excepciones**, incluido el tope
  de `take` y la forma uniforme de la respuesta.
- **Un solo corte de filtro por consulta**, que es lo que el filtro genérico admite
  hoy. Si el frontend necesitara combinar filtros, es una ampliación del contrato
  genérico que afecta a **todos** los módulos y merece su propia decisión.
- **El frontend ya está preparado para consumir esto.** La spec 030 de
  `vendora-frontend` describe la pantalla y deja la llamada lista; su US1 queda
  bloqueada hasta que esta feature exista.

## Contexto: cómo se encontró, y qué más apareció

El defecto se reportó como un 404 en una pantalla. Al verificarlo se auditaron
**todas** las rutas que el frontend escribe a mano contra el spec OpenAPI **en vivo**
(284 rutas), no contra el cliente generado —que tenía más de un mes y habría dado
conclusiones falsas en los dos sentidos.

Resultado: **41 rutas que el frontend llama y este backend no expone.** Se clasifican
en tres grupos, y solo el primero es asunto de esta spec:

| Grupo | Cuántas | Qué son |
|---|---|---|
| **Capacidad que falta** | 1 | `/api/almacen/movimientos` — esta spec, US1 |
| **Nombre equivocado del lado del frontend** | 9 | `recuentos-insumos` por `recuentos` (7) y `recetas/{productoId}` por `productos/{productoId}/receta` (2). **El backend está bien**; se corrigen allá (spec 030, US3) |
| **Pantallas sin backend** | 31 | 27 de `configuracion-tenant` —`/api/tenant/capabilities`, `/descripciones`, `/equipo`, `/imagenes-local`, `/localizaciones`, `/propietarios`, rutas por id de miembros e invitaciones—, 3 de vitrina y 1 de archivos |

**Los 27 de `configuracion-tenant` necesitan una decisión antes que una spec**: no son
errores de nombre, son features completas del frontend llamando a endpoints que nunca
se construyeron. Hay que decidir, feature por feature, si el backend las va a tener o
si esas pantallas se retiran. Eso excede esta spec y no debería resolverse por
inercia.

**El patrón de fondo, que vale para los dos repositorios**: las 41 se escriben a mano
en el frontend detrás de `(api as any)` o `@ts-ignore`. Con la ruta tipada ninguna
habría compilado. La contracara en este repositorio es la US2: un endpoint cuyo
contrato no declara lo que acepta es indistinguible, desde el cliente, de uno que no
lo soporta.
