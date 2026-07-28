---

description: "Task list for 020-eliminar-archivo-r2"
---

# Tasks: Eliminación Real de Archivos en Cloudflare R2

**Input**: Design documents from `specs/020-eliminar-archivo-r2/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/eliminar-archivo.md, quickstart.md

**Tests**: Incluidos — `plan.md` (Project Structure) ya compromete archivos de test concretos (unit del caso de uso, unit del adaptador R2, integración del endpoint), consistente con el Artículo VIII de la constitución backend.

**Organization**: Tareas agrupadas por historia de usuario (US1/US2/US3 de `spec.md`) para permitir implementación y prueba independiente de cada una.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: Historia de usuario a la que pertenece (US1, US2, US3)
- Cada tarea incluye la ruta exacta de archivo

## Path Conventions

Proyecto único (`src/`, `tests/` en la raíz del repo) — extiende el slice hexagonal existente de `019-upload-r2-presigned` dentro de `src/modules/tenant/`.

## Nota

Sin fase de Setup: esta feature no agrega dependencias de producción ni
variables de entorno nuevas (research.md, plan.md § Technical Context) — se
reutiliza todo lo que `019-upload-r2-presigned` ya dejó instalado/configurado.

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Extender el puerto, los errores de dominio y el fake de test — piezas compartidas por las 3 historias de usuario

**⚠️ CRITICAL**: Ninguna historia de usuario puede implementarse hasta completar esta fase

- [X] T001 [P] Extender `IAlmacenamientoPort` con `eliminarArchivo(key: string): Promise<void>` y `extraerKeyDesdeUrlPublica(url: string): string | null` en `src/modules/tenant/domain/ports/IAlmacenamientoPort.ts` (data-model.md §1)
- [X] T002 [P] Agregar las clases de error `ReferenciaArchivoInvalida` y `ArchivoNoPerteneceATenant` en `src/modules/tenant/domain/tenant-upload.errors.ts` (data-model.md §3)
- [X] T003 Implementar `eliminarArchivo` (con `DeleteObjectCommand`) y `extraerKeyDesdeUrlPublica` (strip de `this.config.publicBaseUrl` + `"/"`, devuelve `null` si el prefijo no matchea) en `src/modules/tenant/infrastructure/r2.almacenamiento.adapter.ts` (depende de T001)
- [X] T004 [P] Implementar `eliminarArchivo` y `extraerKeyDesdeUrlPublica` en `tests/helpers/fake-almacenamiento.port.ts` (mismo prefijo fake `https://cdn.fake.local/` ya usado por `emitirUrlSubida`; `eliminarArchivo` solo registra la llamada, nunca lanza) (depende de T001)
- [X] T005 [P] Agregar `SolicitudEliminarArchivoSchema` (`{ url: string }`) y `EliminarArchivoResponseSchema` (`{ eliminado: true }`) en `src/modules/tenant/adapters/tenant-upload.schema.ts` (data-model.md §5)

**Checkpoint**: Puerto extendido, adaptador real y fake listos, schemas listos — las historias de usuario pueden implementarse

---

## Phase 2: User Story 1 - Eliminar una imagen ya subida (Priority: P1) 🎯 MVP

**Goal**: Camino feliz completo — un tenant elimina un archivo propio y deja de existir en R2.

**Independent Test**: Subir un archivo (flujo de `019`), confirmar que su `publicUrl` sirve contenido, llamar `DELETE /api/tenant/archivo` con esa URL, y verificar `200 { eliminado: true }` + que la URL ya no sirve contenido.

### Tests for User Story 1

- [X] T006 [P] [US1] Test unitario: `EliminarArchivoUseCase` con una `url` válida del propio tenant llama `almacenamiento.extraerKeyDesdeUrlPublica`, luego `almacenamiento.eliminarArchivo` con la key correcta (usando `FakeAlmacenamientoPort`) en `tests/unit/modules/tenant/eliminar-archivo.usecase.test.ts` (crear archivo)
- [X] T007 [P] [US1] Test unitario: `R2AlmacenamientoAdapter.eliminarArchivo` llama `DeleteObjectCommand` con `Bucket`/`Key` correctos, y `extraerKeyDesdeUrlPublica` hace el strip correcto del prefijo (`aws-sdk-client-mock`) en `tests/unit/modules/tenant/r2.almacenamiento.adapter.test.ts` (agregar casos)
- [X] T008 [P] [US1] Test de integración: `DELETE /api/tenant/archivo` con una `url` válida devuelve `200 { eliminado: true }`, con el port fakeado, en `tests/integration/modules/tenant/eliminar-archivo.test.ts` (crear archivo)

### Implementation for User Story 1

- [X] T009 [US1] Crear `EliminarArchivoUseCase` en `src/modules/tenant/application/eliminar-archivo.usecase.ts` — implementado con el chequeo de tenant (paso de US2) incluido desde el inicio, ver nota en T013
- [X] T010 [US1] Agregar la ruta `DELETE /archivo` a `tenantUploadRouter` en `src/modules/tenant/adapters/tenant-upload.rest.ts` — implementado con el mapeo 403 (paso de US2) incluido desde el inicio, ver nota en T014

**Checkpoint**: User Story 1 funciona de punta a punta, de forma independiente — MVP funcional (sin aislamiento entre tenants todavía).

---

## Phase 3: User Story 2 - No poder eliminar archivos de otro tenant (Priority: P1)

**Goal**: Agregar el chequeo de aislamiento multi-tenant sobre el caso de uso ya funcional de US1.

**Independent Test**: Con sesión sobre el Tenant A, llamar `DELETE /api/tenant/archivo` con una `url` cuyo segmento de tenant sea B, y verificar `403 ARCHIVO_NO_PERTENECE_A_TENANT` sin que el archivo de B se borre.

### Tests for User Story 2

- [X] T011 [P] [US2] Test unitario: `EliminarArchivoUseCase` lanza `ArchivoNoPerteneceATenant` cuando el segmento de tenant de la key no coincide con el `tenantId` de la sesión, SIN llamar a `almacenamiento.eliminarArchivo`, en `tests/unit/modules/tenant/eliminar-archivo.usecase.test.ts` (agregar caso)
- [X] T012 [P] [US2] Test de integración: `DELETE /api/tenant/archivo` con `url` de otro tenant devuelve `403 ARCHIVO_NO_PERTENECE_A_TENANT` en `tests/integration/modules/tenant/eliminar-archivo.test.ts` (agregar caso)

### Implementation for User Story 2

- [X] T013 [US2] Paso 4 del algoritmo (comparar `segments[1]` con `tenantId`, lanzar `ArchivoNoPerteneceATenant`) — implementado junto con T009 en vez de como incremento separado (la función era lo bastante chica como para escribirla completa de una vez; el resultado final cumple exactamente lo que pedía esta tarea, verificado por T011/T012 en verde)
- [X] T014 [US2] Mapeo `ArchivoNoPerteneceATenant` → `403` — implementado junto con T010, mismo motivo que T013

**Checkpoint**: User Stories 1 y 2 funcionan ambas de forma independiente — el endpoint ya es seguro entre tenants.

---

## Phase 4: User Story 3 - Eliminar un archivo que ya no existe (Priority: P3)

**Goal**: Confirmar el comportamiento idempotente (research.md §2: ya lo da gratis `DeleteObjectCommand`, no requiere código nuevo).

**Independent Test**: Llamar `DELETE /api/tenant/archivo` dos veces seguidas con la misma `url` y verificar que ambas responden `200 { eliminado: true }`.

### Tests for User Story 3

- [X] T015 [P] [US3] Test unitario: `EliminarArchivoUseCase.ejecutar` con una `url` válida resuelve sin error incluso si `almacenamiento.eliminarArchivo` se invoca sobre una key inexistente (el fake no distingue — documentar en el test que esto refleja el comportamiento real de `DeleteObjectCommand`) en `tests/unit/modules/tenant/eliminar-archivo.usecase.test.ts` (agregar caso)
- [X] T016 [P] [US3] Test de integración: dos llamadas seguidas a `DELETE /api/tenant/archivo` con la misma `url` devuelven `200 { eliminado: true }` ambas veces en `tests/integration/modules/tenant/eliminar-archivo.test.ts` (agregar caso)

### Implementation for User Story 3

- [X] T017 [US3] Confirmado — T015/T016 pasan sin cambios de código adicionales, el comportamiento nativo de `DeleteObjectCommand` (research.md §2) cubre la idempotencia

**Checkpoint**: Las 3 historias de usuario quedan funcionales de forma independiente.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verificación final que cruza las 3 historias

- [X] T018 [P] Ejecutar `npx tsc --noEmit` y confirmar 0 errores (plan.md § Constraints) — confirmado, 0 errores
- [X] T019 [P] Ejecutar la suite completa de Vitest y confirmar que todos los tests de `020` y los preexistentes de `019` pasan — confirmado, 180 passed / 42 skipped (Testcontainers, sin Docker en este entorno), 0 failed
- [ ] T020 Ejecutar manualmente los 4 escenarios de `specs/020-eliminar-archivo-r2/quickstart.md` contra R2 real, documentando cualquier desvío encontrado — **PENDIENTE**: requiere probar contra el bucket R2 real (no solo el port fakeado), a cargo del usuario

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: sin dependencias — puede iniciarse de inmediato. BLOQUEA las 3 historias de usuario.
- **User Stories (Phase 2-4)**: todas dependen de Foundational. US2 y US3 además dependen de que exista `EliminarArchivoUseCase` (creado en US1) — no son 100% independientes entre sí como US1/US2/US3 de `015`, porque agregan comportamiento incremental sobre la MISMA función, no sobre archivos separados.
- **Polish (Phase 5)**: depende de que las 3 historias estén completas.

### User Story Dependencies

- **US1 (P1)**: puede iniciarse tras Foundational. Es la base — crea `EliminarArchivoUseCase` y la ruta.
- **US2 (P1)**: depende de que US1 exista (agrega un paso de validación al mismo caso de uso ya creado). Puede desarrollarse inmediatamente después de US1, en la misma sesión de trabajo.
- **US3 (P3)**: depende de que US1 exista; no requiere cambios de código propios, solo tests que confirman un comportamiento ya presente desde US1.

### Parallel Opportunities

- T001, T002, T004, T005 (Foundational) son paralelas entre sí; T003 depende de T001.
- Dentro de cada historia, las tareas de test marcadas [P] son paralelas entre sí (archivos de test distintos, o el mismo archivo pero casos independientes — en ese caso ejecutar en paralelo igual es seguro porque son *agregados* de test, no ediciones que se pisen).
- T018 y T019 (Polish) son paralelas entre sí.

---

## Parallel Example: Foundational

```bash
Task: "Extender IAlmacenamientoPort en src/modules/tenant/domain/ports/IAlmacenamientoPort.ts"
Task: "Agregar ReferenciaArchivoInvalida y ArchivoNoPerteneceATenant en src/modules/tenant/domain/tenant-upload.errors.ts"
Task: "Agregar SolicitudEliminarArchivoSchema y EliminarArchivoResponseSchema en src/modules/tenant/adapters/tenant-upload.schema.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 únicamente)

1. Completar Phase 1: Foundational
2. Completar Phase 2: User Story 1
3. **Detenerse y validar**: probar US1 de forma independiente (subir → eliminar → verificar 404)
4. Ya hay una demo end-to-end del mecanismo completo, sin aislamiento entre tenants todavía

### Incremental Delivery

1. Foundational → puerto y schemas listos
2. + US1 → eliminación real funciona (MVP) — aceptable para un entorno de un solo tenant de prueba, NO para producción multi-tenant
3. + US2 → aislamiento entre tenants — recién acá es seguro exponerlo en producción
4. + US3 → confirmado el comportamiento idempotente (sin código nuevo)

**Nota de seguridad**: a diferencia de `015-wizard-imagenes-r2` (historias genuinamente independientes), acá **US2 no es opcional para producción** — desplegar solo US1 dejaría un endpoint que cualquier tenant autenticado podría usar para borrar archivos de otro tenant. La numeración P1/P1 en spec.md ya refleja esto (ambas son P1); este plan las secuencia como incremento porque comparten el mismo caso de uso, no porque US2 sea menos crítica.

---

## Notes

- [P] = archivos distintos o adiciones independientes al mismo archivo de test, sin dependencias entre sí.
- La etiqueta `[Story]` mapea cada tarea a su historia de spec.md para trazabilidad.
- Verificar que los tests fallan antes de implementar (TDD, Artículo VIII).
- Detenerse en cada checkpoint para validar la historia de forma independiente.
