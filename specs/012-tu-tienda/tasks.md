# Tasks: TuTienda — Perfil Público de Comercio de Barrio

**Input**: Design documents from `specs/012-tu-tienda/`  
**Branch**: `012-tu-tienda`

> **Nota de contexto**: El módulo social ya implementa 12 use cases y todos los modelos Prisma `TiendaXxx` para interacciones sociales (comentar, valorar, preguntar, seguir, favorito, reaccionar). El trabajo nuevo es el módulo `tienda` (perfil, directorio, destacados) + extensiones menores al módulo social.

---

## Phase 1: Setup — Estructura del módulo tienda

**Purpose**: Crear la estructura hexagonal del nuevo módulo `tienda` y sus contratos de dominio.

- [x] T001 Crear estructura de directorios del módulo tienda: `src/modules/tienda/domain/ports/`, `application/perfil/`, `application/destacados/`, `application/directorio/`, `infrastructure/`, `adapters/`
- [x] T002 [P] Crear `src/modules/tienda/domain/tienda.errors.ts` con: `TiendaNoActivaError`, `TiendaNoEncontradaError`, `ProductoDestacadoLimiteError` (max 20), `ProductoNoVisibleParaDestacadoError`, `ProductoDestacadoYaExisteError`, `ConfiguracionNoEncontradaError`
- [x] T003 [P] Crear `src/modules/tienda/domain/ports/ITiendaRepository.ts` con métodos: `activar(tenantId, createdById)`, `desactivar(tenantId)`, `obtenerConfiguracion(tiendaId)`, `actualizarConfiguracion(tiendaId, dto, updatedById)`, `obtenerPerfilPublico(slug)`, `listarDirectorio(params)`, `agregarDestacado(dto)`, `quitarDestacado(tiendaId, productoId)`, `reordenarDestacados(tiendaId, orden)`, `listarDestacados(tiendaId)`, `listarCatalogoPublico(slug, params)`
- [x] T004 [P] Crear `src/modules/tienda/domain/ports/ITiendaNotificador.ts` con métodos: `configuracionActualizada(tenantId, tiendaId)`, `destacadosActualizados(tenantId, tiendaId)`, `nuevaValoracion(tenantId, tiendaId, userId, puntuacion)`, `nuevoComentario(tenantId, tiendaId, comentarioId)`, `nuevaPregunta(tenantId, tiendaId, preguntaId)`, `nuevoSeguidor(tenantId, tiendaId, userId)`

---

## Phase 2: Foundational — Prisma, migración y adaptadores de infraestructura

**Purpose**: Base de datos, repositorio y notificador. BLOQUEANTE para todas las user stories.

**⚠️ CRÍTICO**: Completar esta fase antes de iniciar cualquier user story.

- [ ] T005 Agregar modelo `ProductoDestacado` a `prisma/10-tenant.prisma`: campos `id`, `tiendaId → Tienda`, `productoId → Producto`, `orden Int @default(0)`, `createdAt`, `updatedAt`, `createdById`, `updatedById`; constraints `@@unique([tiendaId, productoId])`, `@@index([tiendaId, orden])`, `@@schema("tenant")`; agregar relaciones inversas `productosDestacados` en `Tienda` y `Producto`
- [ ] T006 Cambiar default de `TiendaPregunta.estado` en `prisma/80-social.prisma` de `@default(PENDIENTE)` a `@default(ACTIVO)` (ACTIVO = visible; INACTIVO = ocultada por propietario)
- [ ] T007 Ejecutar migración Prisma: `npm run db:migrate` — migration name: `tu-tienda-producto-destacado`; verificar que `ProductoDestacado` se crea en schema `tenant` y el default de `TiendaPregunta.estado` cambia a `ACTIVO`
- [ ] T008 Implementar `src/modules/tienda/infrastructure/tienda.prisma.repository.ts` implementando `ITiendaRepository`: `activar` (crea/actualiza `Tenant.esTienda=true` + crea `Tienda` y `Configuracion` si no existen); `desactivar` (pone `Tenant.esTienda=false`); `obtenerConfiguracion` (findFirst en `Configuracion` por `tiendaId`); `actualizarConfiguracion` (update campos tema/tipoDespliegue/tipoLineado); `obtenerPerfilPublico` (query tenant por slug con `esTienda=true`, join con Tienda, Configuracion, Localizacion, Propietario, EquipoDeTrabajo, Imagen, destacados con productos, métricas calculadas); `listarDirectorio` (query tenants con esTienda=true, join localizaciones, calcular distancia Haversine si lat/lng presentes, paginar); `agregarDestacado` (crear ProductoDestacado validando max 20 y producto activo/visible); `quitarDestacado` (delete); `reordenarDestacados` (batch update campo `orden`); `listarDestacados` (findMany por tiendaId ordenado por orden); `listarCatalogoPublico` (productos activos y visiblePublicamente del tenant)
- [ ] T009 Implementar `src/modules/tienda/infrastructure/tienda.socket.notificador.ts` implementando `ITiendaNotificador`: emitir eventos `tienda:configuracion:actualizada`, `tienda:destacados:actualizados`, `tienda:nueva:valoracion`, `tienda:nuevo:comentario`, `tienda:nueva:pregunta`, `tienda:nuevo:seguidor` a la sala `tenant:${tenantId}`
- [ ] T010 Crear `src/modules/tienda/infrastructure/tienda.notificador.provider.ts` con `setTiendaNotificador(n)` y `getTiendaNotificador()` (patrón provider igual que almacen.notificador.provider.ts)
- [ ] T011 Crear `src/modules/tienda/adapters/tienda.schema.ts` con schemas Zod: `ActualizarConfiguracionSchema` (tipoDespliegueVentas?, tema?, tipoLineado?), `AgregarDestacadoSchema` (productoId, orden?), `ReordenarDestacadosSchema` (orden: string[]), `DirectorioQuerySchema` (lat?, lng?, actividadEconomicaId?, categoriaId?, busqueda?, ordenarPor?, orden?, page?, limit?), `CatalogoPublicoQuerySchema` (categoriaId?, busqueda?, page?, limit?, ordenarPor?, orden?)

**Checkpoint**: Repositorio y notificador listos. Las user stories pueden comenzar.

---

## Phase 3: User Story 1 — Activación y Configuración del Perfil (P1) 🎯 MVP

**Goal**: El propietario puede activar/desactivar su perfil de tienda, configurar el tema visual y el layout del POS. El perfil público básico es accesible sin auth.

**Independent Test**: Ejecutar escenarios 1, 2 y 3 de `quickstart.md`. GET /api/public/tiendas/:slug retorna 200 con perfil completo para tenant activo, 404 para inactivo.

- [ ] T012 [P] [US1] Crear `src/modules/tienda/application/perfil/activar-tienda.usecase.ts`: recibe `{ tenantId, createdById }`, llama `repo.activar(...)`, emite `notificador.configuracionActualizada(...)`, retorna `{ esTienda: true, tiendaId }`
- [ ] T013 [P] [US1] Crear `src/modules/tienda/application/perfil/desactivar-tienda.usecase.ts`: recibe `{ tenantId }`, llama `repo.desactivar(...)`, retorna `{ esTienda: false }`
- [ ] T014 [P] [US1] Crear `src/modules/tienda/application/perfil/obtener-configuracion.usecase.ts`: recibe `tenantId`, obtiene `tiendaId` vía repo, retorna `Configuracion`; lanza `ConfiguracionNoEncontradaError` si no existe
- [ ] T015 [P] [US1] Crear `src/modules/tienda/application/perfil/actualizar-configuracion.usecase.ts`: recibe `{ tenantId, updatedById, ...campos }`, llama `repo.actualizarConfiguracion(...)`, emite `notificador.configuracionActualizada(tenantId, tiendaId)`, retorna configuración actualizada
- [ ] T016 [P] [US1] Crear `src/modules/tienda/application/perfil/obtener-perfil-publico.usecase.ts`: recibe `slug`, llama `repo.obtenerPerfilPublico(slug)`; lanza `TiendaNoEncontradaError` si `esTienda=false` o no existe
- [ ] T017 [US1] Crear `src/modules/tienda/adapters/tienda-staff.rest.ts` con endpoints scoped a `tenantId` y guarded por `requireCapabilidad("esTienda")` donde aplique: `PATCH /tenant/tienda/activar` (PROPIETARIO), `PATCH /tenant/tienda/desactivar` (PROPIETARIO), `GET /tenant/tienda/configuracion` (PROPIETARIO|ADMIN), `PATCH /tenant/tienda/configuracion` (PROPIETARIO|ADMIN); mapear errores `TiendaNoEncontradaError→404`, `ConfiguracionNoEncontradaError→404`
- [ ] T018 [US1] Crear `src/modules/tienda/adapters/tienda-publica.rest.ts` con endpoint público (sin auth): `GET /public/tiendas/:slug` usando `ObtenerPerfilPublicoUseCase`; mapear `TiendaNoEncontradaError→404`
- [ ] T019 [US1] Registrar routers de tienda en `src/server/index.ts`: importar `tienda-staff.rest.ts` y `tienda-publica.rest.ts`, registrar en `app.route(...)`, crear `TiendaSocketNotificador(io)` e inyectarlo vía `setTiendaNotificador(...)`
- [ ] T020 [P] [US1] Crear `tests/tienda/unit/application/activar-tienda.usecase.test.ts`: fake repo + fake notificador; verificar que activa correctamente, crea Tienda/Configuracion defaults, emite evento
- [ ] T021 [P] [US1] Crear `tests/tienda/unit/application/actualizar-configuracion.usecase.test.ts`: verificar update de tema y tipoDespliegueVentas, emisión de evento `configuracionActualizada`

**Checkpoint**: Tienda activable, configurable y perfil público disponible. US1 validable de forma independiente.

---

## Phase 4: User Story 2 — Directorio Público y Productos Destacados (P2)

**Goal**: Consumidores pueden buscar comercios por cercanía, filtrar, paginar. El perfil incluye vitrina de productos destacados. El equipo gestiona la selección de destacados.

**Independent Test**: Ejecutar escenarios 4, 5 de `quickstart.md`. GET /api/public/tiendas retorna directorio paginado; GET /api/public/tiendas/:slug incluye `productosDestacados`.

- [ ] T022 [P] [US2] Crear `src/modules/tienda/application/destacados/agregar-producto-destacado.usecase.ts`: valida max 20, valida producto activo y `visiblePublicamente=true`, llama `repo.agregarDestacado(...)`, emite `notificador.destacadosActualizados(...)`; lanza `ProductoDestacadoLimiteError`, `ProductoNoVisibleParaDestacadoError`, `ProductoDestacadoYaExisteError`
- [ ] T023 [P] [US2] Crear `src/modules/tienda/application/destacados/quitar-producto-destacado.usecase.ts`: llama `repo.quitarDestacado(...)`, emite `notificador.destacadosActualizados(...)`
- [ ] T024 [P] [US2] Crear `src/modules/tienda/application/destacados/reordenar-destacados.usecase.ts`: recibe `{ tenantId, orden: string[] }`, llama `repo.reordenarDestacados(...)`, emite `notificador.destacadosActualizados(...)`
- [ ] T025 [P] [US2] Crear `src/modules/tienda/application/destacados/listar-destacados.usecase.ts`: retorna `ProductoDestacado[]` ordenados por `orden asc`
- [ ] T026 [P] [US2] Crear `src/modules/tienda/application/directorio/listar-directorio.usecase.ts`: acepta params de `DirectorioQuerySchema`; si hay `lat`/`lng` ordena por distancia Haversine; respuesta con `{ data, total, page, limit, totalPaginas, hayPaginaSiguiente, hayPaginaAnterior }`
- [ ] T027 [P] [US2] Crear `src/modules/tienda/application/directorio/listar-catalogo-publico.usecase.ts`: retorna productos activos y visibles públicamente del tenant, con paginación
- [ ] T028 [US2] Extender `src/modules/tienda/adapters/tienda-staff.rest.ts` con endpoints de destacados: `GET /tenant/tienda/destacados`, `POST /tenant/tienda/destacados` (PROPIETARIO|ADMIN), `DELETE /tenant/tienda/destacados/:productoId` (PROPIETARIO|ADMIN), `PATCH /tenant/tienda/destacados/reordenar` (PROPIETARIO|ADMIN); mapear errores de límite y producto no visible → 422
- [ ] T029 [US2] Extender `src/modules/tienda/adapters/tienda-publica.rest.ts` con: `GET /public/tiendas` (directorio, sin auth), `GET /public/tiendas/:slug/productos` (catálogo público, sin auth); aplicar contrato uniforme de consulta con `makeQueryParamsSchema`
- [ ] T030 [P] [US2] Crear `tests/tienda/unit/application/agregar-producto-destacado.usecase.test.ts`: verificar límite 20, rechazo de producto inactivo/invisible, rechazo de duplicado, emisión de evento
- [ ] T031 [P] [US2] Crear `tests/tienda/unit/application/listar-directorio.usecase.test.ts`: verificar paginación, filtro por actividadEconomica, ordenación por cercanía cuando lat/lng presentes

**Checkpoint**: Directorio y vitrina de destacados funcionales. US2 validable independientemente.

---

## Phase 5: User Story 3 — Interacciones Sociales y Notificaciones (P3)

**Goal**: Consumidores pueden ocultar/mostrar preguntas (propietario). Propietario recibe notificaciones en tiempo real para nueva pregunta y nuevo seguidor. Se agrega endpoint de check de favorito.

**Independent Test**: Ejecutar escenarios 6, 7, 10 de `quickstart.md`. PATCH /preguntas/:id/ocultar cambia estado a INACTIVO; pregunta desaparece del listado público. Notificación llega al room del tenant.

- [ ] T032 [P] [US3] Agregar métodos `ocultarPregunta(preguntaId, tiendaId)` y `mostrarPregunta(preguntaId, tiendaId)` a la interfaz `src/modules/social/domain/ports/ITiendaSocialRepository.ts`
- [ ] T033 [P] [US3] Implementar `ocultarPregunta` y `mostrarPregunta` en `src/modules/social/infrastructure/tienda-social.prisma.repository.ts`: `update` el `estado` de `TiendaPregunta` a `INACTIVO` / `ACTIVO`; lanzar `TiendaPreguntaNoEncontradaError` si no existe o no pertenece a la tienda
- [ ] T034 [P] [US3] Agregar `TiendaPreguntaNoEncontradaError` a `src/modules/social/domain/social.errors.ts`
- [ ] T035 [P] [US3] Crear `src/modules/social/application/tienda/ocultar-pregunta-tienda.usecase.ts` y `mostrar-pregunta-tienda.usecase.ts`: delegan a `ITiendaSocialRepository.ocultarPregunta/mostrarPregunta`
- [ ] T036 [US3] Extender `src/modules/social/adapters/tienda-social.rest.ts` con endpoints de moderación: `PATCH /tiendas/:slug/preguntas/:preguntaId/ocultar` (PROPIETARIO|ADMIN), `PATCH /tiendas/:slug/preguntas/:preguntaId/mostrar` (PROPIETARIO|ADMIN); mapear `TiendaPreguntaNoEncontradaError→404`
- [ ] T037 [P] [US3] Agregar métodos `preguntaNueva(tenantId, payload)` y `seguidorNuevo(tenantId, payload)` a `src/modules/social/domain/ports/ISocialNotificador.ts` con sus payloads tipados
- [ ] T038 [P] [US3] Implementar `preguntaNueva` y `seguidorNuevo` en `src/modules/social/infrastructure/social.socket.notificador.ts`: emitir eventos `tienda:nueva:pregunta` y `tienda:nuevo:seguidor` a sala `tenant:${tenantId}`
- [ ] T039 [US3] Emitir `notificador.preguntaNueva(...)` desde `src/modules/social/application/tienda/preguntar-tienda.usecase.ts` (agregar `ISocialNotificador` al constructor si no está; este use case actualmente puede no usar notificador)
- [ ] T040 [US3] Emitir `notificador.seguidorNuevo(...)` desde `src/modules/social/application/tienda/toggle-seguir-tienda.usecase.ts` al seguir (no al dejar de seguir)
- [ ] T041 [US3] Agregar endpoint `GET /tiendas/:slug/favorito` a `src/modules/social/adapters/tienda-social.rest.ts` (requiere auth): retorna `{ esFavorito: boolean }` para el usuario autenticado
- [ ] T042 [P] [US3] Crear `tests/tienda/unit/application/ocultar-pregunta-tienda.usecase.test.ts`: verificar cambio de estado a INACTIVO, error si pregunta no existe

**Checkpoint**: Moderación de preguntas, notificaciones y check de favorito completos. US3 validable independientemente.

---

## Phase 6: User Story 4 — Publicaciones del Comercio (P4)

**Goal**: Solo PROPIETARIO y ADMIN pueden crear publicaciones. El feed de seguidores ya funciona via el módulo social existente.

**Independent Test**: Ejecutar escenario 8 de `quickstart.md`. POST /publicaciones con rol EMPLEADO retorna 403. Con PROPIETARIO/ADMIN retorna 201.

- [ ] T043 [US4] Agregar `requireRol(["PROPIETARIO", "ADMIN"])` al endpoint `POST /publicaciones` en `src/modules/social/adapters/publicacion-staff.rest.ts` (actualmente cualquier miembro autenticado puede crear publicaciones)

**Checkpoint**: Control de roles en publicaciones. US4 validable independientemente.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T044 Verificar que los filtros del listado público de preguntas en `listar-preguntas-tienda.usecase.ts` / `tienda-social.prisma.repository.ts` filtran `estado = ACTIVO` (excluyen preguntas ocultadas)
- [ ] T045 Actualizar `src/modules/social/adapters/tienda-social.rest.ts` para que `publicTiendaSocialRouter` compruebe que la tienda tiene `esTienda = true` antes de retornar datos (actualmente podría exponer datos de tenants con `esTienda = false`)
- [ ] T046 [P] Ejecutar `npx tsc --noEmit` y resolver todos los errores de TypeScript
- [ ] T047 [P] Ejecutar `npm test` y verificar que todos los tests existentes siguen pasando (sin regresiones)
- [ ] T048 Actualizar `specs/012-tu-tienda/checklists/requirements.md` marcando todos los ítems completados

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Sin dependencias — puede empezar de inmediato
- **Phase 2 (Foundational)**: Depende de Phase 1 — BLOQUEA todas las user stories
- **Phase 3 (US1)**: Depende de Phase 2 — MVP entregable
- **Phase 4 (US2)**: Depende de Phase 2 — requiere `ProductoDestacado` de Prisma
- **Phase 5 (US3)**: Depende de Phase 2 — extiende módulo social existente
- **Phase 6 (US4)**: Depende de Phase 2 — cambio mínimo a adapter existente
- **Phase 7 (Polish)**: Depende de Phases 3–6

### User Story Dependencies

- **US1 → US2**: US2 necesita que exista el perfil público (endpoint slug) para mostrar destacados
- **US2 → US3**: US3 no depende de US2 estrictamente (puede implementarse en paralelo)
- **US3 → US4**: US4 no depende de US3 (puede implementarse en paralelo con US3)

### Parallel Opportunities

- T002, T003, T004 pueden ejecutarse en paralelo (archivos independientes)
- T012–T016 (use cases US1) pueden ejecutarse en paralelo
- T022–T027 (use cases US2) pueden ejecutarse en paralelo
- T032–T035 y T037–T038 (US3 puertos + implementación) pueden ejecutarse en paralelo
- T046 y T047 (verificaciones finales) pueden ejecutarse en paralelo

---

## Parallel Example: Phase 3 (US1)

```
Lanzar en paralelo:
  T012: activar-tienda.usecase.ts
  T013: desactivar-tienda.usecase.ts
  T014: obtener-configuracion.usecase.ts
  T015: actualizar-configuracion.usecase.ts
  T016: obtener-perfil-publico.usecase.ts

Luego secuencial:
  T017: tienda-staff.rest.ts (depende de T012–T015)
  T018: tienda-publica.rest.ts (depende de T016)
  T019: server/index.ts wiring (depende de T017, T018)
```

---

## Implementation Strategy

### MVP (US1 — Activación y Perfil Básico)

1. Completar Phase 1 (Setup)
2. Completar Phase 2 (Foundational — migracion + repositorio)
3. Completar Phase 3 (US1 — activar/configurar/perfil público)
4. **VALIDAR**: `quickstart.md` escenarios 1–3
5. Entregar: tienda activable, configurable, perfil público visible

### Incremental

1. Setup + Foundational → base lista
2. US1 → perfil + configuración → **MVP**
3. US2 → directorio + vitrina destacados → búsqueda pública
4. US3 → moderación preguntas + notificaciones → engagement completo
5. US4 → restricción roles publicaciones → control editorial

---

## Notes

- `[P]` = archivos independientes, sin dependencias bloqueantes entre ellos
- `[US1/2/3/4]` = traza cada tarea a su user story para testeo independiente
- Los 12 use cases sociales de tienda ya existen — NO reimplementar
- `TiendaXxx` models en Prisma ya existen — solo agregar `ProductoDestacado`
- La función Haversine para distancia geoespacial va en `tienda.prisma.repository.ts` como raw query SQL o calculada en application layer
- El patrón provider (`getTiendaNotificador` / `setTiendaNotificador`) sigue el mismo patrón que `almacen.notificador.provider.ts`
