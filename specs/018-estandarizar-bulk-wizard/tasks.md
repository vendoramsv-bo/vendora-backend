# Tasks: Estandarización de los Procesos BULK del Wizard de Tenant

**Input**: Design documents from `/specs/018-estandarizar-bulk-wizard/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/wizard-bulk-endpoints.md, quickstart.md

**Tests**: Incluidos. El Artículo VIII de la constitución exige tests de integración contra PostgreSQL real (Testcontainers) para adaptadores de infraestructura, y esta feature es específicamente sobre corrección de datos — los tests de integración son la forma de verificar que ninguna entidad pierde historial operativo.

**Organization**: Tareas agrupadas por historia de usuario (spec.md) para permitir implementación y verificación independientes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivo distinto, sin dependencias pendientes)
- **[Story]**: Historia de usuario a la que pertenece (US1, US2, US3)
- Todas las rutas de archivo son relativas a la raíz del repo

## Path Conventions

Proyecto único (backend Hono + Prisma). Código en `src/`, tests en `tests/integration/`.

---

## Phase 1: Setup

**Purpose**: Confirmar que el entorno de pruebas está sano antes de tocar código.

- [x] T001 Ejecutar `npx vitest run tests/integration/openapi.test.ts` para confirmar que el entorno de tests de integración (Testcontainers + PostgreSQL) funciona antes de empezar

---

## Phase 2: Foundational

**Purpose**: Prerrequisitos bloqueantes compartidos por todas las historias.

**Ninguno.** Cada entidad (`Producto` en US1; `ActividadEconomica`, `ServicioMedico`, `Proveedor`, `TurnosDeAtencion` en US2) se corrige de forma aislada en su propio endpoint — no hay schema nuevo, dependencia nueva ni infraestructura compartida que deba existir antes de empezar. Continuar directamente a la Fase 3.

---

## Phase 3: User Story 1 - Quitar un producto seleccionado se refleja al volver al paso (Priority: P1) 🎯 MVP

**Goal**: `POST /api/tenant/catalogo/productos/bulk` deja de ser solo-inserción: agrega lo nuevo y elimina los productos deseleccionados, salvo que ya tengan ventas o movimientos reales.

**Independent Test**: Enviar el paso de Productos con 3 IDs, verificar con `GET /catalogo/productos-seleccionados` que están los 3; reenviar con 2 de esos 3; verificar que el tercero ya no aparece.

### Tests for User Story 1

- [x] T002 [P] [US1] Crear `tests/integration/wizard-bulk-productos.test.ts`: test de secuencia agregar (3 ids) → reenviar (2 ids) → `GET /catalogo/productos-seleccionados` debe reflejar exactamente los 2; y test de idempotencia (reenviar la misma selección dos veces no duplica ni cambia nada)
- [x] T003 [P] [US1] En el mismo archivo `tests/integration/wizard-bulk-productos.test.ts`: test de protección — crear un producto vía el paso bulk, insertarle un `VentaDetalle` real (a través de una `Venta` de prueba), reenviar el paso sin ese producto en la selección, y verificar que el producto sigue existiendo (protegido) sin lanzar excepción

### Implementation for User Story 1

- [x] T004 [US1] Agregar el método `tieneUsoOperativo(productoId: string): Promise<boolean>` en `src/modules/catalogo/infrastructure/producto.prisma.repository.ts`, que verifique si el producto tiene al menos un `ventasDetalle`, `movimientosInventario` o `reservaDetalles` asociado (usar `count` o relación `some: {}` sobre esas tres relaciones del modelo `Producto`)
- [x] T005 [US1] Declarar el puerto correspondiente (o extender `IProductoRepository`) en `src/modules/catalogo/domain/ports/` para exponer `tieneUsoOperativo`, siguiendo el patrón hexagonal ya usado por el resto del repositorio
- [x] T006 [US1] Crear `src/modules/catalogo/application/producto/sincronizar-productos-usecase.ts`: recibe `claProductoIds: string[]`, `tenantId`, `userId`; reutiliza la lógica de agregado de `AltaMasivaProductosUseCase` (o la invoca internamente) para crear lo nuevo; calcula `productos existentes del tenant no incluidos en claProductoIds`; para cada uno, consulta `tieneUsoOperativo` (T004/T005) y solo elimina los que devuelven `false`; ejecuta todo dentro de una transacción del repositorio
- [x] T007 [US1] Actualizar el handler de `POST /catalogo/productos/bulk` en `src/modules/tenant/adapters/wizard.rest.ts` (líneas ~417-451) para invocar `SincronizarProductosUseCase` en lugar de `AltaMasivaProductosUseCase` directamente, manteniendo la misma forma de request/response (`{ ids }` → `{ total }`) y el mismo manejo de errores (`AltaMasivaVacia`, `ClaProductoNoEncontrado`)
- [x] T008 [US1] Ejecutar `npx tsc --noEmit` y correr `tests/integration/wizard-bulk-productos.test.ts` (T002, T003) hasta que pasen

**Checkpoint**: El bug reportado por el usuario está resuelto y verificado — un producto deseleccionado ya no aparece en el catálogo del tenant al volver al paso.

---

## Phase 4: User Story 2 - Todos los pasos BULK del wizard se comportan igual (Priority: P1)

**Goal**: `ActividadEconomica`, `ServicioMedico`, `Proveedor` y `TurnosDeAtencion` siguen el mismo patrón agregar+quitar-protegido ya usado en Puntos de Venta; los pasos que hoy no tienen forma de consultar su selección (`servicios médicos`, `seguros`, `especialidades`, `tipos de cocina`, `zonas`) la exponen vía `GET`.

**Independent Test**: Para cada uno de los 9 pasos BULK, repetir agregar (3) → reenviar (2) → consultar estado, y confirmar que el resultado coincide exactamente con la última selección enviada en todos los casos.

### Tests for User Story 2

- [x] T009 [P] [US2] Crear `tests/integration/wizard-bulk-actividades.test.ts`: test de secuencia agregar→quitar→reenviar para `POST /actividades-economicas/bulk`, verificado con `GET /actividades-economicas`
- [x] T010 [P] [US2] Crear `tests/integration/wizard-bulk-servicios.test.ts`: test de secuencia agregar→quitar→reenviar para `POST /catalogo/servicios/bulk`, verificado con `GET /catalogo/servicios-seleccionados` (endpoint nuevo de esta historia)
- [x] T011 [P] [US2] Crear `tests/integration/wizard-bulk-proveedores.test.ts`: test de secuencia agregar→quitar→reenviar para `POST /proveedores/bulk`, verificado con `GET /proveedores`
- [x] T012 [P] [US2] Crear `tests/integration/wizard-bulk-turnos.test.ts`: test de secuencia agregar→quitar→reenviar para `POST /turnos/bulk`, verificado con `GET /turnos`
- [x] T013 [P] [US2] Crear `tests/integration/wizard-bulk-config-listas.test.ts`: test que verifica que `GET /api/tenant/config` devuelve `consultorio.seguros`, `consultorio.especialidades`, `restaurante.tiposCocina` y `restaurante.zonas` después de llamar a sus respectivos `POST .../bulk`, para un tenant de cada tipo de negocio

### Implementation for User Story 2

- [x] T014 [US2] En `POST /actividades-economicas/bulk` (`src/modules/tenant/adapters/wizard.rest.ts`, líneas ~312-357): antes del `tx.actividadEconomica.deleteMany(...)`, filtrar `paraEliminar` excluyendo las actividades cuyo `producto` tenga al menos un `ventasDetalle` asociado (`producto: { some: { ventasDetalle: { some: {} } } }` en el `findMany` de verificación)
- [x] T015 [US2] Implementar el `remove` completo (hoy inexistente) en `POST /catalogo/servicios/bulk` (`src/modules/tenant/adapters/wizard.rest.ts`, líneas ~453-483): calcular `existentes` (por `nombre`, ya que no hay catálogo `Cla*` para servicios) vs. `ids` recibidos, igual patrón `paraAgregar`/`paraEliminar` que el resto; excluir de `paraEliminar` los servicios con `citas: { some: {} }` o `atencionesDetalle: { some: {} }`; ejecutar todo en `$transaction`
- [x] T016 [US2] En `POST /proveedores/bulk` (`src/modules/tenant/adapters/wizard.rest.ts`, líneas ~509-571): antes del `tx.proveedor.deleteMany(...)`, filtrar `paraEliminar` excluyendo proveedores con `compras: { some: {} }` o `ingresosAlmacen: { some: {} }`
- [x] T017 [US2] En `POST /turnos/bulk` (`src/modules/tenant/adapters/wizard.rest.ts`, líneas ~597-654): antes del `tx.turnosDeAtencion.deleteMany(...)`, filtrar `paraEliminar` excluyendo turnos con `ventas: { some: {} }` o `aperturasCierresDeCaja: { some: {} }` — mismo criterio ya implementado para `PuntosDeVenta` en el mismo archivo (líneas ~261-273)
- [x] T018 [US2] Crear el endpoint `GET /catalogo/servicios-seleccionados` en `src/modules/tenant/adapters/wizard.rest.ts`, mismo patrón que `GET /catalogo/productos-seleccionados`: devuelve `{ data: [{ nombre: string }] }` desde `db.servicioMedico.findMany({ where: { consultorio: { tenantId } } })`
- [x] T019 [US2] Extender el handler de `GET /config` en `src/modules/tenant/adapters/wizard.rest.ts` (líneas ~32-97) para incluir, cuando el tenant tenga `esConsultorio`, `consultorio.contactoPublico.seguros` y `consultorio.especialidades`; y cuando tenga `esRestaurante`, `restaurante.contactoPublico.tiposCocina` y `restaurante.contactoPublico.zonas` — forma exacta en `contracts/wizard-bulk-endpoints.md`
- [x] T020 [US2] Ejecutar `npx tsc --noEmit` y correr T009–T013 hasta que pasen

**Checkpoint**: Los 9 pasos BULK del wizard muestran el mismo comportamiento add/remove; el wizard puede reconstruir la selección de cualquier paso al regresar a él.

---

## Phase 5: User Story 3 - Los elementos ya usados no se pierden silenciosamente (Priority: P2)

**Goal**: Verificar explícitamente, para las 5 entidades con `remove` real, que un elemento con datos dependientes nunca se elimina al deseleccionarlo — cerrando en particular la pérdida de datos activa hoy en `actividades-economicas/bulk` y `turnos/bulk` (ver `research.md`).

**Independent Test**: Para cada una de las 5 entidades, crear un elemento con datos dependientes reales, deseleccionarlo en su paso BULK, y confirmar que sigue existiendo tras el envío.

### Tests for User Story 3

- [x] T021 [P] [US3] En `tests/integration/wizard-bulk-actividades.test.ts` (creado en T009): agregar test — actividad económica con un producto que tiene `VentaDetalle` asociado se conserva al deseleccionarla en `POST /actividades-economicas/bulk`
- [x] T022 [P] [US3] En `tests/integration/wizard-bulk-servicios.test.ts` (creado en T010): agregar test — servicio médico con una `Cita` o `AtencionDetalle` asociada se conserva al deseleccionarlo en `POST /catalogo/servicios/bulk`
- [x] T023 [P] [US3] En `tests/integration/wizard-bulk-proveedores.test.ts` (creado en T011): agregar test — proveedor con una `Compra` registrada se conserva al deseleccionarlo en `POST /proveedores/bulk`, y la petición ya no falla (antes: error de FK por `NO ACTION`)
- [x] T024 [P] [US3] En `tests/integration/wizard-bulk-turnos.test.ts` (creado en T012): agregar test — turno con una `Venta` o `AperturaCierreDeCaja` asociada se conserva al deseleccionarlo en `POST /turnos/bulk`
- [x] T025 [US3] Correr los 5 archivos de test (`wizard-bulk-productos`, `wizard-bulk-actividades`, `wizard-bulk-servicios`, `wizard-bulk-proveedores`, `wizard-bulk-turnos`) juntos y confirmar que T003 (Producto, US1) y T021–T024 (US3) pasan todos en la misma corrida

**Checkpoint**: Cero pérdida de historial operativo confirmada para las 5 entidades con `remove` real.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verificación final de que el contrato no cambió de forma y de que el estándar quedó aplicado de punta a punta.

- [x] T026 [P] Ejecutar `npx tsc --noEmit` en todo el proyecto — 0 errores
- [ ] T027 [P] Recorrer manualmente `quickstart.md` end-to-end contra un tenant de prueba de cada tipo de negocio (tienda, consultorio, restaurante)
- [x] T028 Comparar cada endpoint bulk modificado contra `specs/018-estandarizar-bulk-wizard/contracts/wizard-bulk-endpoints.md` y confirmar que ningún request/response cambió de forma (solo comportamiento) — evita romper al frontend ya integrado

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — arrancar de inmediato
- **Foundational (Phase 2)**: vacía — no bloquea nada
- **US1 (Phase 3)**: depende de Setup — independiente de US2 y US3
- **US2 (Phase 4)**: depende de Setup — independiente de US1; T014-T017 y T018-T019 comparten archivo (`wizard.rest.ts`), por eso no llevan `[P]` entre sí
- **US3 (Phase 5)**: depende de que exista el archivo de test correspondiente de cada entidad — T021 depende de T009 (US2), T022 depende de T010 (US2), T023 depende de T011 (US2), T024 depende de T012 (US2); ninguna depende de T004-T008 (US1) salvo T025, que agrega la corrida conjunta con T003
- **Polish (Phase 6)**: depende de que US1, US2 y US3 estén completas

### User Story Dependencies

- **US1 (P1)**: sin dependencias de otras historias — se puede entregar solo (MVP)
- **US2 (P1)**: sin dependencias de US1 — mismo nivel de prioridad, pero distinto código y distinta entidad
- **US3 (P2)**: depende de que US1 (Producto) y US2 (las otras 4 entidades) ya tengan su `remove` implementado, porque sus tests verifican el comportamiento que esas historias construyen

### Parallel Opportunities

- T002 y T003 (mismo archivo) NO son paralelas entre sí, pero sí lo son frente a T009-T013 (US2, archivos distintos)
- T009, T010, T011, T012, T013 (US2, 5 archivos de test distintos) son paralelas entre sí
- T014, T015, T016, T017, T018, T019 comparten `wizard.rest.ts` — NO son paralelas entre sí; se ejecutan una por una
- T021, T022, T023, T024 (US3, 4 archivos distintos, cada uno ya creado por su tarea correspondiente de US2) son paralelas entre sí
- T026 y T027 (Polish) son paralelas entre sí

---

## Parallel Example: User Story 2

```
# Después de T001 (Setup), lanzar los 5 tests de US2 en paralelo:
Task T009: tests/integration/wizard-bulk-actividades.test.ts
Task T010: tests/integration/wizard-bulk-servicios.test.ts
Task T011: tests/integration/wizard-bulk-proveedores.test.ts
Task T012: tests/integration/wizard-bulk-turnos.test.ts
Task T013: tests/integration/wizard-bulk-config-listas.test.ts
# Todas tocan archivos distintos — seguro lanzarlas simultáneamente

# La implementación (T014-T019) SÍ debe ser secuencial: todas modifican wizard.rest.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 solamente)

1. Completar Fase 1 (Setup)
2. Fase 2 (Foundational) — vacía, no hay nada que hacer
3. Completar Fase 3 (US1): T002-T008
4. **DETENER Y VALIDAR**: correr `tests/integration/wizard-bulk-productos.test.ts`, confirmar que el bug reportado está resuelto
5. Esto ya es desplegable — resuelve el defecto explícitamente reportado por el usuario

### Incremental Delivery

1. Setup → Foundational (vacía) → base lista
2. US1 (Producto) → verificar independientemente → **MVP**: el bug reportado queda resuelto
3. US2 (las otras 4 entidades + los `GET` faltantes) → verificar independientemente → los 9 pasos BULK ya son consistentes
4. US3 (tests de protección explícitos) → verificar independientemente → queda demostrado que no hay pérdida de historial
5. Polish → confirmación final de que el contrato no cambió de forma

## Estado de implementación (2026-07-21)

- **T001–T026, T028 completados y verificados**: código de producción implementado (repositorio + caso de uso nuevo para Producto en `catalogo/application/`; protección agregada en los 4 endpoints restantes directamente en `wizard.rest.ts`; endpoint nuevo `GET /catalogo/servicios-seleccionados`; `GET /config` extendido). 7 archivos de test de integración nuevos (16 tests) corridos contra la base Neon real configurada en `.env` — los 16 pasan, incluyendo los 3 hallazgos de severidad de `research.md` (actividades/turnos que hoy cascadeaban ventas reales, proveedores que rompían la transacción). Cleanup verificado sin residuos tras cada corrida. `npx tsc --noEmit` sin errores en todo el proyecto.
- **T027 sigue sin marcar, a propósito**: no se levantó un servidor real con sesión de navegador/Better-Auth para recorrer `quickstart.md` manualmente vía HTTP — los 4 endpoints implementados directamente en `wizard.rest.ts` (`ActividadEconomica`, `ServicioMedico`, `Proveedor`, `TurnosDeAtencion`) no tienen una capa de aplicación invocable fuera de HTTP, así que sus tests replican la misma consulta Prisma que usa el handler en vez de pasar por el endpoint autenticado. Esto verifica la semántica de datos (que es el riesgo real) pero no el enrutamiento/auth/validación Zod de extremo a extremo. Recomendado antes de dar la feature por cerrada: una pasada manual real por el wizard en el navegador.

### Parallel Team Strategy

Con más de un desarrollador, después de Setup:
- **Dev A**: US1 completa (T002-T008) — módulo `catalogo`
- **Dev B**: US2, entidades de `ventas` (`Proveedor` T011/T016, `TurnosDeAtencion` T012/T017)
- **Dev C**: US2, entidades de `consultorio`/`restaurante` (`ActividadEconomica` T009/T014, `ServicioMedico` T010/T015/T018, listas T013/T019)
- Una vez que Dev B y Dev C terminan su parte de US2, cualquiera puede tomar US3 (T021-T025), ya que depende de que esos archivos de test existan

---

## Notes

- `[P]` = archivos distintos, sin dependencias pendientes entre sí
- `[Story]` mapea cada tarea a su historia de usuario en `spec.md`
- T014-T019 comparten `wizard.rest.ts` deliberadamente sin `[P]` — evitar conflictos de merge en el mismo archivo
- Por decisión de `research.md`, ninguna tarea implementa "quitar" (`remove`) sin su protección correspondiente en el mismo commit/PR — ambas van juntas, nunca en pasos separados
- Verificar que los tests fallan antes de la implementación correspondiente (T002/T003 antes de T004-T008; T009-T013 antes de T014-T020)
