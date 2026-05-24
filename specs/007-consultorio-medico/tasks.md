# Tasks: Módulo de Consultorio Médico

**Feature**: 007-consultorio-medico  
**Input**: specs/007-consultorio-medico/ (plan.md, spec.md, data-model.md, contracts/rest-api.md, research.md)  
**Prerequisites**: All design artifacts complete ✓  
**Tech Stack**: TypeScript strict · Hono + `@hono/zod-openapi` · Prisma 7 · Socket.IO · BullMQ · Better-Auth · Zod · Vitest + Testcontainers

**Context**: This module is ~85% implemented. Tasks target the **8 documented gaps** from the plan. Story phases map to `plan.md` sprints.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[Story]**: User story label from spec.md

---

## Phase 1: Setup — Schema Changes

**Purpose**: Database schema additions that unblock every other phase. Run migration once before any code changes.

**⚠️ CRITICAL**: Must complete before all repository and entity work.

- [X] T001 Update prisma/60-consultorio.prisma: in model `Paciente` add `dni String? @db.VarChar(20)` and `@@unique([consultorioId, dni])` and `canalNotificacion String?`; add new model `AuditoriaAcceso { id String @id @default(cuid()); tenantId String; consultorioId String; userId String; accion String; recursoTipo String; recursoId String; ip String?; timestamp DateTime @default(now()); @@index([consultorioId, recursoId]); @@index([userId, timestamp]); @@schema("consultorio") }`
- [ ] T002 Run Prisma migration from repo root: `npx prisma migrate dev --name add-paciente-dni-canal-auditoria-acceso`; verify generated client includes `dni`, `canalNotificacion`, and `AuditoriaAcceso` model

**Checkpoint**: Schema applied — entity and infrastructure work can begin

---

## Phase 2: Foundational — Constitution Fixes + Notifier Contract

**Purpose**: Mandatory error types and notification interface updates that multiple stories depend on.

**⚠️ CRITICAL**: T003 and T004 must complete before Phase 4, 5, 6 work begins.

- [X] T003 Add to src/modules/consultorio/domain/consultorio.errors.ts: `DNIYaRegistrado` error (message: "Ya existe un paciente con ese DNI en el consultorio", code: "DNI_YA_REGISTRADO") and `ConflictoVersionError` error (message: "El registro fue modificado por otro usuario. Recargue antes de reintentar.", code: "CONFLICTO_VERSION")
- [X] T004 Add to src/modules/consultorio/domain/ports/IConsultorioNotificador.ts: method signature `historiaCreada(payload: { historiaId: string; pacienteId: string; medicoId: string; especialidad: string; tenantId: string }): Promise<void>`
- [X] T005 [P] Add to src/modules/consultorio/infrastructure/null-consultorio.notificador.ts: no-op implementation `async historiaCreada(_payload: unknown): Promise<void> {}`
- [X] T006 [P] Add to src/modules/consultorio/infrastructure/consultorio.socket.notificador.ts: `historiaCreada` implementation that emits `"consultorio:historia:created"` event to `tenant:${payload.tenantId}` Socket.IO room with full payload (historiaId, pacienteId, medicoId, especialidad, tenantId)

**Checkpoint**: Foundation ready — all story phases can begin

---

## Phase 3: User Story 1 — Configuración Inicial del Consultorio (P1) ✅ COMPLETE

**Goal**: Perfil del consultorio, médicos con horarios, servicios médicos, guard `esConsultorio`.

**Status**: Fully implemented. Zero remaining tasks for this story.

**Independent Test**: `GET /consultorio` returns profile · `GET /consultorio/medicos` returns list · `GET /consultorio/servicios` returns catalog · Access from tenant without `esConsultorio` capability returns 403.

**Checkpoint**: User Story 1 is independently testable against the existing implementation

---

## Phase 4: User Story 2 — Gestión de Citas (P1)

**Goal**: Bloqueo optimista en confirmar/cancelar + canal de notificación por paciente en recordatorios BullMQ.

**Independent Test**: `POST /citas/:id/confirmar` with matching `expectedUpdatedAt` succeeds · same call with stale timestamp returns 409 `CONFLICTO_VERSION` · recordatorio worker queries `paciente.canalNotificacion` instead of using hardcoded `"EMAIL"`.

- [X] T007 [US2] Update src/modules/consultorio/application/cita/confirmar-cita.usecase.ts: add `expectedUpdatedAt: Date` to input DTO; before applying state change compare `input.expectedUpdatedAt.getTime() !== cita.updatedAt.getTime()`; throw `ConflictoVersionError` if mismatch
- [X] T008 [P] [US2] Update src/modules/consultorio/application/cita/cancelar-cita.usecase.ts: same bloqueo optimista pattern as T007 — add `expectedUpdatedAt: Date` to input DTO; throw `ConflictoVersionError` if `input.expectedUpdatedAt.getTime() !== cita.updatedAt.getTime()`
- [X] T009 [US2] Update src/modules/consultorio/adapters/cita.rest.ts: parse `expectedUpdatedAt` from request body in `POST /citas/:id/confirmar` and `POST /citas/:id/cancelar` endpoints; pass parsed `Date` to use cases; catch `ConflictoVersionError` and respond with HTTP 409 `{ error: "CONFLICTO_VERSION", message: "...", statusCode: 409 }`
- [X] T010 [P] [US2] Update src/modules/consultorio/adapters/consultorio.schema.ts: add `ConfirmarCitaBodySchema` with `expectedUpdatedAt: z.string().datetime()` and `CancelarCitaBodySchema` with same field; export both for use in cita.rest.ts
- [X] T011 [US2] Update src/workers/recordatorio-cita.worker.ts: replace hardcoded `canal: "EMAIL"` with a DB lookup of `paciente.canalNotificacion` using the job's `pacienteId`; skip sending the reminder entirely if `canalNotificacion` is `null` or undefined

**Checkpoint**: User Story 2 independently testable — cita CRUD + bloqueo optimista + canal-aware recordatorios

---

## Phase 5: User Story 3 — Historia Clínica (P2)

**Goal**: Sub-módulo de vacunaciones completo · bloqueo optimista en actualizar historia · Art. VI.2 fix (historiaCreada event) · audit trail en lecturas de historia.

**Independent Test**: `POST /historias` → Socket.IO emits `consultorio:historia:created` · `GET /historias/:id` → `AuditoriaAcceso` row created (fire-and-forget) · `PUT /historias/:id` with stale `expectedUpdatedAt` → 409 · `POST /pacientes/:id/vacunaciones` → vacunación created · `GET /pacientes/:id/vacunaciones` → list returned.

- [X] T012 [P] [US3] Create src/modules/consultorio/domain/vacunacion.entity.ts: fields `id`, `pacienteId`, `vacuna: string`, `dosis?: string`, `fechaAplicacion: Date`, `proximaDosis?: Date`, `medicoId?: string`, `lote?: string`; include static factory `VacunacionEntity.crear(data)` following existing entity patterns
- [X] T013 [P] [US3] Create src/modules/consultorio/domain/ports/IVacunacionRepository.ts: methods `crear(data): Promise<Vacunacion>`, `listar(pacienteId: string, args: PrismaListArgs): Promise<Vacunacion[]>`, `obtenerPorId(id: string): Promise<Vacunacion | null>`, `eliminar(id: string, pacienteId: string): Promise<void>`
- [X] T014 [US3] Update src/modules/consultorio/application/historia-clinica/crear-historia.usecase.ts: add `notificador: IConsultorioNotificador` constructor parameter; after successful `historiaRepo.crear(...)`, call `await notificador.historiaCreada({ historiaId: historia.id, pacienteId, medicoId, especialidad, tenantId })` (Art. VI.2 fix)
- [X] T015 [US3] Update src/modules/consultorio/application/historia-clinica/actualizar-historia.usecase.ts: add `expectedUpdatedAt: Date` to input DTO; after loading historia, throw `ConflictoVersionError` if `input.expectedUpdatedAt.getTime() !== historia.updatedAt.getTime()` before applying updates
- [X] T016 [US3] Create src/modules/consultorio/infrastructure/vacunacion.prisma.repository.ts: implements `IVacunacionRepository` using Prisma `vacunacion` model; `listar` uses `toPrismaArgs` from `src/core/query-params.ts` for pagination; `eliminar` verifies vacunacion belongs to given pacienteId before deleting
- [X] T017 [P] [US3] Create src/modules/consultorio/infrastructure/auditoria-acceso.prisma.repository.ts: single public method `registrar(params: { tenantId: string; consultorioId: string; userId: string; accion: string; recursoTipo: string; recursoId: string; ip?: string }): void` — executes `prisma.auditoriaAcceso.create(...)` fire-and-forget (no `await`; swallow errors with silent catch to never block callers)
- [X] T018 [US3] Update src/modules/consultorio/infrastructure/historia-clinica.prisma.repository.ts: add `AuditoriaAccesoPrismaRepository` constructor injection; in `obtener(id)` method, after loading historia call `this.auditoriaRepo.registrar({ accion: 'LEER_HISTORIA', recursoTipo: 'HISTORIA_CLINICA', recursoId: id, tenantId, consultorioId, userId })` (non-blocking — do NOT await)
- [X] T019 [US3] Create src/modules/consultorio/application/vacunacion/crear-vacunacion.usecase.ts: validate `pacienteId` belongs to `consultorioId` via `pacienteRepo.obtenerPorId`; persist via `vacunacionRepo.crear(data)` and return created entity
- [X] T020 [P] [US3] Create src/modules/consultorio/application/vacunacion/listar-vacunaciones.usecase.ts: receive `pacienteId` and `queryArgs`; call `vacunacionRepo.listar(pacienteId, toPrismaArgs(queryArgs))`; return list
- [X] T021 [P] [US3] Create src/modules/consultorio/application/vacunacion/eliminar-vacunacion.usecase.ts: load vacunacion via `vacunacionRepo.obtenerPorId(id)`, verify it belongs to `pacienteId` and `consultorioId`, then call `vacunacionRepo.eliminar(id, pacienteId)`
- [X] T022 [US3] Update src/modules/consultorio/adapters/historia-clinica.rest.ts: add `expectedUpdatedAt` field to `PUT /historias/:id` request body parsing; pass parsed `Date` to `ActualizarHistoriaUseCase`; catch `ConflictoVersionError` → HTTP 409; also update `ActualizarHistoriaBodySchema` in consultorio.schema.ts to add `expectedUpdatedAt: z.string().datetime()`
- [X] T023 [US3] Create src/modules/consultorio/adapters/vacunacion.rest.ts: `GET /pacientes/:pacienteId/vacunaciones` (roles: RECEPCIONISTA|MEDICO|ADMIN) · `POST /pacientes/:pacienteId/vacunaciones` (role: MEDICO|ADMIN) · `DELETE /pacientes/:pacienteId/vacunaciones/:id` (role: MEDICO|ADMIN); use `@hono/zod-openapi` schemas; validate request bodies with Zod
- [X] T024 [US3] Update src/modules/consultorio/adapters/consultorio-router.ts: import `vacunacionRouter` from `vacunacion.rest.ts`; instantiate `VacunacionPrismaRepository`, `CrearVacunacionUseCase`, `ListarVacunacionesUseCase`, `EliminarVacunacionUseCase`; mount router at `/pacientes/:pacienteId/vacunaciones`

**Checkpoint**: User Story 3 independently testable — historias + vacunaciones + audit on read + bloqueo optimista + historiaCreada event

---

## Phase 6: User Story 4 — Atención Médica y Cobro (P2)

**Goal**: Art. VI.2 fix para CrearAtencion · `IVentaService` port + venta automática al cobrar · endpoint de auditoría para ADMIN.

**Independent Test**: `POST /atenciones/:id/pagos` (monto completa pago) → `Venta` created in ventas module with `referenciaTipo="ATENCION_MEDICA"` and correct `referenciaId` · `GET /consultorio/auditoria` (ADMIN) → returns paginated audit records.

- [X] T025 [US4] Update src/modules/consultorio/application/atencion-medica/crear-atencion.usecase.ts: add `notificador: IConsultorioNotificador` constructor parameter; after successful `atencionRepo.crear(...)`, call `await notificador.atencionCambiada({ atencionId: atencion.id, pacienteId, medicoId, estadoPago, estado, total: atencion.total.toString(), tenantId })` (Art. VI.2 fix)
- [X] T026 [P] [US4] Create src/modules/consultorio/domain/ports/IVentaService.ts: interface with method `crearDesdeAtencion(data: { atencionId: string; consultorioId: string; tenantId: string; pacienteId: string; descripcion: string; detalle: Array<{ descripcion: string; cantidad: number; precioUnitario: Decimal; descuento: Decimal }>; total: Decimal; aperturaCierreCajaId?: string; puntoVentaId?: string; turnoId?: string; creadoPorId: string }): Promise<{ ventaId: string }>`
- [X] T027 [US4] Create src/modules/consultorio/infrastructure/venta.service.adapter.ts: implements `IVentaService`; in `crearDesdeAtencion(...)` call `CrearVentaUseCase` from `src/modules/ventas/` with `referenciaTipo: "ATENCION_MEDICA"`, `referenciaId: data.atencionId`; map `detalle` items from AtencionDetalle format to VentaDetalleData format
- [X] T028 [US4] Update src/modules/consultorio/application/atencion-medica/registrar-pago.usecase.ts: add `ventaService: IVentaService` constructor parameter; extend input DTO with optional `aperturaCierreCajaId?: string`, `puntoVentaId?: string`, `turnoId?: string`; when `nuevoEstadoPago === 'PAGADO'`, call `await ventaService.crearDesdeAtencion({ ...atencionData, aperturaCierreCajaId, puntoVentaId, turnoId })`
- [X] T029 [US4] Update src/modules/consultorio/adapters/atencion-medica.rest.ts: in `POST /atenciones/:id/pagos` endpoint, parse optional fields `aperturaCierreCajaId`, `puntoVentaId`, `turnoId` from request body; pass them to `RegistrarPagoUseCase` input DTO
- [X] T030 [P] [US4] Update src/modules/consultorio/adapters/consultorio.schema.ts: add optional caja context fields to `PagoAtencionBodySchema`: `aperturaCierreCajaId: z.string().optional()`, `puntoVentaId: z.string().optional()`, `turnoId: z.string().optional()`
- [X] T031 [US4] Add `GET /consultorio/auditoria` endpoint to src/modules/consultorio/adapters/consultorio.rest.ts: role `ADMIN` only; accepts standard pagination query params (`take`, `skip`, `sortField`, `sortOrder`); calls `auditoriaRepo.listar(consultorioId, args)` from `AuditoriaAccesoPrismaRepository`; returns `{ data: AuditoriaAcceso[], meta: { take, total, hasMore } }`; add `listar()` method to `auditoria-acceso.prisma.repository.ts` if not yet present
- [X] T032 [US4] Update src/modules/consultorio/adapters/consultorio-router.ts: instantiate `VentaServiceAdapter` and inject into `RegistrarPagoUseCase`; instantiate `AuditoriaAccesoPrismaRepository` as shared singleton; inject it into `HistoriaClinicaPrismaRepository` (from Phase 5 T018) and into `RecetaMedicaPrismaRepository` (from Phase 7 T033); inject `notificador` into `CrearAtencionUseCase` (from T025)

**Checkpoint**: User Story 4 independently testable — atención + cobro → venta automática + audit endpoint visible

---

## Phase 7: User Story 5 — Receta Médica (P3)

**Goal**: Audit trail en lecturas de recetas + job BullMQ diario para transición automática a VENCIDA.

**Independent Test**: `GET /recetas/:id` → `AuditoriaAcceso` row with `accion=LEER_RECETA` inserted (fire-and-forget) · run expirar-recetas job manually → recetas with `fechaVencimiento < now()` and estado `EMITIDA|PARCIAL` are set to `VENCIDA`.

- [X] T033 [US5] Update src/modules/consultorio/infrastructure/receta-medica.prisma.repository.ts: add `AuditoriaAccesoPrismaRepository` constructor injection; in `obtener(id)` method, call `this.auditoriaRepo.registrar({ accion: 'LEER_RECETA', recursoTipo: 'RECETA_MEDICA', recursoId: id, tenantId, consultorioId, userId })` (fire-and-forget, do NOT await)
- [X] T034 [US5] Update src/core/recordatorios.queue.ts: export a new `expirarRecetasQueue` BullMQ `Queue` instance alongside the existing queues; use queue name `"expirar-recetas"`
- [X] T035 [US5] Create src/workers/expirar-recetas.worker.ts: BullMQ `Worker` on queue `"expirar-recetas"`; processor runs: `await prisma.recetaMedica.updateMany({ where: { fechaVencimiento: { lt: new Date() }, estado: { in: ['EMITIDA', 'PARCIAL'] } }, data: { estado: 'VENCIDA' } })`; log count of affected records via Pino
- [X] T036 [US5] Register expirar-recetas in application bootstrap (follow same pattern as `recordatorio-cita.worker.ts`): start the Worker and schedule a repeatable daily job `expirarRecetasQueue.add('expirar', {}, { repeat: { cron: '0 2 * * *' } })` at startup

**Checkpoint**: User Story 5 independently testable — receta read audit + daily auto-expiry

---

## Phase 8: User Story 6 — Gestión de Pacientes (P3)

**Goal**: DNI como identificador único de paciente + canal de notificación por paciente + audit trail en lecturas de datos sensibles.

**Independent Test**: `POST /pacientes` with DNI → created · `POST /pacientes` with same DNI → 409 `DNI_YA_REGISTRADO` · `PUT /pacientes/:id` updating DNI to existing value → 409 · `GET /pacientes/:id` → `AuditoriaAcceso` row with `accion=LEER_PACIENTE` inserted.

- [X] T037 [US6] Update src/modules/consultorio/domain/paciente.entity.ts: add `dni: string | null` and `canalNotificacion: string | null` fields; update factory/constructor to accept and expose these fields
- [X] T038 [P] [US6] Update src/modules/consultorio/domain/ports/IPacienteRepository.ts: add method `existeDni(consultorioId: string, dni: string, excludeId?: string): Promise<boolean>` for uniqueness validation (excludeId used during updates to skip self)
- [X] T039 [US6] Update src/modules/consultorio/application/paciente/crear-paciente.usecase.ts: if `input.dni` is provided, call `await pacienteRepo.existeDni(consultorioId, input.dni)`; throw `DNIYaRegistrado` if result is `true`; pass `dni` and `canalNotificacion` to `pacienteRepo.crear(...)`
- [X] T040 [P] [US6] Update src/modules/consultorio/application/paciente/actualizar-paciente.usecase.ts: if `input.dni` is being updated, call `await pacienteRepo.existeDni(consultorioId, input.dni, pacienteId)` (exclude self); throw `DNIYaRegistrado` if true; pass `canalNotificacion` updates to `pacienteRepo.actualizar(...)`
- [X] T041 [US6] Update src/modules/consultorio/infrastructure/paciente.prisma.repository.ts: persist `dni` + `canalNotificacion` in `crear()` and `actualizar()` methods; add `existeDni()` using `prisma.paciente.findFirst({ where: { consultorioId, dni, NOT: { id: excludeId } } })`; add `AuditoriaAccesoPrismaRepository` injection; call `this.auditoriaRepo.registrar({ accion: 'LEER_PACIENTE', recursoTipo: 'PACIENTE', recursoId: paciente.id, ... })` in `obtener()` (fire-and-forget)
- [X] T042 [US6] Update src/modules/consultorio/adapters/paciente.rest.ts: include `dni` and `canalNotificacion` in `POST /pacientes` and `PUT /pacientes/:id` request body parsing; include both in response mapping; catch `DNIYaRegistrado` → HTTP 409 `{ error: "DNI_YA_REGISTRADO", statusCode: 409 }`
- [X] T043 [US6] Update src/modules/consultorio/adapters/consultorio.schema.ts: add `dni: z.string().max(20).optional()` and `canalNotificacion: z.enum(['EMAIL', 'SMS', 'WHATSAPP']).nullable().optional()` to `PacienteCreateSchema` and `PacienteUpdateSchema`

**Checkpoint**: User Story 6 independently testable — paciente CRUD with DNI uniqueness + canal notificación + HIPAA audit on reads

---

## Phase 9: Tests

**Purpose**: Unit and integration tests explicitly required per plan.md Sprint 4. Tests use Vitest; unit tests mock repositories in-memory; integration tests use Testcontainers PostgreSQL.

- [X] T044 Create tests/consultorio/unit/crear-cita.usecase.test.ts: test `CitaSolapada` thrown when médico has overlapping PENDIENTE/CONFIRMADA cita; test happy path creates cita and calls `notificador.citaCambiada`; test BullMQ `recordatoriosQueue.add` called with correct data
- [X] T045 [P] Create tests/consultorio/unit/confirmar-cita.usecase.test.ts: test `ConflictoVersionError` thrown when `expectedUpdatedAt` does not match `cita.updatedAt`; test success path when timestamps match; test `CitaYaAtendida`/past-date rejection
- [X] T046 [P] Create tests/consultorio/unit/registrar-pago.usecase.test.ts: test `IVentaService.crearDesdeAtencion` called only when `estadoPago` transitions to `PAGADO`; test partial payment does NOT call ventaService; test `PagoExcedeTotalError` when monto exceeds remaining balance
- [X] T047 [P] Create tests/consultorio/unit/crear-paciente.usecase.test.ts: test `DNIYaRegistrado` thrown when `pacienteRepo.existeDni` returns `true`; test success path with unique DNI; test creation without DNI (dni = null, no uniqueness check performed)
- [X] T048 Create tests/consultorio/integration/cita.prisma.repository.test.ts: Testcontainers PostgreSQL; test solapamiento detection query returns correct boolean; test optimistic lock conflict by updating `updatedAt` directly in DB between load and confirm
- [X] T049 [P] Create tests/consultorio/integration/paciente.prisma.repository.test.ts: Testcontainers PostgreSQL; test DNI unique constraint enforcement (second insert same DNI throws); test `canalNotificacion` persists and retrieves correctly; test `existeDni` with `excludeId` (returns false for own record)

**Checkpoint**: All 49 tasks complete — module ready for review and merge

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Schema)     — no dependencies; start immediately
Phase 2 (Foundational) — requires Phase 1 complete
Phase 3 (US1)        — already done; no dependencies
Phase 4 (US2)        — requires Phase 2 (T003: ConflictoVersionError)
Phase 5 (US3)        — requires Phase 1 (schema) + Phase 2 (IConsultorioNotificador)
Phase 6 (US4)        — requires Phase 2 + Phase 5 (T017: AuditoriaAccesoPrismaRepository)
Phase 7 (US5)        — requires Phase 5 (T017) + Phase 6 wiring (T032)
Phase 8 (US6)        — requires Phase 1 (schema) + Phase 2 (T003: DNIYaRegistrado)
Phase 9 (Tests)      — requires all prior phases
```

### Plan Sprint Alignment

| Plan Sprint | Tasks |
|-------------|-------|
| Sprint 1 — Schema + VI.2 + DNI + Canal | T001–T006, T011, T037–T043 |
| Sprint 2 — Vacunaciones + Bloqueo Opt. | T007–T010, T012–T016, T019–T024 |
| Sprint 3 — Cobro→Venta + Audit Trail | T017–T018, T025–T032, T033 |
| Sprint 4 — BullMQ + Events + Tests | T034–T036, T044–T049 |

### Key Dependency Chains (from research.md)

```
T001 (Schema) → T037–T043 (DNI/canal entity + repo) → T047, T049 (tests)
T001 (Schema) → T017 (AuditoriaAcceso repo) → T018 (historia audit), T033 (receta audit), T041 (paciente audit)
T026–T027 (IVentaService) → T046 (test registrar-pago)
T014 (CrearHistoria VI.2 fix) → requires T006 (historiaCreada socket impl)
T007–T008 (bloqueo optimista use cases) → T045 (test confirmar-cita)
```

### Parallel Opportunities Within Phases

| Phase | Parallel batch |
|-------|---------------|
| 2 | T005 + T006 (notificador impls — different files) |
| 4 | T007 + T008 (confirmar + cancelar use cases); T009 + T010 (rest + schema) |
| 5 | T012 + T013 (entity + port); T016 + T017 (two new repos); T019 + T020 + T021 (three vacunacion use cases) |
| 6 | T026 + T030 (port + schema); T029 + T030 |
| 8 | T038 + T040 (port + actualizar use case) |
| 9 | T045 + T046 + T047 + T049 (all independent) |

---

## Parallel Example: Phase 5 (US3 — Historia Clínica)

```bash
# Round 1 — domain layer (parallel):
Task T012: Create vacunacion.entity.ts
Task T013: Create IVacunacionRepository.ts

# Round 2 — after T003+T004 from Phase 2 (parallel):
Task T014: Fix crear-historia.usecase.ts (VI.2)
Task T015: Fix actualizar-historia.usecase.ts (bloqueo optimista)

# Round 3 — infrastructure (parallel, after T012+T013):
Task T016: Create vacunacion.prisma.repository.ts
Task T017: Create auditoria-acceso.prisma.repository.ts

# Round 4 — application use cases (parallel, after T016+T017):
Task T018: Update historia-clinica.prisma.repository.ts (audit)
Task T019: Create crear-vacunacion.usecase.ts
Task T020: Create listar-vacunaciones.usecase.ts
Task T021: Create eliminar-vacunacion.usecase.ts

# Round 5 — adapters (after T019–T021):
Task T022: Update historia-clinica.rest.ts + schema
Task T023: Create vacunacion.rest.ts

# Round 6 — router wiring (after T023):
Task T024: Register vacunacion router in consultorio-router.ts
```

---

## Implementation Strategy

### MVP Scope (US1 done — start at US2)

1. Phase 1 (T001–T002) — Schema migration
2. Phase 2 (T003–T006) — Foundation fixes
3. Phase 4 (T007–T011) — User Story 2 bloqueo optimista + canal recordatorio
4. **VALIDATE**: Confirm/cancel cita flow with optimistic lock end-to-end
5. Continue with P2 stories

### Incremental Delivery

1. Phase 1–2 → Schema + compliance foundation
2. Phase 4 (US2 P1) → Bloqueo optimista en citas ← Sprint 1+2 validation
3. Phase 5 (US3 P2) → Vacunaciones + historia audit ← Sprint 2+3 validation
4. Phase 6 (US4 P2) → Cobro → Venta automática ← Sprint 3 validation
5. Phase 7–8 (US5+US6 P3) → Receta expiry + Paciente DNI
6. Phase 9 → Tests

---

## Notes

- All paths are relative to repository root `d:\Marcelo\REACT\vendora\vendora-backend`
- Fire-and-forget audit calls: `void this.auditoriaRepo.registrar(...)` — NEVER `await` to avoid blocking request latency
- `ConflictoVersionError` → HTTP 409 `CONFLICTO_VERSION` · `DNIYaRegistrado` → HTTP 409 `DNI_YA_REGISTRADO`
- All list endpoints use `toPrismaArgs` from `src/core/query-params.ts` for pagination
- Vitest unit tests: repositories in-memory; integration tests: `@testcontainers/postgresql`
- `updatedAt` is used as optimistic lock token — no additional `version: Int` column needed
- HcPerinatal / HcPerinatalControl: schema exists but no application layer for v1 (out of scope per Decision 8 in research.md)
