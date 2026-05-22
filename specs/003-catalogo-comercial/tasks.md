# Tasks: CatÃ¡logo Comercial

**Input**: Design documents from `specs/003-catalogo-comercial/`
**Branch**: `003-catalogo-comercial`
**Prerequisites**: plan.md âœ… spec.md âœ… research.md âœ… data-model.md âœ… contracts/ âœ… quickstart.md âœ…

**Organization**: 8 fases â€” Setup â†’ Foundational â†’ US1 â†’ US2 â†’ US3 â†’ US4 â†’ US5 â†’ Polish

---

## Phase 1: Setup

**Purpose**: Crear la estructura base del mÃ³dulo y registrarlo en el servidor.

- [X] T001 Crear estructura de directorios `src/modules/catalogo/{domain/ports,application/{actividad-economica,unidad-medida,categoria,producto},infrastructure,adapters}` segÃºn plan.md
- [X] T002 Crear `src/modules/catalogo/domain/catalogo.errors.ts` con todas las clases de error del dominio: `ActividadNoEncontrada`, `ActividadDuplicada`, `ActividadEnUso`, `UnidadNoEncontrada`, `UnidadDuplicada`, `CategoriaNombreDuplicado`, `CategoriaNoEncontrada`, `CategoriaPadreNoEncontrada`, `ProductoCodigoDuplicado`, `ProductoNombreDuplicado`, `ProductoNoEncontrado`, `AtributoNombreDuplicado`, `AtributoNoEncontrado`, `AtributoValorDuplicado`, `AtributoValorEnUso`, `VarianteSkuDuplicado`, `VarianteAtributosDuplicados`, `VarianteNoEncontrada`, `OpcionNombreDuplicada`, `OpcionNoEncontrada`, `OfertaSolapada`, `OfertaNoEncontrada`, `PrecioVolumenCantidadDuplicada`
- [X] T003 Crear stub `src/modules/catalogo/adapters/catalogo-router.ts` (Hono app vacÃ­o con `requireAuth + requireTenantActivo`) y agregarlo a `src/server/hono.ts` como `app.route("/api/catalogo", catalogoApp)`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura compartida que todos los User Stories necesitan.

**âš ï¸ CRÃTICO**: Completar esta fase antes de comenzar cualquier User Story.

- [X] T004 [P] Crear `src/modules/catalogo/domain/ports/ICatalogoNotificador.ts` con interfaz y payloads tipados para los 8 eventos: `catalogo:actividad:creada`, `catalogo:categoria:creada`, `catalogo:categoria:actualizada`, `catalogo:producto:creado`, `catalogo:producto:actualizado`, `catalogo:producto:estadoCambiado`, `catalogo:oferta:creada`, `catalogo:oferta:actualizada`
- [X] T005 [P] Crear `src/modules/catalogo/infrastructure/null-catalogo.notificador.ts` implementando `ICatalogoNotificador` con mÃ©todos vacÃ­os (no-op)
- [X] T006 [P] Crear `src/modules/catalogo/infrastructure/catalogo.socket.notificador.ts` implementando `ICatalogoNotificador` con `io.to("tenant:{tenantId}").emit(event, payload)` para los 8 eventos
- [X] T007 Crear `src/modules/catalogo/infrastructure/catalogo.notificador.provider.ts` con patrÃ³n provider: `let _notificador = new NullCatalogoNotificador()`, `getCatalogoNotificador()`, `setCatalogoNotificador(n)`
- [X] T008 [P] Crear `src/modules/catalogo/adapters/catalogo.schema.ts` con schemas Zod compartidos: `QueryParamsCatalogoSchema` (usando `makeQueryParamsSchema` de `core/query-params.ts`), schemas de paginaciÃ³n y estado

**Checkpoint**: Infraestructura lista â€” implementaciÃ³n de User Stories puede comenzar.

---

## Phase 3: User Story 1 â€” Actividades EconÃ³micas, Unidades y CategorÃ­as (Priority: P1) ðŸŽ¯ MVP

**Goal**: El tenant puede configurar sus actividades econÃ³micas, unidades de medida y organizar categorÃ­as jerÃ¡rquicas. Prerequisito para crear productos.

**Independent Test**: Escenarios 1â€“2 del quickstart.md. Crear Ã¡rbol de categorÃ­as padreâ†’hijoâ†’nieto, desactivar el padre (cascade automÃ¡tico), verificar que hijos quedan INACTIVO.

### Entidades de dominio (US1)

- [X] T009 [P] [US1] Crear `src/modules/catalogo/domain/actividad-economica.entity.ts` con campos del modelo Prisma `ActividadEconomica` (id, tenantId, claActividadId, nombre, estado, createdAt, updatedAt, createdById, updatedById) y mÃ©todo `estaActiva(): boolean`; incluir `toJSON()`
- [X] T010 [P] [US1] Crear `src/modules/catalogo/domain/unidad-medida.entity.ts` con campos del modelo `UnidadMedida` (id, tenantId, unidad, sigla, descripcion, claUnidadId, estado) y mÃ©todo `estaActiva()`; incluir `toJSON()`
- [X] T011 [P] [US1] Crear `src/modules/catalogo/domain/categoria.entity.ts` con campos del modelo `Categoria` (id, tenantId, actividadId, nombre, descripcion, imagenUrl, padreId, nivel, estado, createdAt, updatedAt, createdById, updatedById) y mÃ©todo `estaActiva()`; incluir `toJSON()`

### Puertos (US1)

- [X] T012 [P] [US1] Crear `src/modules/catalogo/domain/ports/IActividadEconomicaRepository.ts` con mÃ©todos: `listar(tenantId)`, `crear(data, tenantId, userId)`, `obtener(id, tenantId)`, `desactivar(id, userId)`, `tieneUsoActivo(id)`, `listarClasificadores()`
- [X] T013 [P] [US1] Crear `src/modules/catalogo/domain/ports/IUnidadMedidaRepository.ts` con mÃ©todos: `listar(tenantId)`, `crear(data, tenantId, userId)`, `obtener(id, tenantId)`, `actualizar(id, data, userId)`, `listarClasificadores()`
- [X] T014 [P] [US1] Crear `src/modules/catalogo/domain/ports/ICategoriaRepository.ts` con mÃ©todos: `listar(tenantId, actividadId?, estado?)`, `crear(data, tenantId, userId)`, `obtener(id, tenantId)`, `actualizar(id, data, userId)`, `desactivarConCascada(id, userId)` (desactiva el nodo y todos sus descendientes en una sola operaciÃ³n)

### Repositorios Prisma (US1)

- [X] T015 [P] [US1] Crear `src/modules/catalogo/infrastructure/actividad-economica.prisma.repository.ts`: `listar` filtra por `tenantId`; `crear` usa `withAudit`; `tieneUsoActivo` verifica si hay `Categoria` o `Producto` activos con ese `actividadId`; `listarClasificadores` hace `db.claActividadEconomica.findMany()`
- [X] T016 [P] [US1] Crear `src/modules/catalogo/infrastructure/unidad-medida.prisma.repository.ts`: `listar` filtra por `tenantId`; `crear`/`actualizar` usan `withAudit`; `listarClasificadores` hace `db.claUnidadMedida.findMany()`
- [X] T017 [US1] Crear `src/modules/catalogo/infrastructure/categoria.prisma.repository.ts`: `desactivarConCascada` usa `$transaction` + query recursiva que obtiene todos los IDs descendientes mediante `db.categoria.findMany({ where: { padreId: id } })` de forma iterativa (BFS) y luego hace `db.categoria.updateMany({ where: { id: { in: todosIds } }, data: { estado: "INACTIVO", updatedById } })`; resto de mÃ©todos usan `withAudit`

### Casos de uso â€” Actividad EconÃ³mica (US1)

- [X] T018 [P] [US1] Crear `src/modules/catalogo/application/actividad-economica/listar-actividades.usecase.ts`: devuelve lista de actividades del tenant + clasificadores disponibles vÃ­a `IActividadEconomicaRepository`
- [X] T019 [P] [US1] Crear `src/modules/catalogo/application/actividad-economica/crear-actividad.usecase.ts`: verifica que `claActividadId` existe, lanza `ActividadDuplicada` si ya estÃ¡ activada, crea y emite `catalogo:actividad:creada` vÃ­a `ICatalogoNotificador`
- [X] T020 [P] [US1] Crear `src/modules/catalogo/application/actividad-economica/desactivar-actividad.usecase.ts`: lanza `ActividadNoEncontrada` si no existe; lanza `ActividadEnUso` si `tieneUsoActivo`; desactiva

### Casos de uso â€” Unidad de Medida (US1)

- [X] T021 [P] [US1] Crear `src/modules/catalogo/application/unidad-medida/listar-unidades.usecase.ts`
- [X] T022 [P] [US1] Crear `src/modules/catalogo/application/unidad-medida/crear-unidad.usecase.ts`: lanza `UnidadDuplicada` si ya existe nombre en tenant; crea con `withAudit`
- [X] T023 [P] [US1] Crear `src/modules/catalogo/application/unidad-medida/actualizar-unidad.usecase.ts`: lanza `UnidadNoEncontrada` si no existe; actualiza con `withAudit`

### Casos de uso â€” CategorÃ­a (US1)

- [X] T024 [P] [US1] Crear `src/modules/catalogo/application/categoria/listar-categorias.usecase.ts`: lista plana con filtros opcionales `actividadId` y `estado`
- [X] T025 [US1] Crear `src/modules/catalogo/application/categoria/crear-categoria.usecase.ts`: verifica `actividadId` existe en tenant; verifica `padreId` existe si se provee; calcula `nivel = padre.nivel + 1` (default 1); lanza `CategoriaNombreDuplicado`; emite `catalogo:categoria:creada` vÃ­a `ICatalogoNotificador`
- [X] T026 [P] [US1] Crear `src/modules/catalogo/application/categoria/obtener-categoria.usecase.ts`: lanza `CategoriaNoEncontrada` si no existe
- [X] T027 [P] [US1] Crear `src/modules/catalogo/application/categoria/actualizar-categoria.usecase.ts`: lanza `CategoriaNoEncontrada`; actualiza nombre/descripcion/imagenUrl; emite `catalogo:categoria:actualizada`
- [X] T028 [US1] Crear `src/modules/catalogo/application/categoria/cambiar-estado-categoria.usecase.ts`: lanza `CategoriaNoEncontrada`; si estado=INACTIVO llama `desactivarConCascada` del repo (todos los descendientes se desactivan en cascada); emite `catalogo:categoria:actualizada`

### REST Adapters (US1)

- [X] T029 [P] [US1] Crear `src/modules/catalogo/adapters/actividad-economica.rest.ts`: `GET /cla-actividades` (sin rol); `GET /actividades` (sin rol); `POST /actividades` (`requireRol(["PROPIETARIO","ADMIN"])`); `DELETE /actividades/:id` (`requireRol`); mapear errores a HTTP (ActividadDuplicadaâ†’409, ActividadEnUsoâ†’422, ActividadNoEncontradaâ†’404)
- [X] T030 [P] [US1] Crear `src/modules/catalogo/adapters/unidad-medida.rest.ts`: `GET /cla-unidades` (sin rol); `GET /unidades` (sin rol); `POST /unidades` (`requireRol`); `PUT /unidades/:id` (`requireRol`); mapear UnidadDuplicadaâ†’409, UnidadNoEncontradaâ†’404
- [X] T031 [US1] Crear `src/modules/catalogo/adapters/categoria.rest.ts`: `GET /categorias` (sin rol); `POST /categorias` (`requireRol`); `GET /categorias/:id` (sin rol); `PUT /categorias/:id` (`requireRol`); `PATCH /categorias/:id/estado` (`requireRol`); mapear CategoriaNombreDuplicadoâ†’409, CategoriaNoEncontradaâ†’404, CategoriaPadreNoEncontradaâ†’404
- [X] T032 [US1] Actualizar `src/modules/catalogo/adapters/catalogo-router.ts` registrando los tres routers de US1: `catalogoApp.route("/", actividadEconomicaRouter)`, `catalogoApp.route("/", unidadMedidaRouter)`, `catalogoApp.route("/", categoriaRouter)`

**Checkpoint**: US1 funcional â€” el tenant puede configurar actividades, unidades y Ã¡rbol de categorÃ­as.

---

## Phase 4: User Story 2 â€” GestiÃ³n de Productos (Priority: P2)

**Goal**: CRUD completo de productos con filtrado, bÃºsqueda y paginaciÃ³n por cursor. Historial de precios automÃ¡tico.

**Independent Test**: Escenario 3 del quickstart.md. Crear producto, listar con filtro por tipo, buscar por texto, cambiar estado.

### Entidad de dominio (US2)

- [X] T033 [P] [US2] Crear `src/modules/catalogo/domain/producto.entity.ts` con todos los campos del modelo `Producto` mÃ¡s relaciones opcionales `variantes[]`, `atributos[]`, `opcionesDelProducto[]`, `ofertasVigentes[]`, `preciosVolumen[]`; mÃ©todos `estaActivo()`, `calcularPrecioEfectivo()` (retorna `ofertasVigentes[0].precioOferta` si existe, sino `precio`); incluir `toJSON()`

### Puerto (US2)

- [X] T034 [US2] Crear `src/modules/catalogo/domain/ports/IProductoRepository.ts` â€” parte 1 (productos base): `listar(tenantId, params: QueryParams)`, `crear(data, tenantId, userId)`, `obtener(id, tenantId)` (include completo: atributos con valores, variantes con atributos, opciones, ofertas vigentes, preciosVolumen activos), `actualizar(id, data, userId, precioAnterior?)`, `cambiarEstado(id, estado, userId)`, `listarPrecioHistorico(id, tenantId, params)`

### Repositorio Prisma (US2)

- [X] T035 [US2] Crear `src/modules/catalogo/infrastructure/producto.prisma.repository.ts` â€” parte 1 (productos base): `listar` usa `toPrismaArgs(params, ["nombre","descripcion"])` para bÃºsqueda; `obtener` incluye `{ atributos: { include: { valores: true } }, variantes: { include: { atributos: { include: { atributoValor: true } } } }, opcionesDelProducto: true, productosOfertas: { where: { estado: "ACTIVO", fechaInicio: { lte: now }, fechaFin: { gte: now } } }, preciosVolumen: { where: { estado: "ACTIVO" } } }`; `actualizar` usa `$transaction` â€” si `precioAnterior != null` crea `ProductoPrecioHistorico` antes del update; `crear` y `actualizar` usan `withAudit`

### Casos de uso (US2)

- [X] T036 [P] [US2] Crear `src/modules/catalogo/application/producto/crear-producto.usecase.ts`: lanza `ProductoCodigoDuplicado` o `ProductoNombreDuplicado` si el repo lanza `P2002` en unique constraint; crea producto; emite `catalogo:producto:creado` vÃ­a `getCatalogoNotificador()`
- [X] T037 [P] [US2] Crear `src/modules/catalogo/application/producto/listar-productos.usecase.ts`: delega a `repo.listar(tenantId, params)` y retorna `{ data, total }`
- [X] T038 [P] [US2] Crear `src/modules/catalogo/application/producto/obtener-producto.usecase.ts`: lanza `ProductoNoEncontrado` si no existe
- [X] T039 [US2] Crear `src/modules/catalogo/application/producto/actualizar-producto.usecase.ts`: obtiene producto actual; si `data.precio` estÃ¡ presente y difiere del actual, pasa `precioAnterior` al repo para registrar historial; emite `catalogo:producto:actualizado`
- [X] T040 [US2] Crear `src/modules/catalogo/application/producto/cambiar-estado-producto.usecase.ts`: lanza `ProductoNoEncontrado`; cambia estado; emite `catalogo:producto:estadoCambiado`

### REST Adapter (US2)

- [X] T041 [US2] Crear `src/modules/catalogo/adapters/producto.rest.ts` â€” parte 1 (productos base): `GET /productos` (sin rol, usa `paginate`); `POST /productos` (`requireRol`); `GET /productos/:id` (sin rol); `PUT /productos/:id` (`requireRol`); `PATCH /productos/:id/estado` (`requireRol`); `GET /productos/:id/precio-historico` (sin rol); agregar `catalogoApp.route("/", productoRouter)` en catalogo-router.ts; mapear errores: ProductoCodigoDuplicadoâ†’409, ProductoNombreDuplicadoâ†’409, ProductoNoEncontradoâ†’404

**Checkpoint**: US2 funcional â€” catÃ¡logo navegable con productos reales, filtrado y bÃºsqueda.

---

## Phase 5: User Story 3 â€” Variantes y Atributos (Priority: P3)

**Goal**: Productos pueden tener variantes definidas por combinaciones de atributos clave-valor, cada una con precio/stock/imagen propios.

**Independent Test**: Escenario 4 del quickstart.md. Crear atributo "Talla" con valores S/M/L, crear 3 variantes, verificar rechazo de combinaciÃ³n duplicada y de valor en uso por variante activa.

### ExtensiÃ³n del puerto (US3)

- [X] T042 [US3] Extender `src/modules/catalogo/domain/ports/IProductoRepository.ts` con mÃ©todos de variantes/atributos: `listarAtributos(productoId, tenantId)`, `crearAtributo(productoId, data)`, `agregarValorAtributo(atributoId, data)`, `eliminarValorAtributo(valorId, productoId)` (verifica uso), `listarVariantes(productoId, tenantId)`, `crearVariante(productoId, data)` (verifica sku Ãºnico y combinaciÃ³n Ãºnica), `actualizarVariante(id, productoId, data)`, `cambiarEstadoVariante(id, productoId, estado, userId)`

### ExtensiÃ³n del repositorio (US3)

- [X] T043 [US3] Extender `src/modules/catalogo/infrastructure/producto.prisma.repository.ts` con implementaciones de atributos/variantes: `eliminarValorAtributo` verifica con `db.productoVarianteAtributo.findFirst({ where: { atributoValorId: valorId, variante: { estado: "ACTIVO" } } })` â€” lanza `AtributoValorEnUso` si existe; `crearVariante` verifica unicidad de combinaciÃ³n consultando `ProductoVarianteAtributo` agrupado por variante y comparando sets de `atributoValorId`

### Casos de uso (US3)

- [X] T044 [P] [US3] Crear `src/modules/catalogo/application/producto/crear-atributo.usecase.ts`: verifica producto existe; lanza `AtributoNombreDuplicado` si ya existe en producto; crea atributo
- [X] T045 [P] [US3] Crear `src/modules/catalogo/application/producto/agregar-valor-atributo.usecase.ts`: verifica atributo existe en producto; lanza `AtributoValorDuplicado`; crea valor
- [X] T046 [P] [US3] Crear `src/modules/catalogo/application/producto/eliminar-valor-atributo.usecase.ts`: lanza `AtributoValorEnUso` si alguna variante activa lo usa (delegate al repo); elimina si seguro
- [X] T047 [P] [US3] Crear `src/modules/catalogo/application/producto/crear-variante.usecase.ts`: lanza `VarianteSkuDuplicado` si sku ya existe en producto; lanza `VarianteAtributosDuplicados` si misma combinaciÃ³n de `atributoValorIds` ya existe; crea variante con `ProductoVarianteAtributo` en `$transaction`
- [X] T048 [P] [US3] Crear `src/modules/catalogo/application/producto/actualizar-variante.usecase.ts`: lanza `VarianteNoEncontrada`; actualiza precio/stock/sku/imagenUrl/estado

### REST Adapter (US3)

- [X] T049 [US3] Extender `src/modules/catalogo/adapters/producto.rest.ts` con rutas de variantes/atributos: `GET /productos/:id/atributos` (sin rol); `POST /productos/:id/atributos` (`requireRol`); `POST /productos/:id/atributos/:attrId/valores` (`requireRol`); `DELETE /productos/:id/atributos/:attrId/valores/:valId` (`requireRol`); `GET /productos/:id/variantes` (sin rol); `POST /productos/:id/variantes` (`requireRol`); `PUT /productos/:id/variantes/:varId` (`requireRol`); `PATCH /productos/:id/variantes/:varId/estado` (`requireRol`); mapear AtributoValorEnUsoâ†’422, VarianteSkuDuplicadoâ†’409, VarianteAtributosDuplicadosâ†’409

**Checkpoint**: US3 funcional â€” productos con variantes de talla/color/etc. con sus propios precios y stock.

---

## Phase 6: User Story 4 â€” Precios, Opciones y Ofertas (Priority: P4)

**Goal**: Precios por volumen, opciones adicionales (add-ons), ofertas con rango de fechas y rechazo de solapamiento. Historial de precios ya funciona desde US2.

**Independent Test**: Escenario 5 del quickstart.md. Agregar precio por volumen, opciÃ³n y oferta vigente; verificar oferta expirada excluida; verificar historial al cambiar precio.

### ExtensiÃ³n del puerto (US4)

- [X] T050 [US4] Extender `src/modules/catalogo/domain/ports/IProductoRepository.ts` con mÃ©todos de precios/opciones/ofertas: `crearPrecioVolumen(productoId, data)`, `eliminarPrecioVolumen(id, productoId)`, `listarOpciones(productoId)`, `crearOpcion(productoId, data)`, `actualizarOpcion(id, productoId, data)`, `listarOfertas(productoId, soloVigentes: boolean)`, `crearOferta(productoId, data, tenantId)` (verifica solapamiento), `actualizarOferta(id, productoId, data)`

### ExtensiÃ³n del repositorio (US4)

- [X] T051 [US4] Extender `src/modules/catalogo/infrastructure/producto.prisma.repository.ts` con implementaciones de precios/opciones/ofertas: `crearOferta` verifica solapamiento con `db.productoOfertas.findFirst({ where: { productoId, varianteId: data.varianteId ?? null, estado: "ACTIVO", fechaInicio: { lte: data.fechaFin }, fechaFin: { gte: data.fechaInicio } } })` â€” lanza `OfertaSolapada` si existe; `listarOfertas` filtra `fechaInicio <= now AND fechaFin >= now AND estado=ACTIVO` cuando `soloVigentes=true`

### Casos de uso (US4)

- [X] T052 [P] [US4] Crear `src/modules/catalogo/application/producto/crear-precio-volumen.usecase.ts`: verifica producto existe; lanza `PrecioVolumenCantidadDuplicada` si misma cantidad ya existe para (productoId, varianteId); crea regla
- [X] T053 [P] [US4] Crear `src/modules/catalogo/application/producto/crear-opcion.usecase.ts`: verifica producto existe; lanza `OpcionNombreDuplicada`; crea opciÃ³n
- [X] T054 [P] [US4] Crear `src/modules/catalogo/application/producto/actualizar-opcion.usecase.ts`: lanza `OpcionNoEncontrada`; actualiza
- [X] T055 [US4] Crear `src/modules/catalogo/application/producto/crear-oferta.usecase.ts`: verifica producto existe; lanza `OfertaSolapada` si hay solapamiento de fechas para mismo producto/variante; crea oferta; emite `catalogo:oferta:creada` vÃ­a `getCatalogoNotificador()`
- [X] T056 [US4] Crear `src/modules/catalogo/application/producto/actualizar-oferta.usecase.ts`: lanza `OfertaNoEncontrada`; actualiza; emite `catalogo:oferta:actualizada`

### REST Adapter (US4)

- [X] T057 [US4] Extender `src/modules/catalogo/adapters/producto.rest.ts` con rutas de precios/opciones/ofertas: `GET /productos/:id/precios-volumen` (sin rol); `POST /productos/:id/precios-volumen` (`requireRol`); `DELETE /productos/:id/precios-volumen/:pvId` (`requireRol`); `GET /productos/:id/opciones` (sin rol); `POST /productos/:id/opciones` (`requireRol`); `PUT /productos/:id/opciones/:opId` (`requireRol`); `GET /productos/:id/ofertas` (sin rol, query param `soloVigentes=true`); `POST /productos/:id/ofertas` (`requireRol`); `PUT /productos/:id/ofertas/:ofId` (`requireRol`); mapear OfertaSolapadaâ†’409, PrecioVolumenCantidadDuplicadaâ†’409, OpcionNombreDuplicadaâ†’409

**Checkpoint**: US4 funcional â€” catÃ¡logo completo con precios diferenciados, opciones y promociones temporales.

---

## Phase 7: User Story 5 â€” Actualizaciones en Tiempo Real (Priority: P5)

**Goal**: Todos los usuarios conectados del mismo tenant reciben notificaciones automÃ¡ticas cuando cualquier entidad del catÃ¡logo cambia.

**Independent Test**: Escenario 6 del quickstart.md. Dos sesiones WebSocket del mismo tenant â€” operador A crea producto, usuario B recibe `catalogo:producto:creado`. Usuario de tenant distinto NO recibe el evento.

- [X] T058 [P] [US5] Verificar que `CatalogoSocketNotificador` (T006) implementa correctamente los 8 mÃ©todos con `io.to("tenant:${tenantId}").emit()` â€” revisar que los payloads coinciden exactamente con `contracts/socket-events.md`
- [X] T059 [US5] Registrar el notificador real en `src/server/index.ts`: importar `CatalogoSocketNotificador` y `setCatalogoNotificador`, agregar `setCatalogoNotificador(new CatalogoSocketNotificador(io))` despuÃ©s de crear el servidor Socket.IO

**Checkpoint**: US5 funcional â€” el catÃ¡logo es colaborativo en tiempo real con aislamiento de tenant.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Tests unitarios, verificaciÃ³n TypeScript, validaciÃ³n final.

- [X] T060 [P] Crear `tests/helpers/fake-producto.repository.ts` implementando `IProductoRepository` con `Map` en memoria; `crearVariante` debe verificar unicidad de combinaciÃ³n de atributos en memoria; `crearOferta` debe verificar solapamiento en memoria
- [X] T061 [P] Crear `tests/helpers/fake-catalogo.notificador.ts` implementando `ICatalogoNotificador` con array `eventos[]` y mÃ©todos `limpiar()` y `tieneEvento(tipo, predicado?)`
- [X] T062 [P] Crear `tests/unit/crear-producto.usecase.test.ts`: test crea producto exitosamente y emite evento; test lanza `ProductoCodigoDuplicado` cuando el repo lanza P2002 en codigo; test lanza `ProductoNombreDuplicado` cuando el repo lanza P2002 en nombre
- [X] T063 [P] Crear `tests/unit/actualizar-producto.usecase.test.ts`: test crea historial cuando precio cambia; test NO crea historial cuando precio no cambia; test emite `catalogo:producto:actualizado` con precio actualizado
- [X] T064 [P] Crear `tests/unit/crear-variante.usecase.test.ts`: test lanza `VarianteSkuDuplicado` si sku ya existe; test lanza `VarianteAtributosDuplicados` si misma combinaciÃ³n existe; test crea variante exitosamente con combinaciÃ³n nueva
- [X] T065 [P] Crear `tests/unit/crear-oferta.usecase.test.ts`: test lanza `OfertaSolapada` cuando fechas se solapan con oferta existente; test crea oferta cuando no hay solapamiento; test emite `catalogo:oferta:creada`
- [X] T066 [P] Crear `tests/unit/cambiar-estado-categoria.usecase.test.ts`: test desactiva categorÃ­a con subcategorÃ­as en cascada verificando que `desactivarConCascada` del repo es llamado; test emite `catalogo:categoria:actualizada`
- [X] T067 Ejecutar `pnpm exec tsc --noEmit` y corregir todos los errores de TypeScript hasta que el comando retorne exitosamente

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Sin dependencias â€” comenzar inmediatamente
- **Phase 2 (Foundational)**: Depende de Phase 1 â€” bloquea todas las User Stories
- **Phase 3 (US1)**: Depende de Phase 2 â€” bloquea US2, US3, US4 (necesitan ActividadEconomica y Categoria)
- **Phase 4 (US2)**: Depende de US1 completado (categorÃ­as necesarias para productos)
- **Phase 5 (US3)**: Depende de US2 completado (productos necesarios para variantes)
- **Phase 6 (US4)**: Depende de US2 completado (puede empezar junto con US3)
- **Phase 7 (US5)**: Depende de US2â€“US4 completados (los eventos estÃ¡n en esos use cases)
- **Phase 8 (Polish)**: Depende de todas las user stories completadas

### Parallel Opportunities Within Each Phase

**Phase 2**: T004, T005, T006, T008 pueden ejecutarse en paralelo (archivos distintos)

**Phase 3 (US1)**:
- T009, T010, T011 en paralelo (entidades distintas)
- T012, T013, T014 en paralelo (puertos distintos)
- T015, T016 en paralelo (repositorios distintos); T017 despuÃ©s por complejidad
- T018, T019, T020 en paralelo; T021, T022, T023 en paralelo
- T024, T026, T027 en paralelo; T025, T028 secuencial (depende de lÃ³gica de cascada/nivel)
- T029, T030 en paralelo

**Phase 8 (Polish)**: T060â€“T066 todos en paralelo (archivos distintos)

---

## Implementation Strategy

### MVP (Solo US1 + US2)

1. Completar Phase 1 + Phase 2
2. Completar Phase 3 (US1): actividades, unidades, categorÃ­as
3. Completar Phase 4 (US2): productos con listado y bÃºsqueda
4. **VALIDAR**: Escenarios 1â€“3 del quickstart.md
5. Deploy/demo con catÃ¡logo bÃ¡sico funcional

### Entrega Incremental

1. MVP (US1+US2) â†’ catÃ¡logo navegable
2. + US3 â†’ catÃ¡logo con variantes de talla/color
3. + US4 â†’ catÃ¡logo con promociones y precios por mayor
4. + US5 â†’ catÃ¡logo colaborativo en tiempo real
5. + Polish â†’ tests, TypeScript clean

---

## Notes

- `[P]` = puede ejecutarse en paralelo con otros `[P]` del mismo grupo (archivos distintos, sin dependencias)
- Todos los repositorios usan `db as any` (patrÃ³n del proyecto) con `withAudit` para auditorÃ­a
- `makeQueryParamsSchema`, `toPrismaArgs`, `paginate` de `src/core/query-params.ts` para listados
- `getCatalogoNotificador()` del provider en todos los use cases que emiten eventos
- Los use cases de US1â€“US4 ya emiten eventos; US5 solo necesita conectar el notificador real en `index.ts`
- Verificar TypeScript con `pnpm exec tsc --noEmit` antes de considerar la implementaciÃ³n completa

