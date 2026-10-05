# Feature Specification: Configuración del negocio — las pantallas que hoy no tienen backend

**Feature Branch**: `026-configuracion-tenant-api`
**Created**: 2026-10-04
**Status**: Draft
**Input**: Rutas que el frontend llama y el backend no expone, en particular las de `configuracion-tenant` (`/api/tenant/capabilities`, `/descripciones`, `/equipo`, `/imagenes-local`, `/localizaciones`, `/propietarios`, rutas por id de miembros e invitaciones). Contexto en `specs/020-movimientos-inventario-tenant/spec.md`, sección "Contexto".

## Resumen

La sección **Configuración** del negocio existe en las tres aplicaciones (tu-tienda,
tu-consultorio, tu-restaurante) y comparte sus pantallas desde el paquete común del
frontend. Ocho de esas pantallas llaman a **28 operaciones que este backend no
expone**: cada guardado, borrado o reordenamiento responde *ruta no encontrada*. El
usuario ve un formulario que no guarda nada.

Lo que hace a esta feature más chica de lo que parece: **las tablas ya existen**
(descripciones, imágenes del local, equipo de trabajo, localizaciones, propietario) y
la vitrina pública ya lee equipo, imágenes y localizaciones. Lo que falta es poder
**cargarlos y mantenerlos**.

*Corrección 2026-10-04, verificada contra la base de desarrollo*: la primera versión de
esta spec decía que el asistente de creación carga estos datos. **No es así**: nadie
escribe hoy en equipo, imágenes, descripciones ni localizaciones, y las cuatro tablas
están vacías en los 3 negocios. El propietario sí se crea al registrar el negocio,
pero solo 1 de los 3 lo tiene: el modelo exige que un usuario sea propietario de **un
solo** negocio en todo el sistema, y quien tiene dos negocios queda sin propietario en
ambos. Estas pantallas serán, en la práctica, el **único** lugar donde se cargan estos
datos.

## Auditoría de origen

Hecha el 2026-10-04 comparando las 204 llamadas tipadas del frontend contra el
contrato publicado por el servidor completo (286 paths), **por método y path**. La
auditoría de la spec 020 era solo por path y además contra el contrato parcial; esta
la reemplaza.

| Grupo | Llamadas | Esta spec |
|---|---|---|
| **Configuración del negocio** (8 pantallas) | 28 | ✅ Sí |
| Recuentos de insumos con borrador y aprobación | 3 | No — ver *Fuera de alcance* |
| Diferencias de método en catálogo y ventas | 5 | No |
| Eliminar archivo | 1 | No — ya implementada en la rama `020-eliminar-archivo-r2`, sin mergear |
| Activar consultorio desde el asistente | 1 | No |
| ~~Vitrina (3)~~ | 0 | Falso positivo de la auditoría anterior: eran prefijos citados en un comentario |

Las 28 de configuración, por pantalla:

| Pantalla | Faltan | Ya existe |
|---|---|---|
| Miembros | cambiar rol, quitar miembro | listar |
| Invitaciones | invitar, cancelar invitación | listar |
| Descripciones | listar, crear, editar, borrar, reordenar | — |
| Imágenes del local | listar, agregar, borrar, reordenar | — |
| Equipo de trabajo | listar, crear, editar, borrar, reordenar | — |
| Localizaciones | listar, crear, editar, borrar | — |
| Propietario | consultar, editar (crear y borrar no se construyen, Q1) | — |
| Capacidades (verticales) | consultar, activar/desactivar | activar/desactivar tienda (ruta propia) |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gestionar quién trabaja en el negocio (Priority: P1)

El dueño o un administrador necesita sumar personas al negocio, quitar a quien ya no
trabaja y cambiar qué puede hacer cada uno. Hoy puede **ver** la lista de miembros e
invitaciones, pero no invitar, ni cancelar una invitación, ni cambiar un rol, ni
quitar a nadie.

**Why this priority**: es control de acceso. Una persona que dejó el negocio y no se
puede quitar sigue entrando a la caja y al inventario. No es una molestia de
interfaz, es un riesgo.

**Independent Test**: invitar a un correo, ver la invitación pendiente, cancelarla;
cambiar el rol de un miembro y comprobar que su acceso cambia; quitar un miembro y
comprobar que pierde el acceso al negocio.

**Acceptance Scenarios**:

1. **Given** un administrador, **When** invita a un correo con un rol, **Then** la
   invitación aparece como pendiente y la persona la recibe.
2. **Given** una invitación pendiente, **When** se cancela, **Then** deja de figurar y
   ya no puede aceptarse.
3. **Given** un miembro, **When** se le cambia el rol, **Then** sus permisos pasan a
   ser los del rol nuevo desde su próxima acción.
4. **Given** un miembro, **When** se lo quita del negocio, **Then** pierde el acceso a
   ese negocio (no a su cuenta ni a otros negocios).
5. **Given** el único propietario del negocio, **When** alguien intenta quitarlo o
   bajarle el rol, **Then** se rechaza: un negocio no puede quedar sin propietario.
6. **Given** un miembro sin permisos de administración, **When** intenta cualquiera de
   estas acciones, **Then** se rechaza.
7. **Given** un rol que no corresponde a las verticales activas del negocio, **When**
   se intenta asignar, **Then** se rechaza indicando los roles válidos.

---

### User Story 2 - Mantener lo que el negocio muestra de sí mismo (Priority: P1)

El dueño quiere corregir la descripción del negocio, cambiar las fotos del local y
mantener al día el equipo que muestra al público, y decidir en qué orden aparece cada
cosa. Hoy lo carga una vez en el asistente de creación y después no lo puede tocar.

**Why this priority**: es lo que el cliente final ve en la vitrina. Un error de
tipeo en la descripción o la foto de un empleado que ya no está quedan publicados
para siempre.

**Independent Test**: para cada uno de los tres contenidos (descripciones, imágenes
del local, equipo), crear dos elementos, editar uno, invertir el orden, borrar uno, y
comprobar en cada paso que la lista devuelta refleja exactamente el cambio.

**Acceptance Scenarios**:

1. **Given** un negocio con descripciones cargadas, **When** se consultan, **Then**
   aparecen, en su orden. Un negocio sin ninguna obtiene una lista vacía, no un error.
2. **Given** una lista, **When** se agrega un elemento, **Then** queda al final.
3. **Given** una lista, **When** se reordena enviando el orden completo, **Then** se
   devuelve en ese orden.
4. **Given** un reordenamiento que omite elementos o incluye uno de otro negocio,
   **When** se envía, **Then** se rechaza entero, sin aplicar un orden parcial.
5. **Given** un miembro del equipo, **When** se edita, **Then** se conserva su
   posición en la lista.
6. **Given** un elemento borrado, **When** se consulta la lista, **Then** no aparece,
   y la vitrina pública tampoco lo muestra.
7. **Given** dos miembros del equipo con el mismo teléfono o el mismo nombre, **When**
   se intenta guardar el segundo, **Then** se rechaza indicando el conflicto.
8. **Given** una imagen del local, **When** se borra, **Then** deja de mostrarse. (El
   archivo físico lo gestiona la feature de eliminar archivos, no esta.)

---

### User Story 3 - Mantener dónde está el negocio (Priority: P2)

El dueño necesita corregir la dirección o el punto en el mapa, o agregar una segunda
sucursal.

**Why this priority**: afecta cómo lo encuentran los clientes, pero un negocio puede
operar con la localización del asistente mientras tanto.

**Independent Test**: crear una localización, editar su dirección, crear una segunda,
borrar la primera y verificar la lista en cada paso.

**Acceptance Scenarios**:

1. **Given** un negocio, **When** se crea una localización con dirección, ciudad,
   departamento y coordenadas, **Then** aparece en la lista.
2. **Given** coordenadas fuera de rango (latitud fuera de ±90, longitud fuera de ±180),
   **When** se guardan, **Then** se rechazan.
3. **Given** la única localización del negocio, **When** se intenta borrar, **Then** se
   rechaza: el negocio necesita al menos una para figurar en el directorio.

---

### User Story 4 - Mantener los datos del propietario (Priority: P2)

El dueño necesita corregir su teléfono, su domicilio o su contacto de referencia.

**Why this priority**: son datos de contacto del responsable del negocio. Importan,
pero no bloquean la operación diaria.

**Independent Test**: consultar los datos del propietario, editarlos y volver a
consultarlos.

**Acceptance Scenarios**:

1. **Given** cualquier negocio, incluidos los creados antes de esta feature, **When**
   se consultan los datos del propietario, **Then** existe un propietario: el de los
   negocios que hoy no lo tienen se completa a partir de su dueño.
1b. **Given** un usuario dueño de dos negocios, **When** se consulta el propietario de
   cada uno, **Then** cada negocio tiene el suyo, ligado a ese mismo usuario.
2. **Given** esos datos, **When** se editan, **Then** se devuelven actualizados.
3. **Given** un negocio, **When** se intenta dar de alta un segundo propietario o
   borrar el existente, **Then** no hay operación para hacerlo: un negocio tiene
   exactamente un propietario.

*Decisión Q1 (2026-10-04)*: un solo propietario por negocio, como ya garantiza el
modelo de datos. La pantalla del frontend, que hoy lo trata como una lista con alta y
baja, pasa a ser un formulario de consulta y edición. Las dos operaciones de alta y
baja **no se construyen**.

---

### User Story 5 - Activar y desactivar verticales (Priority: P3)

Un negocio que empezó como tienda decide sumar un consultorio o un restaurante, o
dejar de usar uno.

**Why this priority**: es poco frecuente y hoy ya existe la activación y
desactivación de la vertical tienda por su propia ruta. Esta historia generaliza eso
a las tres.

**Independent Test**: consultar las verticales activas, activar una segunda,
desactivarla, e intentar desactivar la última.

**Acceptance Scenarios**:

1. **Given** un negocio, **When** se consultan sus verticales, **Then** se ve cuáles
   están activas.
2. **Given** una vertical inactiva, **When** se activa, **Then** sus pantallas y
   endpoints quedan habilitados.
3. **Given** una vertical activa con datos, **When** se desactiva, **Then** sus
   pantallas se ocultan y sus endpoints se rechazan, pero **sus datos se conservan**:
   al reactivarla vuelven a estar.
4. **Given** la única vertical activa, **When** se intenta desactivar, **Then** se
   rechaza con un motivo que el frontend reconoce (hoy espera un *422*).

---

### Edge Cases

- **Aislamiento entre negocios**: todo id que llegue en una ruta (un miembro, una
  descripción, una localización) se busca **dentro del negocio activo**. Un id válido
  de otro negocio se trata como inexistente, no como prohibido: no se confirma que
  exista.
- **Reordenar con la lista desactualizada**: si otro usuario agregó un elemento
  mientras alguien reordenaba, el orden enviado no incluye el nuevo; se rechaza (US2-4)
  para que la pantalla recargue, en lugar de dejar el nuevo en una posición arbitraria.
- **Quitarse a uno mismo**: un administrador que se quita a sí mismo pierde el acceso
  en el acto. Se permite, salvo que sea el único propietario (US1-5).
- **Invitar a quien ya es miembro**: se rechaza indicando que ya pertenece al negocio.
- **Elementos con el mismo orden** (por ejemplo, cargados por otro medio con el orden
  por defecto): la consulta tiene que devolver igual un orden estable.
- **Un usuario dueño de varios negocios** necesita un propietario por cada uno (US4-1b).
- **Vertical desactivada con operaciones abiertas** (una caja abierta, citas
  futuras): se desactiva igual; las operaciones abiertas quedan intactas para cuando se
  reactive. Avisar al usuario es tarea del frontend.

## Requirements *(mandatory)*

### Functional Requirements

**Transversal**

- **FR-001**: Las 26 operaciones de la *Auditoría de origen* que se construyen MUST
  existir en el contrato publicado con el método y path que el frontend ya usa. Las 2
  de alta y baja de propietario no se construyen (Q1), y el frontend deja de
  llamarlas.
- **FR-002**: Todas MUST exigir sesión válida y negocio activo, y operar solo sobre
  datos de ese negocio.
- **FR-003**: Las operaciones de escritura MUST estar limitadas a los roles de
  administración del negocio (propietario y administrador). La lectura MUST estar
  disponible para cualquier miembro.
- **FR-004**: Cada operación MUST declarar en el contrato los datos que recibe y la
  forma de lo que devuelve, de modo que el frontend pueda quitar sus `@ts-ignore`.
- **FR-005**: Los rechazos MUST distinguirse por motivo (no encontrado, conflicto de
  unicidad, regla de negocio, sin permiso, datos inválidos).

**Miembros e invitaciones (US1)**

- **FR-006**: El sistema MUST permitir invitar por correo con un rol, cancelar una
  invitación pendiente, cambiar el rol de un miembro y quitar un miembro.
- **FR-007**: El sistema MUST impedir que el negocio quede sin al menos un
  propietario.
- **FR-008**: Los roles asignables MUST ser los de las verticales activas del negocio.

**Contenido ordenado (US2)**

- **FR-009**: Descripciones, imágenes del local y equipo MUST poder listarse en su
  orden, crearse (al final), editarse (sin perder posición) y borrarse.
- **FR-010**: Cada una de esas tres listas MUST poder reordenarse en una sola
  operación que recibe el orden completo, y que se aplica entera o no se aplica.
- **FR-011**: Un elemento borrado MUST dejar de mostrarse en la vitrina pública.

**Localizaciones (US3)**

- **FR-012**: Las localizaciones MUST poder listarse, crearse, editarse y borrarse,
  validando el rango de las coordenadas.
- **FR-013**: El sistema MUST impedir borrar la última localización del negocio.

**Propietario (US4)**

- **FR-014**: Los datos del único propietario del negocio MUST poder consultarse y
  editarse. No se exponen alta ni baja de propietarios (Q1).
- **FR-014b**: Todo negocio MUST tener propietario, incluidos los existentes que hoy no
  lo tienen, y un mismo usuario MUST poder ser propietario de más de un negocio.

**Verticales (US5)**

- **FR-015**: El sistema MUST permitir consultar, activar y desactivar las verticales
  del negocio.
- **FR-016**: Desactivar una vertical MUST conservar sus datos.
- **FR-017**: El sistema MUST impedir desactivar la última vertical activa.

### Key Entities

Todas existen hoy y pertenecen a un negocio. Esta feature no agrega entidades, pero
ajusta dos reglas del modelo: el propietario deja de ser único por usuario (FR-014b) y
el teléfono y el domicilio del equipo pasan a ser opcionales, como ya los trata la
pantalla.

- **Miembro**: una persona con acceso al negocio y un rol.
- **Invitación**: un acceso ofrecido a un correo con un rol, pendiente hasta que se
  acepta, se cancela o vence.
- **Descripción**: un párrafo sobre el negocio, con posición.
- **Imagen del local**: una foto con descripción y posición.
- **Miembro del equipo**: una persona que el negocio presenta al público (nombre,
  cargo, teléfono, foto opcional), con posición. **No** es lo mismo que un miembro con
  acceso: el equipo es contenido, los miembros son permisos.
- **Localización**: dirección, ciudad, departamento y coordenadas.
- **Propietario**: datos de contacto del responsable del negocio, ligado a un usuario.
- **Vertical**: tienda, consultorio o restaurante, activa o no para el negocio.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Las 8 pantallas de Configuración guardan cambios en las tres
  aplicaciones. Hoy no guarda ninguna.
- **SC-002**: Cero respuestas *ruta no encontrada* en el uso normal de Configuración.
- **SC-003**: El frontend puede quitar los `@ts-ignore` de los 8 hooks de
  configuración y compilar.
- **SC-004**: Un miembro quitado del negocio no puede realizar ninguna acción sobre él
  a partir de ese momento.
- **SC-005**: Ninguna operación de configuración lee ni modifica datos de otro
  negocio, verificado con dos negocios con datos.
- **SC-006**: Ningún negocio puede quedar sin propietario, sin localización o sin
  vertical activa por medio de estas operaciones.
- **SC-007**: Una auditoría por método y path entre frontend y contrato no encuentra
  ninguna operación de configuración faltante: las 26 construidas están en el
  contrato, y el frontend ya no llama a las 2 descartadas.

## Assumptions

- **Se construyen, no se retiran.** La spec 020 dejó abierta la decisión de construir
  el backend o retirar estas pantallas. Se asume construir: los datos ya existen, las
  pantallas ya existen en las tres apps, y la operación de cada una es estándar.
- **El contrato lo fija el frontend.** Se respetan los métodos y paths que el frontend
  ya usa. Donde la forma que espera choque con el modelo de datos, se decide caso por
  caso en el plan y se documenta (Q1 es el caso más visible).
- **Las invitaciones y los miembros los gestiona el sistema de autenticación
  existente**, que ya modela organizaciones, miembros e invitaciones. Esta feature los
  expone; no crea un mecanismo paralelo.
- **Borrar es físico** en descripciones, imágenes, equipo y localizaciones. Se
  corrigió el supuesto inicial (baja lógica): las restricciones de unicidad del equipo
  y de las imágenes impedirían volver a cargar algo con el mismo nombre o la misma
  imagen, y no hay requisito de conservar el histórico de este contenido (research §5).
- **El archivo de una imagen borrada no se elimina acá.** Eso es la feature de
  eliminar archivos (rama `020-eliminar-archivo-r2`).
- **Roles con permiso de escritura**: propietario y administrador, en las tres
  verticales.

## Fuera de alcance

Hallados por la misma auditoría. Cada uno tiene una causa distinta y no comparte
diseño con esta feature.

| Llamada del frontend | Qué pasa | Dónde se resuelve |
|---|---|---|
| `GET`/`PATCH /almacen/recuentos-insumos/{id}`, `POST …/{id}/aprobar` | El frontend espera borrador y aprobación para recuentos de insumos; el backend los registra en un paso, sin id que consultar | Decisión de producto: ¿flujo de borrador para insumos, como en productos? |
| `PUT /ventas/clientes/{id}`, `PUT /ventas/proveedores/{id}` | El backend expone `PATCH` | Alinear el método en el frontend |
| `DELETE /catalogo/categorias/{id}` | El backend no permite borrar categorías | Decisión: ¿se borran o se desactivan? |
| `DELETE /catalogo/productos/{id}/ofertas/{id}` | Revisar contra `…/ofertas/{ofId}` del backend | Verificar si es solo el nombre del parámetro |
| `POST /catalogo/productos/{id}/variantes/propuesta` | No existe | Feature de catálogo |
| `DELETE /tenant/archivo` | Implementado en una rama sin mergear | Mergear `020-eliminar-archivo-r2` |
| `PATCH /tenant/consultorio/activar` | Existe `tienda/activar`, no el equivalente de consultorio | Lo absorbe US5 si se decide así en el plan |
