---
description: "Task list for 026-configuracion-tenant-api"
---

# Tasks: Configuración del negocio — las pantallas que hoy no tienen backend

**Input**: `specs/026-configuracion-tenant-api/` — plan.md, spec.md, research.md, data-model.md, contracts/configuracion-tenant.md, quickstart.md

**Tests**: incluidos. El plan compromete tests unitarios por caso de uso con reglas y un test de contrato.

**Organization**: una fase por historia, en orden de prioridad. Después de Foundational, las
cinco son independientes entre sí, salvo los archivos que comparten (ver Dependencies).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizable (archivo distinto, sin dependencias pendientes)
- **[Story]**: US1–US5 de `spec.md`

## Convenciones para todas las tareas

- Rutas de entrada y salida, nombres de campos y códigos de error: **exactamente** los de
  `contracts/configuracion-tenant.md` y `data-model.md`.
- Toda búsqueda por id lleva `tenantId` del contexto (`c.get("tenantId")`). Un id ajeno
  da 404, igual que uno inexistente.
- Escritura con `requireRol(["PROPIETARIO", "ADMIN"])` salvo que la tarea diga otra cosa.
  Lectura sin guard de rol (el router ya exige `requireAuth` + `requireTenantActivo`).
- Errores de dominio → `{ error: err.code, message: err.message }` con el HTTP de la
  tabla de `data-model.md`.
- Patrones de referencia del repo: `src/modules/almacen/adapters/movimiento.rest.ts`
  (router + `paginadoSchema` + `c.req.valid`), `src/modules/almacen/infrastructure/almacen-inventario.port.provider.ts`
  (provider de puerto), `tests/integration/almacen-movimientos-contrato.test.ts` (test de contrato).

---

## Phase 1: Setup

- [X] T001 Registrar la línea base: `npx tsc --noEmit` y `pnpm test` en la rama `026-configuracion-tenant-api`. Anotar el resultado en la sección Notes de este archivo, para no confundir fallos preexistentes con regresiones

---

## Phase 2: Foundational (bloquea todas las historias)

- [X] T002 En `prisma/10-tenant.prisma`, según `data-model.md`:
  - `Propietario.userId`: quitar `@unique` y agregar `@@index([userId])`
  - `EquipoDeTrabajo.telefono` y `.domicilio`: pasar a `String?`
- [X] T003 Crear la migración `prisma/migrations/<ts>_configuracion_tenant/migration.sql`:
  - Generarla con `npx prisma migrate diff --config prisma/prisma.config.ts --from-config-datasource --to-schema prisma --script` (solo lectura, mismo método que la spec 020) y agregar a mano el `INSERT … SELECT` de backfill de `data-model.md`
  - Usar la tabla real de `TenantMember` (`@@map("member")`, en el schema que declare su `@@schema`) y los nombres reales de columnas
  - Correr `pnpm db:generate`
  - **No aplicarla**: se aplica en T047 con confirmación del usuario (depende de T002)
- [X] T004 [P] Agregar a `src/modules/tenant/domain/tenant.errors.ts` las 11 clases de error de la tabla de `data-model.md` (§Errores de dominio). Cada una con `readonly code` y `readonly statusCode`, siguiendo el estilo de `src/modules/almacen/domain/almacen.errors.ts`. `RolNoAsignableError` recibe y expone los roles válidos en el mensaje
- [X] T005 [P] Crear `src/modules/tenant/adapters/configuracion.schema.ts` con los validadores compartidos:
  - `TelefonoBolivianoSchema = z.string().regex(/^\d{7,8}$/)` (igual a `validators.ts` del frontend)
  - `IdParamSchema = z.object({ id: z.string() })`
  - `ReordenarSchema = z.object({ ids: z.array(z.string()).min(1) })`
  - `QueryListaOrdenadaSchema`: `makeQueryParamsSchema(["orden","createdAt"])` con `take` default 100
  - `z` importado de `@hono/zod-openapi`
- [X] T006 [P] Crear los tres routers vacíos, cada uno con `.use("*", requireAuth, requireTenantActivo)`:
  - `src/modules/tenant/adapters/configuracion-contenido.rest.ts` (`configuracionContenidoRouter`)
  - `src/modules/tenant/adapters/configuracion-negocio.rest.ts` (`configuracionNegocioRouter`)
  - `src/modules/tenant/adapters/configuracion-miembros.rest.ts` (`configuracionMiembrosRouter`)
- [X] T007 Montar los tres routers en `src/server/index.ts` con `app.route("/api/tenant", …)`, junto a `tenantRouter` y antes de que arranque el servidor (depende de T006)
- [X] T008 Crear `tests/integration/configuracion-tenant-contrato.test.ts` con la infraestructura del test de contrato:
  - `openapi.json` desde **la app completa de `server/index.ts`**, no desde `crearApp()`, que no monta las rutas de `tenant`. Si importar `index.ts` arranca el servidor, extraer el armado de la app a una función exportada y usarla en ambos lugares
  - helpers `get(path, method)`, `queryParams`, `bodyProps`, `propiedadesRespuesta`
  - un caso que verifica que `tests/integration/openapi-rutas-unicas.test.ts` sigue cubriendo la app completa (depende de T007)

**Checkpoint**: migración generada, routers montados, test de contrato listo

---

## Phase 3: User Story 1 — Gestionar quién trabaja en el negocio (P1) 🎯 MVP

**Goal**: invitar, cancelar invitación, cambiar rol y quitar miembro; quitar corta el acceso de inmediato

**Independent Test**: `quickstart.md` §4

### Tests for User Story 1

- [X] T009 [P] [US1] Test unitario de las reglas de roles en `tests/unit/modules/tenant/configuracion/roles-por-vertical.test.ts`:
  - `rolesAsignables`: solo tienda → `PROPIETARIO, ADMIN, VENDEDOR, BODEGUERO`; tienda + consultorio → la unión; ninguna vertical → `PROPIETARIO, ADMIN`
  - `validarCambioDeRol`: un ADMIN no puede asignar ni quitar `PROPIETARIO` (`SoloPropietarioError`); no se puede bajar al último propietario (`UnicoPropietarioError`); `owner` cuenta como `PROPIETARIO`
- [X] T010 [P] [US1] Tests unitarios con fakes de `IMiembrosRepository` e `INotificadorInvitacion` en `tests/unit/modules/tenant/configuracion/miembros.usecases.test.ts`:
  - invitar: crea la invitación pendiente a 7 días y envía el correo; `YaEsMiembroError`; `InvitacionPendienteError`; `RolNoAsignableError`
  - cancelar: pasa a `canceled`; una ajena o inexistente da `RecursoConfiguracionNoEncontrado`
  - cambiar rol: aplica `validarCambioDeRol`
  - quitar: borra el miembro **y** limpia las sesiones (verificar la llamada al fake); el único propietario no se puede quitar; notifica `miembroRemovido`
- [X] T011 [P] [US1] Casos de contrato de US1 en `tests/integration/configuracion-tenant-contrato.test.ts`:
  - existen `POST /api/tenant/invitaciones`, `DELETE /api/tenant/invitaciones/{id}`, `PATCH /api/tenant/miembros/{id}/rol` y `DELETE /api/tenant/miembros/{id}`, con el body declarado (`email`, `rol` como enum)
  - el 200 de `GET /miembros` incluye `rol`, `nombreCompleto`, `email`, `joinedAt`, y el de `GET /invitaciones` incluye `rol`

### Implementation for User Story 1

- [X] T012 [P] [US1] Crear `src/modules/tenant/domain/roles-por-vertical.ts` con `ROLES_POR_VERTICAL`, `rolesAsignables(verticales)`, `normalizarRol` (`owner` → `PROPIETARIO`) y `validarCambioDeRol(actorRol, rolActualObjetivo, rolNuevo, cantidadPropietarios)`, según research §8. Sin imports de infraestructura. Hace pasar T009
- [X] T013 [P] [US1] Crear los puertos `src/modules/tenant/domain/ports/IMiembrosRepository.ts` (miembro por id, rol del actor, cantidad de propietarios, verticales activas, existe miembro por email, invitación pendiente por email, crear o cancelar invitación, cambiar rol, `quitarMiembroYCerrarSesiones`) y `src/modules/tenant/domain/ports/INotificadorInvitacion.ts` (`enviarInvitacion({ email, invitacionId, nombreNegocio })`)
- [X] T014 [US1] Implementar los cuatro casos de uso en `src/modules/tenant/application/configuracion/`: `invitar-miembro.usecase.ts`, `cancelar-invitacion.usecase.ts`, `cambiar-rol-miembro.usecase.ts`, `quitar-miembro.usecase.ts`. Usar `ITenantNotificador` para `miembroRemovido`. Hace pasar T010 (depende de T004, T012, T013)
- [X] T015 [P] [US1] Crear `src/modules/tenant/infrastructure/miembros.prisma.repository.ts`. `quitarMiembroYCerrarSesiones` va en **una** `$transaction`: borra el `TenantMember` y hace `session.updateMany({ where: { userId, activeOrganizationId: tenantId }, data: { activeOrganizationId: null } })` (research §2) (depende de T013)
- [X] T016 [P] [US1] Crear `src/modules/tenant/infrastructure/resend.notificador-invitacion.ts`. Mismo remitente, asunto, URL (`${APP_URL}/invite/${id}`) y HTML que `sendInvitationEmail` en `better-auth.setup.ts`. Si falta `RESEND_API_KEY`, registra un `warn` y no falla (depende de T013)
- [X] T017 [US1] En `configuracion.schema.ts` agregar `ROLES = ["PROPIETARIO","ADMIN","VENDEDOR","BODEGUERO","MEDICO","RECEPCIONISTA","ENCARGADO","CHEF","MESERO"]`, `InvitarSchema { email, rol }`, `CambiarRolSchema { rol }`, `MiembroSchema` e `InvitacionSchema` según el contrato §6–§7 (depende de T005)
- [X] T018 [US1] Implementar las 4 rutas en `configuracion-miembros.rest.ts` según el contrato §6–§7 (`201` al invitar, `204` al cancelar y al quitar) (depende de T007, T014, T015, T016, T017)
- [X] T019 [US1] Alinear las respuestas existentes: en `TenantPrismaRepository.listarMiembros` / `listarInvitaciones` y en los `createRoute` de `GET /miembros` y `GET /invitaciones` (`src/modules/tenant/adapters/tenant.rest.ts`), **agregar** `rol` (normalizado), `nombreCompleto`, `email`, `estado: "activo"` y `joinedAt` a los miembros, y `rol` a las invitaciones, sin quitar campos. Declarar la respuesta con `paginadoSchema` si ya es paginada, o con su forma real si no. `GET /invitaciones` solo lista las `pending` no vencidas. Hace pasar T011 (depende de T017)

**Checkpoint**: `quickstart.md` §4, incluido el último caso (acceso cortado en la request siguiente)

---

## Phase 4: User Story 2 — Contenido del perfil: descripciones, imágenes, equipo (P1)

**Goal**: listar, crear, editar, borrar y reordenar los tres contenidos

**Independent Test**: `quickstart.md` §2–§3

### Tests for User Story 2

- [X] T020 [P] [US2] Test unitario de `validarReordenamiento` en `tests/unit/modules/tenant/configuracion/lista-ordenada.test.ts`: acepta una permutación exacta; rechaza faltantes, repetidos, ids ajenos y una lista vacía con elementos existentes
- [X] T021 [P] [US2] Tests unitarios de los casos de uso genéricos con un fake de `IListaOrdenadaRepository` en `tests/unit/modules/tenant/configuracion/lista-ordenada.usecases.test.ts`:
  - crear asigna `orden = max + 1`
  - el elemento 101 → `LimiteListaAlcanzadoError`
  - editar no cambia el orden
  - reordenar inválido no llama a `aplicarOrden`
  - editar o borrar un id inexistente → `RecursoConfiguracionNoEncontrado`
- [X] T022 [P] [US2] Casos de contrato de US2 en `tests/integration/configuracion-tenant-contrato.test.ts`:
  - existen las 14 operaciones del contrato §1–§3, con su body y la respuesta `paginadoSchema` en los GET
  - los campos de salida son los del contrato (`contenido`, `url`, `nombre`, `fotoUrl`)
  - **en runtime**, `PATCH /api/tenant/descripciones/reorder` no lo atiende el handler de `/{id}`: hacer el request con un id inexistente sin sesión no alcanza para probarlo, así que verificar con `app.routes` el orden de registro (research §4)

### Implementation for User Story 2

- [X] T023 [P] [US2] Crear `src/modules/tenant/domain/lista-ordenada.ts` con `LIMITE_LISTA = 100` y `validarReordenamiento(idsActuales, idsEnviados)` (lanza `OrdenDesactualizadoError`). Hace pasar T020
- [X] T024 [P] [US2] Crear el puerto genérico `src/modules/tenant/domain/ports/IListaOrdenadaRepository.ts<TItem, TCrear, TEditar>`: `listar(tenantId, {take, skip, search?})`, `buscar(tenantId, id)`, `contar`, `maxOrden`, `crear`, `editar`, `borrar`, `idsActuales`, `aplicarOrden(tenantId, ids)`
- [X] T025 [US2] Crear `src/modules/tenant/application/configuracion/lista-ordenada.usecases.ts` con `ListarElementos`, `CrearElemento`, `EditarElemento`, `BorrarElemento` y `ReordenarElementos`, genéricos sobre el puerto. `ReordenarElementos` devuelve la lista completa ya reordenada. Hace pasar T021 (depende de T004, T023, T024)
- [X] T026 [P] [US2] `src/modules/tenant/infrastructure/descripcion.prisma.repository.ts`: mapea `contenido` ↔ `descripcion`, ordena por `orden, createdAt, id`, y `aplicarOrden` usa una `$transaction` de `update`s (depende de T024)
- [X] T027 [P] [US2] `src/modules/tenant/infrastructure/imagen-local.prisma.repository.ts`: mapea `url` ↔ `imagenUrl`; `descripcion` ausente → `""`; un P2002 de Prisma → `ConflictoUnicidadConfiguracion` (depende de T024)
- [X] T028 [P] [US2] `src/modules/tenant/infrastructure/equipo.prisma.repository.ts`: mapea `nombre` ↔ `nombres` y `fotoUrl` ↔ `imagenUrl` (vacío → `null`); `search` busca en `nombres` y `cargo` sin distinguir mayúsculas; un P2002 → `ConflictoUnicidadConfiguracion` que indica si chocó el nombre o el teléfono (depende de T002, T024)
- [X] T029 [US2] En `configuracion.schema.ts` agregar los schemas de entrada y salida del contrato §1–§3 (`DescripcionSchema`, `CrearDescripcionSchema`, `ImagenLocalSchema`, `CrearImagenSchema`, `MiembroEquipoSchema`, `CrearEquipoSchema`, `EditarEquipoSchema = CrearEquipoSchema.partial()`) (depende de T005)
- [X] T030 [US2] Implementar las 14 rutas en `configuracion-contenido.rest.ts`. **Registrar cada `PATCH /x/reorder` antes que `PATCH /x/{id}`.** Respuestas `201` al crear y `204` al borrar. Hace pasar T022 (depende de T007, T025, T026, T027, T028, T029)

**Checkpoint**: `quickstart.md` §2–§3

---

## Phase 5: User Story 3 — Localizaciones (P2)

**Goal**: CRUD de localizaciones, sin borrar la última

**Independent Test**: `quickstart.md` §5 (localizaciones)

- [X] T031 [P] [US3] Tests unitarios en `tests/unit/modules/tenant/configuracion/localizaciones.usecases.test.ts`, con un fake: borrar la única → `UltimaLocalizacionError`; borrar cuando hay dos → ok; editar un id ajeno → `RecursoConfiguracionNoEncontrado`
- [X] T032 [P] [US3] Casos de contrato de las 4 operaciones del contrato §4 en `tests/integration/configuracion-tenant-contrato.test.ts`
- [X] T033 [P] [US3] Puerto `src/modules/tenant/domain/ports/ILocalizacionRepository.ts` y casos de uso `src/modules/tenant/application/configuracion/localizaciones.usecases.ts`. Hacen pasar T031 (depende de T004)
- [X] T034 [P] [US3] `src/modules/tenant/infrastructure/localizacion.prisma.repository.ts`, con `search` en `direccion`, `ciudad` y `barrio`, y orden `createdAt desc, id desc` (depende de T033)
- [X] T035 [US3] Schemas del contrato §4 en `configuracion.schema.ts` (latitud ±90, longitud ±180) y las 4 rutas en `configuracion-negocio.rest.ts`. Hace pasar T032 (depende de T007, T033, T034)

---

## Phase 6: User Story 4 — Propietario (P2)

**Goal**: consultar y editar el único propietario; todos los negocios tienen uno

**Independent Test**: `quickstart.md` §5 (propietario)

- [X] T036 [P] [US4] Tests unitarios en `tests/unit/modules/tenant/configuracion/propietario.usecases.test.ts`, con un fake: obtener devuelve una lista de 1; editar un id de otro negocio → `RecursoConfiguracionNoEncontrado`; editar parcial conserva los campos no enviados
- [X] T037 [P] [US4] Casos de contrato en `tests/integration/configuracion-tenant-contrato.test.ts`: existen `GET /api/tenant/propietarios` y `PATCH /api/tenant/propietarios/{id}`, y **no existen** `POST /api/tenant/propietarios` ni `DELETE /api/tenant/propietarios/{id}` (Q1)
- [X] T038 [P] [US4] Puerto `src/modules/tenant/domain/ports/IPropietarioRepository.ts`, casos de uso `src/modules/tenant/application/configuracion/propietario.usecases.ts` y repositorio `src/modules/tenant/infrastructure/propietario.prisma.repository.ts`. El repositorio mapea `nombre` ↔ `nombres` y `referencia*` ↔ `*Referencia`, y escribe `updatedById`. Hace pasar T036 (depende de T002, T004)
- [X] T039 [US4] Schemas del contrato §5 en `configuracion.schema.ts` (`telefono` con `TelefonoBolivianoSchema`) y las 2 rutas en `configuracion-negocio.rest.ts`. Si el negocio no tiene propietario (solo puede pasar si T003 no se aplicó), `GET` devuelve la lista vacía, no un error. Hace pasar T037 (depende de T007, T038)

---

## Phase 7: User Story 5 — Capacidades (P3)

**Goal**: consultar, activar y desactivar verticales, sin desactivar la última

**Independent Test**: `quickstart.md` §6

- [X] T040 [P] [US5] Tests unitarios en `tests/unit/modules/tenant/configuracion/capacidades.test.ts`:
  - `validarDesactivacion`: desactivar la única activa → `UltimaVerticalError`; con dos activas → ok
  - el caso de uso: delega en el activador correcto, es idempotente sin llamar al activador, y con un tipo sin activador registrado → error claro
- [X] T041 [P] [US5] Casos de contrato en `tests/integration/configuracion-tenant-contrato.test.ts`: `GET /api/tenant/capabilities` y `PATCH /api/tenant/capabilities/{tipo}`, con `tipo` declarado como enum `tienda|consultorio|restaurante` y body `{ activa: boolean }`
- [X] T042 [US5] Crear `src/modules/tenant/domain/capacidades.ts` (`TIPOS_VERTICAL`, `validarDesactivacion`), el puerto `src/modules/tenant/domain/ports/IActivadorVertical.ts` (`activar(tenantId, actorId)`, `desactivar(tenantId)`), el provider `src/modules/tenant/infrastructure/activador-vertical.provider.ts` (`registrarActivadorVertical(tipo, activador)` / `obtenerActivadorVertical(tipo)`) y `src/modules/tenant/application/configuracion/capacidades.usecases.ts`. Hace pasar T040 (depende de T004)
- [X] T043 [P] [US5] Implementar `IActivadorVertical` en cada vertical, envolviendo sus casos de uso existentes (research §7):
  - `src/modules/tienda/infrastructure/tienda.activador-vertical.ts`
  - `src/modules/consultorio/infrastructure/consultorio.activador-vertical.ts`
  - `src/modules/restaurante/infrastructure/restaurante.activador-vertical.ts`
  
  Antes de escribirlos, leer cada caso de uso para usar sus constructores y firmas reales; en particular, `DesactivarPerfilPublicoUseCase` de restaurante recibe un `slug` (depende de T042)
- [X] T044 [US5] Registrar los tres activadores en `src/server/index.ts` con `registrarActivadorVertical`, junto a los otros `set*Port` (depende de T043)
- [X] T045 [US5] Agregar a `configuracion-negocio.rest.ts` las 2 rutas del contrato §8, con `requireRol(["PROPIETARIO"])` en el PATCH. Hace pasar T041 (depende de T007, T042)
- [X] T046 [US5] En `src/modules/tienda/application/perfil/desactivar-tienda.usecase.ts`, aplicar `validarDesactivacion` antes de desactivar, para que `PATCH /api/tenant/tienda/desactivar` no saltee la regla. Leer las verticales activas del tenant desde el repositorio que ya recibe; si no expone ese dato, agregar un método de solo lectura. Mapear `UltimaVerticalError` a 422 en `tienda-staff.rest.ts` (depende de T042)

**Checkpoint**: `quickstart.md` §6

---

## Phase 8: Polish & Cross-Cutting

- [ ] T047 Aplicar la migración de T003 en la base de desarrollo con `pnpm db:deploy`, **solo con confirmación explícita del usuario**. Después verificar que los 3 negocios tienen exactamente un propietario
- [X] T048 `npx tsc --noEmit` → 0 errores nuevos respecto de T001
- [X] T049 `pnpm test` → verde, incluidos `openapi-rutas-unicas.test.ts` y `configuracion-tenant-contrato.test.ts`
- [X] T050 Repetir la auditoría por método y path de la spec (frontend vs. `/api/openapi.json` del servidor completo) y anotar el resultado acá. Esperado: ninguna de las 26 falta; solo quedan las 2 de propietario descartadas por Q1 y las 10 de *Fuera de alcance* (SC-007)
- [ ] T051 Ejecutar `quickstart.md` §2–§6 con dos negocios y anotar el resultado, en especial §3 (aislamiento) y el último caso de §4 (acceso cortado)
- [ ] T052 Cambiar `**Status**: Draft` a `**Status**: Implemented` en `specs/026-configuracion-tenant-api/spec.md`

---

## Dependencies & Execution Order

```
T001 → Foundational (T002–T008)
          ├─→ US1  T009–T019   (miembros e invitaciones)
          ├─→ US2  T020–T030   (descripciones, imágenes, equipo)
          ├─→ US3  T031–T035   (localizaciones)
          ├─→ US4  T036–T039   (propietario)
          └─→ US5  T040–T046   (capacidades)
                     ↓
              Polish T047–T052
```

**Archivos compartidos entre historias**: sus tareas no se paralelizan entre sí.
- `configuracion.schema.ts`: T017, T029, T035, T039
- `configuracion-negocio.rest.ts`: T035, T039, T045
- `configuracion-tenant-contrato.test.ts`: T011, T022, T032, T037, T041
- `src/server/index.ts`: T007, T044

## Parallel Examples

```text
# Foundational
T004 tenant.errors.ts  |  T005 configuracion.schema.ts  |  T006 tres routers

# US1
T009 roles test  |  T010 usecases test  |  T012 roles-por-vertical.ts  |  T013 puertos
T015 miembros repo  |  T016 resend notificador

# US2
T020, T021, T023, T024  →  T026 | T027 | T028 (tres repositorios)
```

## Implementation Strategy

**MVP: Foundational + US1.** Cierra el riesgo de seguridad (hoy no se puede quitar a
nadie) y deja la infraestructura armada.

Entrega incremental:
1. T001–T008
2. US1 → checkpoint §4
3. US2 → checkpoint §2–§3 (con US1, las dos P1)
4. US3 y US4 (P2) — chicas, se pueden hacer juntas
5. US5 (P3)
6. Polish, incluida la migración (T047) con confirmación

## Notes

- **El frontend también cambia.** La pantalla de propietarios pasa de lista a formulario (Q1). Los 8 hooks pueden quitar sus `@ts-ignore` cuando esté el contrato (SC-003). Ese trabajo va en una spec de `vendora-frontend`.
- **Fuera de alcance**, registrado en `research.md`: declarar los roles en Better-Auth (§1), que `requireTenantActivo` verifique la membresía en todo el backend (§2), un guard de tienda equivalente a `requireConsultorio` (§7), y mostrar las descripciones en la vitrina (§10).
- Línea base (T001, 2026-10-04): `tsc --noEmit` 0 errores; `vitest run` 57 archivos ✓ / 10 skipped, 419 tests ✓ / 42 skipped (incluye `openapi-rutas-unicas.test.ts`, sin commitear).
- Desvíos de US1:
  - El `GET /miembros` existente conserva `estado: "ACTIVO"` (mayúsculas); la pantalla tipa `"activo"`. No se cambió para mantener la alineación aditiva. Si la pantalla lo compara, ajustarlo en el frontend.
  - `tenant.notificador.provider.ts` es nuevo: los casos de uso de `tenant` necesitan el notificador sin importar `server/index.ts`.
  - El montaje de rutas se extrajo a `src/server/app.ts` (`crearAppCompleta`), que usan `index.ts` y los tests de contrato.
  - Los guards `LECTURA`/`ESCRITURA`/`SOLO_PROPIETARIO` son arrays mutables: con `as const`, `createRoute` los rechaza y `c.req.valid` pierde el tipo.
- Resultado (2026-10-04): `tsc --noEmit` 0 errores; `vitest run` 65 archivos ✓ / 10 skipped, 524 tests ✓ / 42 skipped (+105 respecto de T001).
- T050: auditoría por método y path contra el servidor completo (304 paths): de 38 llamadas faltantes se pasa a **12**, exactamente las esperadas. Son las 2 de propietario descartadas por Q1 (`POST /propietarios`, `DELETE /propietarios/{id}`) y las 10 de *Fuera de alcance*. Las 26 de configuración están todas.
- Smoke test en vivo: sin sesión, las rutas nuevas responden 401 y `GET /api/tenant` sigue en 401 (los guards por ruta no alteraron a los otros routers del prefijo).
- **Pendiente:**
  - T047: la migración `20261004000000_configuracion_tenant` está **creada y no aplicada**. El backfill se probó en modo lectura y selecciona exactamente los 2 negocios sin propietario.
  - T051: el quickstart necesita la migración aplicada y sesiones reales de dos negocios.
  - T052 queda para después de T051.
- `User.propietario` pasó a `User.propietarios` (lista) en `00-autenticacion.prisma`: es obligatorio al quitar `@unique` de `Propietario.userId`. Ningún código usaba esa relación.
