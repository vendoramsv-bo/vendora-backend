# Tasks: TuRestaurante — Perfil Público de Restaurante

**Input**: Design documents from `specs/013-tu-restaurante/`  
**Branch**: `013-tu-restaurante`  
**Total tasks**: 59  
**Tests**: Incluidos en Phase 8 (Polish) — no TDD explícito en la spec

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias incompletas)
- **[Story]**: Historia de usuario a la que pertenece (US1–US5)

---

## Phase 1: Setup — Schema Prisma (Prerequisite absoluto)

**Purpose**: Aplicar todos los cambios al schema Prisma y generar la migración. Sin este paso, ningún adaptador de infraestructura puede compilar.

**⚠️ CRÍTICO**: Completar los 4 tasks antes de iniciar cualquier otra phase.

- [ ] T001 Extender `prisma/10-tenant.prisma`: agregar campos a `Restaurante` (`especialidad String?`, `horarios Json?`, `fotos String[]`, `contactoPublico Json?`), cambiar `tipoServicio String?` a `TipoServicioRestaurante?`, y agregar relaciones hacia los 8 nuevos modelos sociales (`reacciones RestauranteReaccion[]`, `comentarios RestauranteComentario[]`, `valoraciones RestauranteValoracion[]`, `preguntas RestaurantePregunta[]`, `favoritos RestauranteFavorito[]`, `seguidores RestauranteSeguidor[]`)
- [ ] T002 [P] Extender `prisma/70-restaurante.prisma`: crear enum `TipoServicioRestaurante { MESA DELIVERY PARA_LLEVAR MIXTO @@schema("restaurante") }` y agregar valores `PENDIENTE`, `RECHAZADA`, `CANCELADA_CLIENTE` al enum `EstadoReserva`
- [ ] T003 [P] Extender `prisma/80-social.prisma`: agregar los 8 nuevos modelos `RestauranteReaccion`, `RestauranteComentario`, `RestauranteComentarioReaccion`, `RestauranteValoracion`, `RestaurantePregunta`, `RestauranteRespuesta`, `RestauranteFavorito`, `RestauranteSeguidor` siguiendo el patrón de los modelos `Tienda*` existentes (ver `data-model.md` para Prisma completo de cada modelo)
- [ ] T004 Ejecutar `npx prisma migrate dev --name tu-restaurante-public-profile` y verificar que compila sin errores; confirmar que los 8 nuevos modelos aparecen en el Prisma Client generado

**Checkpoint**: `npx prisma generate` sin errores → Phase 2 puede iniciar.

---

## Phase 2: Foundational — Domain Layer (Puertos e interfaces)

**Purpose**: Definir los contratos hexagonales que todos los use cases y adaptadores dependen.

**⚠️ CRÍTICO**: Completar antes de implementar cualquier use case.

- [ ] T005 [P] Crear `src/modules/restaurante/domain/ports/IRestaurantePublicoRepository.ts` con todos los métodos necesarios para US1–US4: `activar(tenantId)`, `desactivar(tenantId)`, `obtenerConfiguracion(tenantId)`, `actualizarConfiguracion(tenantId, datos)`, `obtenerPerfilPublico(slug)`, `listarDirectorio(params)`, `listarMenusPublicos(restauranteId, params)`, `crearReservaPublica(datos)`, `listarMisReservas(userId, params)`, `cancelarReservaPublica(reservaId, userId)`
- [ ] T006 [P] Crear `src/modules/restaurante/domain/ports/IRestaurantePublicoNotificador.ts` con métodos: `notificarPerfilActualizado(tenantId, slug)`, `notificarNuevaReserva(tenantId, reservaId, codigo)`, `notificarReservaActualizada(tenantId, reservaId, estado)`
- [ ] T007 [P] Crear `src/modules/restaurante/domain/restaurante-publico.errors.ts` con clases de error de dominio: `RestauranteNoActivoError`, `PerfilNoEncontradoError`, `TipoServicioSinReservasError`, `ReservaFechaInvalidaError`, `ReservaNoModificableError`, `ReservaNoEncontradaError`
- [ ] T008 [P] Crear `src/modules/social/domain/ports/IRestauranteSocialRepository.ts` con todos los métodos para US5: `reaccionar`, `comentar`, `listarComentarios`, `responderComentario`, `valorar`, `listarValoraciones`, `preguntar`, `responderPregunta`, `ocultarPregunta`, `mostrarPregunta`, `listarPreguntas`, `toggleFavorito`, `toggleSeguir`, `listarSeguidores`, `publicarNovedad`, `listarPublicaciones`
- [ ] T009 [P] Crear `src/modules/social/domain/ports/IRestauranteSocialNotificador.ts` con métodos: `notificarNuevaValoracion`, `notificarNuevoComentario`, `notificarNuevaPregunta`, `notificarNuevoSeguidor`, `notificarNuevaReaccion`
- [ ] T010 [P] Crear `src/modules/social/domain/restaurante-social.errors.ts` con: `RestauranteSocialNoEncontradoError`, `ValoracionFueraDeRangoError`, `PreguntaNoEncontradaError`, `PreguntaNoModificableError`, `ComentarioNoEncontradoError`

**Checkpoint**: TypeScript compila sin errores en los 6 nuevos archivos → Phase 3 puede iniciar.

---

## Phase 3: User Story 1 — Activación y configuración del perfil público (Priority: P1) 🎯 MVP

**Goal**: El propietario puede activar/desactivar el perfil público y configurar nombre, tipo de servicio, especialidad, horarios y fotos. El restaurante aparece (o desaparece) del directorio al activar/desactivar.

**Independent Test**: `POST /api/staff/restaurante/perfil/activar` con tenant válido → tenant aparece en `GET /api/public/restaurantes`; `POST /api/staff/restaurante/perfil/desactivar` → desaparece sin afectar menús internos.

- [ ] T011 [P] [US1] Crear `src/modules/restaurante/application/perfil-publico/activar-perfil-publico.usecase.ts`: recibe `tenantId`, verifica que el tenant existe, pone `esRestaurante=true`, crea registro `Restaurante` si no existe, emite `notificarPerfilActualizado`
- [ ] T012 [P] [US1] Crear `src/modules/restaurante/application/perfil-publico/desactivar-perfil-publico.usecase.ts`: pone `esRestaurante=false`, emite `notificarPerfilActualizado`; no altera menús ni reservas internas
- [ ] T013 [P] [US1] Crear `src/modules/restaurante/application/perfil-publico/actualizar-configuracion-publica.usecase.ts`: actualiza campos `especialidad`, `tipoServicio`, `capacidadMesas`, `capacidadComensales`, `duracionPromedioMin`, `horarios`, `fotos`, `contactoPublico` en el registro `Restaurante`; guarda `updatedById`; emite `notificarPerfilActualizado`
- [ ] T014 [P] [US1] Crear `src/modules/restaurante/application/perfil-publico/obtener-perfil-publico.usecase.ts`: recibe `tenantId`, retorna la configuración pública del restaurante incluyendo métricas agregadas básicas (total seguidores, puntuación promedio)
- [ ] T015 [US1] Crear `src/modules/restaurante/infrastructure/restaurante-publico.prisma.repository.ts` implementando `IRestaurantePublicoRepository` para los métodos de US1: `activar`, `desactivar`, `obtenerConfiguracion`, `actualizarConfiguracion`, `obtenerPerfilPublico` (por slug); usar Prisma client scoped por `tenantId`
- [ ] T016 [US1] Crear `src/modules/restaurante/infrastructure/restaurante-publico.socket.notificador.ts` implementando `IRestaurantePublicoNotificador`; emitir eventos a sala `tenant:${tenantId}` vía Socket.IO
- [ ] T017 [US1] Agregar schemas Zod para perfil staff en `src/modules/restaurante/adapters/restaurante.schema.ts`: `ActivarPerfilSchema`, `ActualizarConfiguracionPublicaSchema` (con validación de `TipoServicioRestaurante`, `horarios[]`, `fotos[]`); crear `src/modules/restaurante/adapters/restaurante-staff-publico.rest.ts` con rutas `POST /activar`, `POST /desactivar`, `PATCH /configuracion`, `GET /configuracion`; registrar router en el app principal bajo `/api/staff/restaurante/perfil`

**Checkpoint**: `POST /api/staff/restaurante/perfil/activar` → 200, tenant aparece en consulta directa a BD; desactivar → desaparece.

---

## Phase 4: User Story 2 — Directorio público de restaurantes (Priority: P2)

**Goal**: Consumidores sin autenticación pueden buscar restaurantes por cercanía, filtrar por tipo de servicio y especialidad, y ver el perfil completo de cada uno.

**Independent Test**: `GET /api/public/restaurantes?lat=-34.6&lng=-58.4&tipoServicio=MESA` sin token → respuesta paginada con restaurantes activos ordenados por distancia.

- [ ] T018 [US2] Crear `src/modules/restaurante/application/directorio-publico/listar-directorio.usecase.ts`: recibe `{ lat?, lng?, tipoServicio?, especialidad?, search?, orderBy, order, take, cursor }`; delega al repositorio; no requiere autenticación
- [ ] T019 [US2] Implementar `listarDirectorio` en `src/modules/restaurante/infrastructure/restaurante-publico.prisma.repository.ts`: query sobre tenants con `esRestaurante=true`, enriquecida con `_count` de seguidores y promedio de valoraciones; calcular `distanciaKm` con Haversine siguiendo el patrón de `tienda.prisma.repository.ts`; aplicar `makeQueryParamsSchema`/`paginate` de `core/query-params.ts`
- [ ] T020 [US2] Agregar Zod schema `DirectorioQuerySchema` en `src/modules/restaurante/adapters/restaurante.schema.ts`; crear `src/modules/restaurante/adapters/restaurante-publica.rest.ts` con `GET /` (directorio) y `GET /:slug` (perfil completo); registrar en app bajo `/api/public/restaurantes`

**Checkpoint**: `GET /api/public/restaurantes` sin auth → lista de restaurantes activos con paginación correcta; `GET /api/public/restaurantes/:slug` → perfil completo sin exponer datos internos.

---

## Phase 5: User Story 3 — Menú público del restaurante (Priority: P3)

**Goal**: Consumidores sin autenticación pueden ver los menús en estado PUBLICADO del restaurante con sus ítems (nombre, precio, disponibilidad). Los BORRADOR nunca son visibles.

**Independent Test**: Crear menú en BORRADOR → `GET /api/public/restaurantes/:slug/menus` no lo muestra. Publicar → aparece con sus ítems; `costo` de ingrediente ausente de la respuesta.

- [ ] T021 [US3] Crear `src/modules/restaurante/application/menu-publico/listar-menus-publicos.usecase.ts`: recibe `{ restauranteId, tiempoComida?, fecha?, take, cursor }`; filtra por `estado = PUBLICADO` y vigencia de fechas; nunca expone `MenuItem.costo` ni datos de almacén
- [ ] T022 [US3] Implementar `listarMenusPublicos` en `src/modules/restaurante/infrastructure/restaurante-publico.prisma.repository.ts`; agregar Zod schema `MenuPublicoQuerySchema`; extender `src/modules/restaurante/adapters/restaurante-publica.rest.ts` con `GET /:slug/menus` y los schemas de respuesta que excluyen costos

**Checkpoint**: `GET /api/public/restaurantes/:slug/menus` → menús PUBLICADO con ítems; menú BORRADOR ausente.

---

## Phase 6: User Story 4 — Reservas en línea (Priority: P4)

**Goal**: Consumidores autenticados crean, consultan y cancelan reservas desde el perfil público. Las reservas inician en PENDIENTE; el staff las confirma (RESERVADA), rechaza (RECHAZADA) o el consumidor cancela (CANCELADA_CLIENTE).

**Independent Test**: Consumidor autenticado → `POST /api/consumer/restaurantes/:slug/reservas` → 201 con `estado: PENDIENTE`; staff recibe notificación en tiempo real; `GET /api/consumer/mis-reservas` muestra la reserva; `DELETE /api/consumer/mis-reservas/:id` → `estado: CANCELADA_CLIENTE`.

- [ ] T023 [P] [US4] Crear `src/modules/restaurante/application/reserva-publica/crear-reserva-publica.usecase.ts`: valida `tipoServicio ∈ {MESA, MIXTO}`, valida `fechaLlegada > now()`, NO valida capacidad (orientativa), crea `Reserva` con `estado=PENDIENTE`, `canalOrigen="WEB"`, emite `notificarNuevaReserva`
- [ ] T024 [P] [US4] Crear `src/modules/restaurante/application/reserva-publica/listar-mis-reservas.usecase.ts`: filtra por `clienteId` (mapeado al userId del consumidor), aplica parámetros de paginación/filtro por estado
- [ ] T025 [P] [US4] Crear `src/modules/restaurante/application/reserva-publica/cancelar-reserva-publica.usecase.ts`: verifica que la reserva pertenece al usuario y está en `PENDIENTE`; cambia a `CANCELADA_CLIENTE`; emite `notificarReservaActualizada`; rechaza con `ReservaNoModificableError` si no está en PENDIENTE
- [ ] T026 [US4] Implementar métodos de reserva en `src/modules/restaurante/infrastructure/restaurante-publico.prisma.repository.ts`: `crearReservaPublica` (genera código `RES-YYYY-NNNN`), `listarMisReservas` (scoped por userId), `cancelarReservaPublica` (verifica ownership + estado); extender `src/modules/restaurante/infrastructure/restaurante-publico.socket.notificador.ts` con `notificarNuevaReserva` y `notificarReservaActualizada`
- [ ] T027 [US4] Agregar schemas Zod `CrearReservaPublicaSchema`, `MisReservasQuerySchema` en `src/modules/restaurante/adapters/restaurante.schema.ts`; extender `src/modules/restaurante/adapters/restaurante-publica.rest.ts` con `POST /:slug/reservas`, `GET /mis-reservas`, `DELETE /mis-reservas/:reservaId` bajo middleware de auth de consumidor; registrar en app bajo `/api/consumer`

**Checkpoint**: Flujo completo: crear reserva → `estado: PENDIENTE` → cancelar → `estado: CANCELADA_CLIENTE`; intentar cancelar reserva RESERVADA → 422.

---

## Phase 7: User Story 5 — Interacciones sociales del restaurante (Priority: P5)

**Goal**: Consumidores autenticados valoran (1–5), comentan (árbol recursivo), preguntan, siguen y marcan favoritos al restaurante. El staff publica novedades y modera preguntas. Todo ocurre en tiempo real.

**Independent Test**: Valorar restaurante → puntuación promedio se actualiza en `GET /api/public/restaurantes/:slug`; segunda valoración reemplaza la primera; seguir → `totalSeguidores` incrementa; staff oculta pregunta → desaparece del endpoint público.

### Use cases — subdomain `restaurante` (módulo `social`)

- [ ] T028 [P] [US5] Crear `src/modules/social/application/restaurante/reaccionar-restaurante.usecase.ts`: upsert de `RestauranteReaccion`; emite `notificarNuevaReaccion`
- [ ] T029 [P] [US5] Crear `src/modules/social/application/restaurante/comentar-restaurante.usecase.ts`: crea `RestauranteComentario` con soporte de `padreId` para árbol recursivo; emite `notificarNuevoComentario`
- [ ] T030 [P] [US5] Crear `src/modules/social/application/restaurante/listar-comentarios-restaurante.usecase.ts`: lista comentarios raíz con `totalRespuestas`; acepta `padreId` para cargar respuestas; paginación uniforme
- [ ] T031 [P] [US5] Crear `src/modules/social/application/restaurante/responder-comentario-restaurante.usecase.ts`: valida que el comentario padre existe y tiene estado ACTIVO
- [ ] T032 [P] [US5] Crear `src/modules/social/application/restaurante/valorar-restaurante.usecase.ts`: upsert de `RestauranteValoracion` (única por restauranteId+userId); valida `puntuacion ∈ [1..5]`; emite `notificarNuevaValoracion`
- [ ] T033 [P] [US5] Crear `src/modules/social/application/restaurante/listar-valoraciones-restaurante.usecase.ts`: paginación uniforme, ordenable por `puntuacion` o `createdAt`
- [ ] T034 [P] [US5] Crear `src/modules/social/application/restaurante/preguntar-restaurante.usecase.ts`: crea `RestaurantePregunta` con `estado=ACTIVO`; emite `notificarNuevaPregunta`
- [ ] T035 [P] [US5] Crear `src/modules/social/application/restaurante/responder-pregunta-restaurante.usecase.ts`: crea `RestauranteRespuesta`; solo usuarios del tenant con rol PROPIETARIO/ADMIN o el staff pueden responder
- [ ] T036 [P] [US5] Crear `src/modules/social/application/restaurante/ocultar-pregunta-restaurante.usecase.ts`: cambia `RestaurantePregunta.estado` a `INACTIVO`; valida que el ejecutor es PROPIETARIO/ADMIN del tenant
- [ ] T037 [P] [US5] Crear `src/modules/social/application/restaurante/mostrar-pregunta-restaurante.usecase.ts`: cambia `RestaurantePregunta.estado` a `ACTIVO`; misma validación de rol
- [ ] T038 [P] [US5] Crear `src/modules/social/application/restaurante/listar-preguntas-restaurante.usecase.ts`: endpoint público filtra `estado=ACTIVO`; endpoint staff lista todas incluyendo INACTIVO; paginación uniforme
- [ ] T039 [P] [US5] Crear `src/modules/social/application/restaurante/toggle-favorito-restaurante.usecase.ts`: crea o elimina `RestauranteFavorito` (único por restauranteId+userId)
- [ ] T040 [P] [US5] Crear `src/modules/social/application/restaurante/toggle-seguir-restaurante.usecase.ts`: crea o elimina `RestauranteSeguidor`; emite `notificarNuevoSeguidor`
- [ ] T041 [P] [US5] Crear `src/modules/social/application/restaurante/listar-seguidores-restaurante.usecase.ts`: paginación uniforme
- [ ] T042 [P] [US5] Crear `src/modules/social/application/publicacion-restaurante/publicar-novedad.usecase.ts`: crea `Publicacion` con `tenantId` del restaurante activo, `estado=PUBLICADO`; solo PROPIETARIO/ADMIN
- [ ] T043 [P] [US5] Crear `src/modules/social/application/publicacion-restaurante/listar-publicaciones.usecase.ts`: filtra por `tenantId` con `esRestaurante=true`; orden descendente por `publicadoEn`; paginación uniforme

### Infrastructure (módulo `social`)

- [ ] T044 [US5] Crear `src/modules/social/infrastructure/restaurante-social.prisma.repository.ts` implementando `IRestauranteSocialRepository` con todos los métodos de T028–T043; seguir el patrón de `tienda.prisma.repository.ts` del módulo `tienda`
- [ ] T045 [US5] Crear `src/modules/social/infrastructure/restaurante-social.socket.notificador.ts` implementando `IRestauranteSocialNotificador`; emitir a sala `tenant:${tenantId}` y sub-sala `tenant:${tenantId}:restaurante`

### Adapters (módulo `social`)

- [ ] T046 [US5] Crear `src/modules/social/adapters/restaurante-social.schema.ts` con todos los schemas Zod para los endpoints sociales: `ValorarSchema`, `ComentarSchema`, `PreguntarSchema`, `ResponderPreguntaSchema`, `ReaccionarSchema`, `PublicarNovedadSchema` y los schemas de respuesta (sin datos privados del tenant)
- [ ] T047 [US5] Crear `src/modules/social/adapters/restaurante-social-publica.rest.ts` con endpoints GET públicos (sin auth): `GET /api/public/restaurantes/:slug/valoraciones`, `GET /api/public/restaurantes/:slug/comentarios`, `GET /api/public/restaurantes/:slug/preguntas`, `GET /api/public/restaurantes/:slug/publicaciones`
- [ ] T048 [US5] Crear `src/modules/social/adapters/restaurante-social-consumer.rest.ts` con endpoints POST de consumidor autenticado: `POST /:slug/valorar`, `POST /:slug/comentar`, `POST /:slug/preguntar`, `POST /:slug/toggle-seguir`, `POST /:slug/toggle-favorito`, `POST /:slug/reaccionar`; bajo middleware de auth de consumidor
- [ ] T049 [US5] Crear `src/modules/social/adapters/restaurante-social-staff.rest.ts` con endpoints de staff (guard `esRestaurante`): `POST /api/staff/restaurante/publicaciones`, `POST /preguntas/:preguntaId/responder`, `PATCH /preguntas/:preguntaId/ocultar`, `PATCH /preguntas/:preguntaId/mostrar`
- [ ] T050 [US5] Registrar los 4 nuevos routers sociales en el app principal; verificar que los 8 eventos Socket.IO del contrato `api-restaurante-publico.md` se emiten correctamente

**Checkpoint**: Valorar → promedio actualizado en directorio; seguir → totalSeguidores incrementa; staff oculta pregunta → desaparece de endpoint público; publicar novedad → aparece en `GET /api/public/restaurantes/:slug/publicaciones`.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Tests unitarios y de integración según `quickstart.md`; verificación de privacidad.

- [ ] T051 [P] Escribir unit test `src/modules/restaurante/application/perfil-publico/__tests__/activar-perfil-publico.usecase.spec.ts`: happy path + idempotente si ya activo + tenant inexistente
- [ ] T052 [P] Escribir unit test `src/modules/restaurante/application/reserva-publica/__tests__/crear-reserva-publica.usecase.spec.ts`: happy path + error si tipoServicio=DELIVERY + error si fechaLlegada pasada + acepta si numeroComensales supera capacidad (orientativa)
- [ ] T053 [P] Escribir unit test `src/modules/restaurante/application/reserva-publica/__tests__/cancelar-reserva-publica.usecase.spec.ts`: cancela si PENDIENTE + error si RESERVADA + error si ownership distinto
- [ ] T054 [P] Escribir unit test `src/modules/social/application/restaurante/__tests__/valorar-restaurante.usecase.spec.ts`: primera valoración + segunda valoración reemplaza + puntuacion fuera de [1..5] lanza error
- [ ] T055 [P] Escribir unit test `src/modules/social/application/restaurante/__tests__/ocultar-pregunta-restaurante.usecase.spec.ts`: PROPIETARIO puede ocultar + consumidor lanza error de permisos
- [ ] T056 Escribir integration test `src/modules/restaurante/infrastructure/__tests__/restaurante-publico.prisma.repository.spec.ts` con Testcontainers: CRUD perfil + listarDirectorio con Haversine + listarMenusPublicos filtra BORRADOR
- [ ] T057 Escribir integration test `src/modules/social/infrastructure/__tests__/restaurante-social.prisma.repository.spec.ts` con Testcontainers: valoraciones (upsert), comentarios árbol recursivo, preguntas ocultar/mostrar
- [ ] T058 Auditoría de privacidad: ejecutar requests en `api.http` contra todos los endpoints públicos y verificar que ninguna respuesta contiene campos `costo`, `costoIngredientes`, `totalEstimado`, `ventaId`, ni datos de `Almacen`/`AperturaCierreDeCaja`/`Compra`; documentar resultado en `specs/013-tu-restaurante/checklists/requirements.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Schema)**: Sin dependencias — empezar aquí
- **Phase 2 (Domain)**: Depende de Phase 1 (Prisma generate completado) — **bloquea todas las fases de US**
- **Phase 3 (US1)**: Depende de Phase 2 — MVP mínimo entregable
- **Phase 4 (US2)**: Depende de Phase 2 — reutiliza repo parcial de US1 (T015)
- **Phase 5 (US3)**: Depende de Phase 2 — extiende repo de US1/US2 (T015, T019)
- **Phase 6 (US4)**: Depende de Phase 2 — extiende repo y notificador de US1
- **Phase 7 (US5)**: Depende de Phase 2 — módulo `social` independiente del `restaurante`
- **Phase 8 (Polish)**: Depende de todas las fases de US completadas

### User Story Dependencies

- **US1 (P1)**: Puede iniciar tras Phase 2 — no depende de otras US
- **US2 (P2)**: Puede iniciar tras Phase 2 — reutiliza `restaurante-publico.prisma.repository.ts` de US1
- **US3 (P3)**: Puede iniciar tras Phase 2 — extiende mismo repo (agregar método)
- **US4 (P4)**: Puede iniciar tras Phase 2 — extiende mismo repo y notificador
- **US5 (P5)**: Puede iniciar tras Phase 2, **en paralelo con US1–US4** (módulo `social` separado)

### Within Each User Story

- Ports (Phase 2) antes que use cases
- Use cases antes que infrastructure
- Infrastructure antes que adapters
- Modelos `[P]` dentro de una story pueden ejecutarse en paralelo

---

## Parallel Example: User Story 5

```bash
# Los 16 use cases de US5 son todos paralelos entre sí (archivos distintos):
- T028 reaccionar-restaurante.usecase.ts
- T029 comentar-restaurante.usecase.ts
- T030 listar-comentarios-restaurante.usecase.ts
- T031 responder-comentario-restaurante.usecase.ts
- T032 valorar-restaurante.usecase.ts
- T033 listar-valoraciones-restaurante.usecase.ts
- T034 preguntar-restaurante.usecase.ts
- T035 responder-pregunta-restaurante.usecase.ts
- T036 ocultar-pregunta-restaurante.usecase.ts
- T037 mostrar-pregunta-restaurante.usecase.ts
- T038 listar-preguntas-restaurante.usecase.ts
- T039 toggle-favorito-restaurante.usecase.ts
- T040 toggle-seguir-restaurante.usecase.ts
- T041 listar-seguidores-restaurante.usecase.ts
- T042 publicar-novedad.usecase.ts
- T043 listar-publicaciones.usecase.ts
# Luego T044 (repository) y T045 (notificador) en paralelo entre sí
# Luego T046–T049 (adapters) en paralelo entre sí
# Luego T050 (registrar rutas)
```

## Parallel Example: Phase 2 (Domain setup)

```bash
# Los 6 tasks de Phase 2 son todos paralelos:
- T005 IRestaurantePublicoRepository
- T006 IRestaurantePublicoNotificador
- T007 restaurante-publico.errors.ts
- T008 IRestauranteSocialRepository
- T009 IRestauranteSocialNotificador
- T010 restaurante-social.errors.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1 (schema + migración)
2. Completar Phase 2 (domain layer)
3. Completar Phase 3 (US1: activar/desactivar/configurar perfil)
4. **STOP y VALIDAR**: staff puede activar perfil y actualizar configuración
5. Deploy parcial si se necesita demo temprano

### Incremental Delivery

1. Phase 1 + 2 → Foundation lista
2. + Phase 3 (US1) → Staff puede configurar el perfil público ✓
3. + Phase 4 (US2) → Consumidores pueden descubrir restaurantes ✓
4. + Phase 5 (US3) → Consumidores ven el menú del día ✓
5. + Phase 6 (US4) → Consumidores pueden reservar mesa online ✓
6. + Phase 7 (US5) → Tejido social completo (valoraciones, comentarios, seguimiento) ✓
7. + Phase 8 → Tests + auditoría de privacidad ✓

### Parallel Team Strategy

Con dos desarrolladores:
1. Ambos completan Phase 1 y Phase 2 juntos
2. Una vez Phase 2 completado:
   - Dev A: US1 → US2 → US3 → US4 (módulo `restaurante`)
   - Dev B: US5 (módulo `social`, completamente independiente)

---

## Notes

- [P] = archivos distintos, sin dependencias incompletas dentro de la misma phase
- [Story] mapea cada task a su historia de usuario para trazabilidad
- Las US3, US4 extienden el mismo repositorio de US1/US2 — no recrear, agregar métodos
- US5 es completamente paralela a US1–US4 (módulo `social` separado)
- Patrón de referencia para todo: `src/modules/tienda/` (feature 012-tu-tienda)
- Verificar tests FAIL antes de implementar en Phase 8
- Commit lógico después de cada checkpoint de fase
