# Tasks: MÃ³dulo de Consultorio MÃ©dico

**Input**: Design documents from `/specs/002-consultorio/`
**Prerequisites**: plan.md âœ…, spec.md âœ…, research.md âœ…, data-model.md âœ…, contracts/ âœ…, quickstart.md âœ…

**Organization**: Tasks agrupadas por historia de usuario para implementaciÃ³n y prueba independiente.
**Tests**: Solo las pruebas unitarias esenciales (solapamiento, pago, nÃºmero receta) â€” sin TDD completo.

## Format: `[ID] [P?] [Story] DescripciÃ³n`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias)
- **[Story]**: Historia de usuario a la que pertenece la tarea
- Todos los paths son relativos a la raÃ­z del repositorio

---

## Phase 1: Setup â€” Estructura del MÃ³dulo

**Purpose**: Crear la estructura de carpetas y archivos de error/guard que bloquean todo lo demÃ¡s.

- [X] T001 Create module directory tree: `src/modules/consultorio/{domain/ports,application/{consultorio,medico,paciente,servicio-medico,cita,historia-clinica,atencion-medica,receta-medica},infrastructure,adapters}` (mkdir only, no code)
- [X] T002 [P] Create domain errors file `src/modules/consultorio/domain/consultorio.errors.ts` with: `ConsultorioNoEncontrado`, `MedicoNoEncontrado`, `MedicoYaExiste`, `MedicoTieneCitasPendientes`, `HorarioDuplicado`, `PacienteNoEncontrado`, `PacienteEmailDuplicado`, `ServicioNoEncontrado`, `ServicioNombreDuplicado`, `ServicioEnUso`, `CitaNoEncontrada`, `CitaSolapada`, `CitaNoConfirmable`, `CitaYaAtendida`, `HistoriaNoEncontrada`, `AtencionNoEncontrada`, `PagoExcedeTotalError`, `AtencionYaPagada`, `RecetaNoEncontrada`, `RecetaDespachada`, `PermisoDenegado` â€” cada clase extiende Error con campo `code`
- [X] T003 Add `requireConsultorio: MiddlewareHandler<HonoEnv>` to `src/core/hono-context.ts`: importa `prisma` desde `better-auth.setup.js` dinÃ¡micamente, busca `tenant.esConsultorio`, retorna 403 con `{ error: "CONSULTORIO_NO_HABILITADO" }` si no estÃ¡ habilitado

---

## Phase 2: Foundational â€” Infraestructura Compartida

**Purpose**: Puerto notificador, notificadores concretos y schemas Zod compartidos. Bloquea todas las historias de usuario.

**âš ï¸ CRÃTICO**: Ninguna historia puede comenzar hasta completar esta fase.

- [X] T004 [P] Create `IConsultorioNotificador` port in `src/modules/consultorio/domain/ports/IConsultorioNotificador.ts` with methods: `citaCreada(tenantId: string, payload: CitaEventoPayload): void`, `citaCambiada(tenantId: string, payload: CitaEstadoPayload): void`, `atencionCambiada(tenantId: string, payload: AtencionEstadoPayload): void`, `recetaEmitida(tenantId: string, payload: RecetaEmitidaPayload): void` â€” include typed payload interfaces in the same file
- [X] T005 [P] Create `NullConsultorioNotificador implements IConsultorioNotificador` in `src/modules/consultorio/infrastructure/null-consultorio.notificador.ts` with no-op implementations; export singleton `export const notificador = new NullConsultorioNotificador()`
- [X] T006 Create `ConsultorioSocketNotificador implements IConsultorioNotificador` in `src/modules/consultorio/infrastructure/consultorio.socket.notificador.ts`: constructor receives `io: Server` from socket.io; each method calls `this.io.to("tenant:${tenantId}").emit(eventName, payload)` with Pino logger; emit events: `consultorio:cita:creada`, `consultorio:cita:estadoCambiado`, `consultorio:atencion:estadoCambiado`, `consultorio:receta:emitida`
- [X] T007 [P] Create shared Zod schemas in `src/modules/consultorio/adapters/consultorio.schema.ts`: `ConsultorioPerfilSchema` (especialidades array, nroRegistro?), `MedicoBaseSchema` (memberId, especialidad, nroRegistro?, bio?, fotoUrl?), `HorarioSchema` (diaSemana 0â€“6, horaInicio HH:MM, horaFin HH:MM), `PacienteBaseSchema` (nombre, apellido, fechaNacimiento?, genero?, telefono?, email?, tipoSangre?, alergias?, seguroNombre?, seguroNumero?), `ServicioBaseSchema` (nombre, especialidad?, descripcion?, duracionMin, precioBase), `CitaCreateSchema` (pacienteId, medicoId, servicioId?, fechaHora, duracionMin?, motivo?, canalOrigen?), `HistoriaCreateSchema`, `AtencionCreateSchema` with detalle array, `RecetaCreateSchema` with detalle array â€” all exported
- [X] T008 Register consultorio routes and socket notificador: (a) in `src/server/hono.ts` add `import { consultorioRouter } from "../modules/consultorio/adapters/consultorio-router.js"` and mount at `/api/consultorio`; (b) in `src/server/index.ts` instantiate `export const consultorioNotificador = new ConsultorioSocketNotificador(io)`; create file `src/modules/consultorio/adapters/consultorio-router.ts` that aggregates all consultorio sub-routers under one Hono app with `requireAuth + requireTenantActivo + requireConsultorio` applied globally

**Checkpoint**: Infraestructura compartida lista â€” las historias de usuario pueden comenzar.

---

## Phase 3: US1 â€” Perfil de Consultorio (P1) ðŸŽ¯ MVP

**Goal**: Crear/obtener el perfil clÃ­nico del consultorio (especialidades, nÃºmero de registro).

**Independent Test**: `GET /api/consultorio/perfil` â†’ 200; `PUT /api/consultorio/perfil` â†’ 200; sin `esConsultorio` â†’ 403.

- [X] T009 [P] [US1] Create `ConsultorioEntity` in `src/modules/consultorio/domain/consultorio.entity.ts`: constructor from Prisma raw (`id`, `tenantId`, `especialidades`, `nroRegistro?`, `estado`, `createdAt`, `updatedAt`); `static fromPrisma(raw)`, `toJSON()`, getters
- [X] T010 [P] [US1] Create `IConsultorioRepository` port in `src/modules/consultorio/domain/ports/IConsultorioRepository.ts` with methods: `obtenerPorTenantId(tenantId: string): Promise<ConsultorioEntity>`, `upsert(tenantId: string, data: Partial<ConsultorioRaw>, userId: string): Promise<ConsultorioEntity>`
- [X] T011 [US1] Implement `ConsultorioPrismaRepository implements IConsultorioRepository` in `src/modules/consultorio/infrastructure/consultorio.prisma.repository.ts`: use `crearPrismaScoped(tenantId, userId)` from `core/prisma-scoped.ts`; `obtenerPorTenantId` throws `ConsultorioNoEncontrado`; `upsert` uses `prisma.consultorio.upsert({ where: { tenantId }, create: withAudit({ tenantId, ...data }, userId), update: { ...data, updatedById: userId } })`
- [X] T012 [US1] Implement `ObtenerConsultorioUseCase` in `src/modules/consultorio/application/consultorio/obtener-consultorio.usecase.ts`: `ejecutar(tenantId: string): Promise<ConsultorioEntity>` delegates to `IConsultorioRepository.obtenerPorTenantId`
- [X] T013 [US1] Implement `ActualizarConsultorioUseCase` in `src/modules/consultorio/application/consultorio/actualizar-consultorio.usecase.ts`: `ejecutar(tenantId: string, data: ConsultorioUpdateDTO, userId: string): Promise<ConsultorioEntity>` validates rol is PROPIETARIO/ADMIN, then calls `IConsultorioRepository.upsert`
- [X] T014 [US1] Implement `consultorio.rest.ts` in `src/modules/consultorio/adapters/consultorio.rest.ts`: `GET /perfil` â†’ `ObtenerConsultorioUseCase`; `PUT /perfil` â†’ `requireRol(["PROPIETARIO","ADMIN"])` + `ActualizarConsultorioUseCase`; map domain errors to HTTP codes using try/catch; both endpoints inject `ConsultorioPrismaRepository` using `session.activeOrganizationId` and `session.user.id`

**Checkpoint**: `GET /perfil` y `PUT /perfil` funcionan. Guard 403 cuando `esConsultorio=false`.

---

## Phase 4: US2 â€” GestiÃ³n de MÃ©dicos (P1)

**Goal**: CRUD de perfiles de mÃ©dico con horarios de atenciÃ³n por dÃ­a/franja.

**Independent Test**: `POST /api/consultorio/medicos` â†’ 201; `GET /medicos/:id/horarios` â†’ 200; matrÃ­cula duplicada â†’ 409.

- [X] T015 [P] [US2] Create `MedicoEntity` in `src/modules/consultorio/domain/medico.entity.ts`: fields from Prisma `Medico` model; `static fromPrisma(raw)`, `toJSON()`, `estaActivo(): boolean`
- [X] T016 [P] [US2] Create `IMedicoRepository` port in `src/modules/consultorio/domain/ports/IMedicoRepository.ts` with: `crear(data: MedicoCreateDTO, userId: string): Promise<MedicoEntity>`, `obtener(id: string, consultorioId: string): Promise<MedicoEntity>`, `listar(consultorioId: string, params: QueryParams): Promise<ListResult<MedicoEntity>>`, `actualizar(id: string, data: Partial<MedicoRaw>, userId: string): Promise<MedicoEntity>`, `buscarPorMiembro(memberId: string, consultorioId: string): Promise<MedicoEntity | null>`, `agregarHorario(medicoId: string, data: HorarioCreateDTO): Promise<HorarioAtencion>`, `eliminarHorario(horarioId: string, medicoId: string): Promise<void>`, `listarHorarios(medicoId: string): Promise<HorarioAtencion[]>`, `tieneCitasPendientes(id: string): Promise<boolean>`; export `HorarioAtencion`, `MedicoCreateDTO`, `ListResult<T>` interfaces
- [X] T017 [US2] Implement `MedicoPrismaRepository implements IMedicoRepository` in `src/modules/consultorio/infrastructure/medico.prisma.repository.ts`: use `crearPrismaScoped`; `crear` uses `withAudit`; `obtener` throws `MedicoNoEncontrado`; `agregarHorario` catches unique constraint â†’ `HorarioDuplicado`; `tieneCitasPendientes` counts `cita` with `estado: { in: ["PENDIENTE","CONFIRMADA"] }`
- [X] T018 [P] [US2] Implement `CrearMedicoUseCase` in `src/modules/consultorio/application/medico/crear-medico.usecase.ts`: check `IMedicoRepository.buscarPorMiembro` â†’ throw `MedicoYaExiste` if found; then `crear`
- [X] T019 [P] [US2] Implement `ListarMedicosUseCase` in `src/modules/consultorio/application/medico/listar-medicos.usecase.ts`: `ejecutar(consultorioId: string, params: QueryParams)`
- [X] T020 [P] [US2] Implement `ObtenerMedicoUseCase` in `src/modules/consultorio/application/medico/obtener-medico.usecase.ts`: fetches medico with `horariosAtencion`
- [X] T021 [P] [US2] Implement `ActualizarMedicoUseCase` in `src/modules/consultorio/application/medico/actualizar-medico.usecase.ts`: if `estado=INACTIVO` check `tieneCitasPendientes` â†’ throw `MedicoTieneCitasPendientes`
- [X] T022 [US2] Implement `GestionarHorariosUseCase` in `src/modules/consultorio/application/medico/gestionar-horarios.usecase.ts`: methods `agregar(medicoId, data, consultorioId)` and `eliminar(horarioId, medicoId, consultorioId)` â€” verifies medico belongs to consultorio
- [X] T023 [US2] Implement `medico.rest.ts` in `src/modules/consultorio/adapters/medico.rest.ts`: `GET /medicos`, `POST /medicos`, `GET /medicos/:id`, `PUT /medicos/:id`, `DELETE /medicos/:id` (soft delete via actualizar estado=INACTIVO), `GET /medicos/:id/horarios`, `POST /medicos/:id/horarios`, `DELETE /medicos/:id/horarios/:horarioId`; use `schema.safeParse(c.req.json())` for body validation; map domain errors to HTTP

**Checkpoint**: CRUD completo de mÃ©dicos y horarios funciona. `MedicoYaExiste` y `HorarioDuplicado` retornan 409.

---

## Phase 5: US3 â€” GestiÃ³n de Pacientes (P1)

**Goal**: Registro de pacientes con datos demogrÃ¡ficos, clÃ­nicos y vacunaciones.

**Independent Test**: `POST /api/consultorio/pacientes` â†’ 201; email duplicado â†’ 409; `POST /pacientes/:id/vacunaciones` â†’ 201.

- [X] T024 [P] [US3] Create `PacienteEntity` in `src/modules/consultorio/domain/paciente.entity.ts`: maps all Prisma `Paciente` fields; `static fromPrisma(raw)`, `toJSON()`, `edad(): number | null` helper
- [X] T025 [P] [US3] Create `IPacienteRepository` port in `src/modules/consultorio/domain/ports/IPacienteRepository.ts` with: `crear(data: PacienteCreateDTO, consultorioId: string, userId: string): Promise<PacienteEntity>`, `obtener(id: string, consultorioId: string): Promise<PacienteEntity>`, `listar(consultorioId: string, params: QueryParams): Promise<ListResult<PacienteEntity>>`, `actualizar(id: string, data: Partial<PacienteRaw>, userId: string): Promise<PacienteEntity>`, `registrarVacunacion(pacienteId: string, data: VacunacionDTO): Promise<Vacunacion>`, `listarVacunaciones(pacienteId: string): Promise<Vacunacion[]>`; export `VacunacionDTO`, `Vacunacion` interfaces
- [X] T026 [US3] Implement `PacientePrismaRepository implements IPacienteRepository` in `src/modules/consultorio/infrastructure/paciente.prisma.repository.ts`: `crear` catches unique constraint on `[consultorioId, email]` â†’ `PacienteEmailDuplicado`; `listar` supports `search` over `nombre`, `apellido`; `registrarVacunacion` creates `Vacunacion` record linked to pacienteId
- [X] T027 [P] [US3] Implement `CrearPacienteUseCase` in `src/modules/consultorio/application/paciente/crear-paciente.usecase.ts`
- [X] T028 [P] [US3] Implement `ListarPacientesUseCase` in `src/modules/consultorio/application/paciente/listar-pacientes.usecase.ts` (with search param)
- [X] T029 [P] [US3] Implement `ObtenerPacienteUseCase` in `src/modules/consultorio/application/paciente/obtener-paciente.usecase.ts`
- [X] T030 [P] [US3] Implement `ActualizarPacienteUseCase` in `src/modules/consultorio/application/paciente/actualizar-paciente.usecase.ts`
- [X] T031 [US3] Implement `paciente.rest.ts` in `src/modules/consultorio/adapters/paciente.rest.ts`: `GET /pacientes`, `POST /pacientes`, `GET /pacientes/:id`, `PUT /pacientes/:id`, `GET /pacientes/:id/vacunaciones`, `POST /pacientes/:id/vacunaciones`; validate request bodies with Zod; map errors to HTTP codes

**Checkpoint**: CRUD de pacientes y registro de vacunaciones funcional. `PacienteEmailDuplicado` retorna 409.

---

## Phase 6: US4 â€” CatÃ¡logo de Servicios MÃ©dicos (P1)

**Goal**: CatÃ¡logo de prestaciones con duraciÃ³n y precio base por consultorio.

**Independent Test**: `POST /api/consultorio/servicios` â†’ 201; nombre duplicado â†’ 409; `DELETE` con citas activas â†’ 409.

- [X] T032 [P] [US4] Create `ServicioMedicoEntity` in `src/modules/consultorio/domain/servicio-medico.entity.ts`: maps Prisma `ServicioMedico`; `static fromPrisma(raw)`, `toJSON()`, `estaActivo(): boolean`
- [X] T033 [P] [US4] Create `IServicioMedicoRepository` port in `src/modules/consultorio/domain/ports/IServicioMedicoRepository.ts` with: `crear(data: ServicioCreateDTO, consultorioId: string, userId: string): Promise<ServicioMedicoEntity>`, `obtener(id: string, consultorioId: string): Promise<ServicioMedicoEntity>`, `listar(consultorioId: string, params: QueryParams): Promise<ListResult<ServicioMedicoEntity>>`, `actualizar(id: string, data, userId: string): Promise<ServicioMedicoEntity>`, `tieneUsoActivo(id: string): Promise<boolean>`; export `ServicioCreateDTO`
- [X] T034 [US4] Implement `ServicioMedicoPrismaRepository implements IServicioMedicoRepository` in `src/modules/consultorio/infrastructure/servicio-medico.prisma.repository.ts`: `crear` catches unique `[consultorioId, nombre]` â†’ `ServicioNombreDuplicado`; `tieneUsoActivo` checks `cita` or `atencionDetalle` with non-cancelled status
- [X] T035 [P] [US4] Implement `CrearServicioUseCase` in `src/modules/consultorio/application/servicio-medico/crear-servicio.usecase.ts`: only PROPIETARIO/ADMIN
- [X] T036 [P] [US4] Implement `ListarServiciosUseCase` in `src/modules/consultorio/application/servicio-medico/listar-servicios.usecase.ts`
- [X] T037 [P] [US4] Implement `ObtenerServicioUseCase` in `src/modules/consultorio/application/servicio-medico/obtener-servicio.usecase.ts`
- [X] T038 [P] [US4] Implement `ActualizarServicioUseCase` in `src/modules/consultorio/application/servicio-medico/actualizar-servicio.usecase.ts`: if deactivating (`estado=INACTIVO`) check `tieneUsoActivo` â†’ throw `ServicioEnUso`
- [X] T039 [US4] Implement `servicio-medico.rest.ts` in `src/modules/consultorio/adapters/servicio-medico.rest.ts`: `GET /servicios`, `POST /servicios`, `GET /servicios/:id`, `PUT /servicios/:id`, `DELETE /servicios/:id` (soft delete via estado=INACTIVO); role guard on POST/PUT/DELETE

**Checkpoint**: CRUD de servicios mÃ©dicos funcional. `ServicioNombreDuplicado` â†’ 409; `ServicioEnUso` â†’ 409.

---

## Phase 7: US5 â€” GestiÃ³n de Citas (P1)

**Goal**: Agendamiento de citas con validaciÃ³n de solapamiento, transiciones de estado y eventos en tiempo real.

**Independent Test**: Crear cita â†’ 201 + `consultorio:cita:creada` event; cita solapada â†’ 409; confirmar futura â†’ 200; cancelar â†’ 200.

- [X] T040 [P] [US5] Create `CitaEntity` with state machine in `src/modules/consultorio/domain/cita.entity.ts`: fields from Prisma `Cita`; methods `puedeConfirmar(): boolean` (estado=PENDIENTE AND fechaHora > now), `puedeCancelar(): boolean` (estado != ATENDIDA), `puedeMarcarAtendida(): boolean` (estado=CONFIRMADA), `puedeMarcarNoAsistio(): boolean` (estado=CONFIRMADA); `static fromPrisma(raw)`, `toJSON()`
- [X] T041 [P] [US5] Create `ICitaRepository` port in `src/modules/consultorio/domain/ports/ICitaRepository.ts` with: `crear(data: CitaCreateDTO, consultorioId: string, userId: string): Promise<CitaEntity>`, `obtener(id: string, consultorioId: string): Promise<CitaEntity>`, `listar(consultorioId: string, params: CitaQueryParams): Promise<ListResult<CitaEntity>>`, `actualizarEstado(id: string, estado: string, userId: string): Promise<CitaEntity>`, `verificarSolapamiento(consultorioId: string, medicoId: string, fechaHora: Date, duracionMin: number, excludeId?: string): Promise<boolean>`; export `CitaCreateDTO`, `CitaQueryParams` (extends QueryParams with `medicoId?`, `pacienteId?`, `estado?`, `fechaDesde?`, `fechaHasta?`)
- [X] T042 [US5] Implement `CitaPrismaRepository implements ICitaRepository` in `src/modules/consultorio/infrastructure/cita.prisma.repository.ts`: `verificarSolapamiento` queries citas in range `[fechaHora - 4h, fechaHora + duracionMin)` with `estado notIn [CANCELADA, NO_ASISTIO]`, filters in-memory for exact overlap `(inicio < cFin && fin > cInicio)`; `crear` uses `withAudit`; `listar` supports filters by medicoId, pacienteId, estado, fechaDesde/Hasta; include `paciente` and `medico` JOINs in list response
- [X] T043 [US5] Implement `CrearCitaUseCase` in `src/modules/consultorio/application/cita/crear-cita.usecase.ts`: verify medico and paciente belong to consultorioId; call `ICitaRepository.verificarSolapamiento` â†’ throw `CitaSolapada`; create cita; emit `notificador.citaCreada(tenantId, payload)`; enqueue BullMQ job `{ name: "recordatorio-cita", data: { citaId, canal: "EMAIL" } }` using `Queue("recordatorios")` from ioredis
- [X] T044 [P] [US5] Implement `ListarCitasUseCase` in `src/modules/consultorio/application/cita/listar-citas.usecase.ts`
- [X] T045 [P] [US5] Implement `ObtenerCitaUseCase` in `src/modules/consultorio/application/cita/obtener-cita.usecase.ts`
- [X] T046 [P] [US5] Implement `ConfirmarCitaUseCase` in `src/modules/consultorio/application/cita/confirmar-cita.usecase.ts`: `ejecutar(id, tenantId, userId)`: get cita, call `cita.puedeConfirmar()` â†’ throw `CitaNoConfirmable` if false; update estado=CONFIRMADA; emit `notificador.citaCambiada`
- [X] T047 [P] [US5] Implement `CancelarCitaUseCase` in `src/modules/consultorio/application/cita/cancelar-cita.usecase.ts`: `ejecutar(id, tenantId, userId)`: get cita, call `cita.puedeCancelar()` â†’ throw `CitaYaAtendida` if false; update estado=CANCELADA; emit `notificador.citaCambiada`
- [X] T048 [P] [US5] Implement `MarcarCitaUseCase` in `src/modules/consultorio/application/cita/marcar-cita.usecase.ts`: `ejecutar(id, accion: "atendida"|"no_asistio", tenantId, userId)`: validates state transition using entity methods; updates estado; emits `notificador.citaCambiada`
- [X] T049 [US5] Implement `cita.rest.ts` in `src/modules/consultorio/adapters/cita.rest.ts`: `GET /citas`, `POST /citas`, `GET /citas/:id`, `POST /citas/:id/confirmar`, `POST /citas/:id/cancelar`, `POST /citas/:id/atendida`, `POST /citas/:id/no-asistio`; inject `IConsultorioNotificador` using `consultorioNotificador` from `server/index.ts` (dynamic import pattern); validate bodies and query params with Zod; map all domain errors to HTTP codes
- [X] T050 [US5] Implement BullMQ worker `src/workers/recordatorio-cita.worker.ts`: `new Worker("recordatorios", async (job) => { const { citaId, canal } = job.data; /* load cita with paciente + medico; send email via Resend to paciente.email + medico member email; create RecordatorioCita record with estadoEnvio=ENVIADO; for SMS/WHATSAPP: create RecordatorioCita with estadoEnvio=PENDIENTE (stub) */ })`;  register worker in `src/server/index.ts`

**Checkpoint**: Citas funcionan end-to-end. Solapamiento â†’ 409. Eventos Socket.IO emitidos. Email recordatorio encolado.

---

## Phase 8: US6 â€” Historia ClÃ­nica (P2)

**Goal**: Registro clÃ­nico por consulta con 4 extensiones por especialidad, adjuntos y vacunaciones.

**Independent Test**: Crear historia â†’ 201; `PUT /historias/:id/odontologia` â†’ 200; `POST /historias/:id/adjuntos` â†’ 201.

- [X] T051 [P] [US6] Create `HistoriaClinicaEntity` in `src/modules/consultorio/domain/historia-clinica.entity.ts`: maps Prisma `HistoriaClinica`; includes optional extension objects (`hcOdontologia?`, `hcPediatria?`, `hcGeneral?`, `hcPerinatal?`); `static fromPrisma(raw)`, `toJSON()`
- [X] T052 [P] [US6] Create `IHistoriaClinicaRepository` port in `src/modules/consultorio/domain/ports/IHistoriaClinicaRepository.ts` with: `crear(data: HistoriaCreateDTO, consultorioId: string, userId: string): Promise<HistoriaClinicaEntity>`, `obtener(id: string, consultorioId: string): Promise<HistoriaClinicaEntity>`, `listar(consultorioId: string, params: HistoriaQueryParams): Promise<ListResult<HistoriaClinicaEntity>>`, `actualizar(id: string, data, userId: string): Promise<HistoriaClinicaEntity>`, `upsertExtension(historiaId: string, tipo: "odontologia"|"pediatria"|"general"|"perinatal", data: object): Promise<void>`, `agregarAdjunto(historiaId: string, data: AdjuntoDTO): Promise<AdjuntoClinico>`, `agregarControlPerinatal(perinatalId: string, data: object): Promise<void>`; export interfaces
- [X] T053 [US6] Implement `HistoriaClinicaPrismaRepository implements IHistoriaClinicaRepository` in `src/modules/consultorio/infrastructure/historia-clinica.prisma.repository.ts`: `crear` uses `withAudit`, validates citaId uniqueness (throws if cita already has historia); `obtener` includes all extensions + adjuntos; `upsertExtension` dispatches to `prisma.hcOdontologia.upsert` / `prisma.hcPediatria.upsert` / `prisma.hcGeneral.upsert` / `prisma.hcPerinatal.upsert` based on `tipo`; `agregarAdjunto` creates `AdjuntoClinico`
- [X] T054 [P] [US6] Implement `CrearHistoriaUseCase` in `src/modules/consultorio/application/historia-clinica/crear-historia.usecase.ts`
- [X] T055 [P] [US6] Implement `ListarHistoriasUseCase` in `src/modules/consultorio/application/historia-clinica/listar-historias.usecase.ts` (filter by pacienteId, medicoId, especialidad)
- [X] T056 [P] [US6] Implement `ObtenerHistoriaUseCase` in `src/modules/consultorio/application/historia-clinica/obtener-historia.usecase.ts`
- [X] T057 [P] [US6] Implement `ActualizarHistoriaUseCase` in `src/modules/consultorio/application/historia-clinica/actualizar-historia.usecase.ts`
- [X] T058 [P] [US6] Implement `UpsertExtensionUseCase` in `src/modules/consultorio/application/historia-clinica/upsert-extension.usecase.ts`: `ejecutar(historiaId, tipo, data, consultorioId, userId)` verifies historia belongs to consultorio then calls `IHistoriaClinicaRepository.upsertExtension`
- [X] T059 [P] [US6] Implement `AdjuntarArchivoUseCase` in `src/modules/consultorio/application/historia-clinica/adjuntar-archivo.usecase.ts`: `ejecutar(historiaId, data: AdjuntoDTO, consultorioId)` verifies ownership then calls `agregarAdjunto`
- [X] T060 [US6] Implement `historia-clinica.rest.ts` in `src/modules/consultorio/adapters/historia-clinica.rest.ts`: `GET /historias`, `POST /historias`, `GET /historias/:id`, `PUT /historias/:id`, `PUT /historias/:id/odontologia`, `PUT /historias/:id/pediatria`, `PUT /historias/:id/general`, `PUT /historias/:id/perinatal`, `POST /historias/:id/perinatal/controles`, `POST /historias/:id/adjuntos`; validate bodies; map errors

**Checkpoint**: Historia clÃ­nica con las 4 extensiones funcional. Adjuntos y control perinatal operativos.

---

## Phase 9: US7 â€” AtenciÃ³n MÃ©dica (P2)

**Goal**: Registro econÃ³mico de consultas con detalle de servicios, pagos parciales y evento en tiempo real.

**Independent Test**: Crear atenciÃ³n con detalle â†’ 201 + totales calculados; registrar pago parcial â†’ estadoPago=PARCIAL; pago total â†’ PAGADO + evento Socket.IO.

- [X] T061 [P] [US7] Create `AtencionMedicaEntity` in `src/modules/consultorio/domain/atencion-medica.entity.ts`: maps Prisma `AtencionMedica` with `detalle: AtencionDetalleRaw[]` and `pagos: AtencionPagoRaw[]`; method `calcularSaldoPendiente(): Decimal` = `total - sum(pagos.monto)`; method `determinarEstadoPago(): "PENDIENTE"|"PARCIAL"|"PAGADO"`; `static fromPrisma(raw)`, `toJSON()`
- [X] T062 [P] [US7] Create `IAtencionMedicaRepository` port in `src/modules/consultorio/domain/ports/IAtencionMedicaRepository.ts` with: `crear(data: AtencionCreateDTO, consultorioId: string, userId: string): Promise<AtencionMedicaEntity>`, `obtener(id: string, consultorioId: string): Promise<AtencionMedicaEntity>`, `listar(consultorioId: string, params: AtencionQueryParams): Promise<ListResult<AtencionMedicaEntity>>`, `registrarPago(atencionId: string, data: PagoDTO, userId: string): Promise<AtencionMedicaEntity>`, `actualizarEstado(id: string, estado: string, estadoPago: string, userId: string): Promise<AtencionMedicaEntity>`; export `AtencionCreateDTO` (with `detalle: DetalleDTO[]`), `PagoDTO`, `AtencionQueryParams`
- [X] T063 [US7] Implement `AtencionMedicaPrismaRepository implements IAtencionMedicaRepository` in `src/modules/consultorio/infrastructure/atencion-medica.prisma.repository.ts`: `crear` uses `$transaction` to create `AtencionMedica` + all `AtencionDetalle` records; auto-calculates `subtotal`, `total` from detalle; takes snapshots (`pacienteNombre`, `medicoNombre`, etc.); uses `withAudit`; `registrarPago` creates `AtencionPago` then recalculates `estadoPago` and updates `AtencionMedica.estadoPago` and `estado` (COMPLETADA when pagado total); `obtener` includes `detalle` and `pagos`
- [X] T064 [US7] Implement `CrearAtencionUseCase` in `src/modules/consultorio/application/atencion-medica/crear-atencion.usecase.ts`: verify paciente and medico belong to consultorio; load snapshots (paciente nombre/apellido, medico nombre/especialidad); `IAtencionMedicaRepository.crear`; no event on creation (only on payment)
- [X] T065 [P] [US7] Implement `ListarAtencionesUseCase` in `src/modules/consultorio/application/atencion-medica/listar-atenciones.usecase.ts`
- [X] T066 [P] [US7] Implement `ObtenerAtencionUseCase` in `src/modules/consultorio/application/atencion-medica/obtener-atencion.usecase.ts`
- [X] T067 [US7] Implement `RegistrarPagoUseCase` in `src/modules/consultorio/application/atencion-medica/registrar-pago.usecase.ts`: get atencion, check `atencion.calcularSaldoPendiente()` >= monto (else throw `PagoExcedeTotalError`); check estado != ANULADA (else error); `registrarPago`; emit `notificador.atencionCambiada(tenantId, { atencionId, estadoPago, estado, total })`
- [X] T068 [US7] Implement `AnularAtencionUseCase` in `src/modules/consultorio/application/atencion-medica/anular-atencion.usecase.ts`: check `estadoPago != PAGADO` (else throw `AtencionYaPagada`); update `estado=ANULADA`; emit `notificador.atencionCambiada`
- [X] T069 [US7] Implement `atencion-medica.rest.ts` in `src/modules/consultorio/adapters/atencion-medica.rest.ts`: `GET /atenciones`, `POST /atenciones`, `GET /atenciones/:id`, `PATCH /atenciones/:id`, `POST /atenciones/:id/pagos`, `POST /atenciones/:id/anular`; validate bodies; inject `consultorioNotificador`; map errors to HTTP

**Checkpoint**: AtenciÃ³n mÃ©dica con pagos parciales funcional. `estadoPago` transiciona correctamente. Evento `consultorio:atencion:estadoCambiado` emitido al pagar.

---

## Phase 10: US8 â€” Receta MÃ©dica (P2)

**Goal**: PrescripciÃ³n mÃ©dica con posologÃ­a, vigencia, nÃºmero legible y eventos en tiempo real.

**Independent Test**: Emitir receta â†’ 201 + `numeroReceta="REC-2026-00001"` + evento Socket.IO; anular â†’ 200 + estado=ANULADA; anular despachada â†’ 422.

- [X] T070 [P] [US8] Create `RecetaMedicaEntity` in `src/modules/consultorio/domain/receta-medica.entity.ts`: maps Prisma `RecetaMedica` with `detalle: RecetaMedicaDetalleRaw[]`; method `puedeAnularse(): boolean` (estado != DESPACHADA); `static fromPrisma(raw)`, `toJSON()`
- [X] T071 [P] [US8] Create `IRecetaMedicaRepository` port in `src/modules/consultorio/domain/ports/IRecetaMedicaRepository.ts` with: `crear(data: RecetaCreateDTO, consultorioId: string, userId: string): Promise<RecetaMedicaEntity>`, `obtener(id: string, consultorioId: string): Promise<RecetaMedicaEntity>`, `listar(consultorioId: string, params: RecetaQueryParams): Promise<ListResult<RecetaMedicaEntity>>`, `anular(id: string, userId: string): Promise<RecetaMedicaEntity>`, `ultimaReceta(consultorioId: string): Promise<{ numeroReceta: string } | null>`; export `RecetaCreateDTO` (with `detalle: RecetaDetalleDTO[]`)
- [X] T072 [US8] Implement `RecetaMedicaPrismaRepository implements IRecetaMedicaRepository` in `src/modules/consultorio/infrastructure/receta-medica.prisma.repository.ts`: `crear` uses `$transaction` to create `RecetaMedica` + all `RecetaMedicaDetalle`; `ultimaReceta` queries `findFirst({ orderBy: { createdAt: "desc" }, select: { numeroReceta: true } })`; `obtener` includes `detalle`; `anular` updates `estado=ANULADA` with `withAudit`
- [X] T073 [US8] Implement `CrearRecetaUseCase` in `src/modules/consultorio/application/receta-medica/crear-receta.usecase.ts`: verify atencion belongs to consultorio; load medico and paciente snapshots; generate `numeroReceta` using `IRecetaMedicaRepository.ultimaReceta` â†’ `REC-${year}-${String(seq).padStart(5,"0")}`; set `fechaVencimiento` default to `fechaEmision + 30 days`; `crear`; emit `notificador.recetaEmitida(tenantId, { recetaId, numeroReceta, medicoId, pacienteId, atencionId })`
- [X] T074 [P] [US8] Implement `ListarRecetasUseCase` in `src/modules/consultorio/application/receta-medica/listar-recetas.usecase.ts` (filter by medicoId, pacienteId, estado)
- [X] T075 [P] [US8] Implement `ObtenerRecetaUseCase` in `src/modules/consultorio/application/receta-medica/obtener-receta.usecase.ts`
- [X] T076 [US8] Implement `AnularRecetaUseCase` in `src/modules/consultorio/application/receta-medica/anular-receta.usecase.ts`: get receta, call `receta.puedeAnularse()` â†’ throw `RecetaDespachada` if false; `IRecetaMedicaRepository.anular`; emit `notificador.recetaEmitida` (with `estado=ANULADA` in payload)
- [X] T077 [US8] Implement `receta-medica.rest.ts` in `src/modules/consultorio/adapters/receta-medica.rest.ts`: `GET /recetas`, `POST /recetas`, `GET /recetas/:id`, `POST /recetas/:id/anular`; validate bodies; inject `consultorioNotificador`; map errors

**Checkpoint**: Recetas emitidas con nÃºmero legible. Evento emitido. `RecetaDespachada` â†’ 422.

---

## Phase 11: Polish & Tests

**Purpose**: Test helpers, unit tests crÃ­ticos y validaciÃ³n TypeScript.

- [X] T078 [P] Create `FakeConsultorioRepository` in `tests/helpers/fake-consultorio.repository.ts`: in-memory `Map<string, ConsultorioRaw>`; implements `IConsultorioRepository`
- [X] T079 [P] Create `FakeMedicoRepository` in `tests/helpers/fake-medico.repository.ts`: in-memory maps for mÃ©dicos y horarios; implements `IMedicoRepository`; `verificarSolapamiento` implementado en memoria
- [X] T080 [P] Create `FakeCitaRepository` in `tests/helpers/fake-cita.repository.ts`: in-memory citas map; `verificarSolapamiento` implementado con la misma lÃ³gica de overlap que el real
- [X] T081 [P] Create `FakeConsultorioNotificador` in `tests/helpers/fake-consultorio.notificador.ts`: implements `IConsultorioNotificador`; stores emitted events in `eventos: { tipo: string; payload: unknown }[]`; exposes `limpiar()` and `tieneEvento(tipo: string): boolean`
- [X] T082 [P] Create unit test `tests/unit/crear-cita.usecase.test.ts`: test solapamiento exacto (overlap â†’ CitaSolapada), solapamiento parcial (overlap â†’ CitaSolapada), sin solapamiento (ok), citas canceladas no bloquean; uses `FakeCitaRepository` + `FakeConsultorioNotificador`
- [X] T083 [P] Create unit test `tests/unit/registrar-pago.usecase.test.ts`: pago parcial â†’ estadoPago=PARCIAL; pago total â†’ estadoPago=PAGADO + evento emitido; pago excede saldo â†’ PagoExcedeTotalError; uses `FakeAtencionRepository` + `FakeConsultorioNotificador`
- [X] T084 [P] Create unit test `tests/unit/crear-receta.usecase.test.ts`: primera receta â†’ "REC-2026-00001"; segunda receta â†’ "REC-2026-00002"; evento emitido; uses `FakeRecetaRepository` + `FakeConsultorioNotificador`
- [X] T085 Run `pnpm exec tsc --noEmit` and fix all TypeScript errors until zero errors reported
- [X] T086 Run quickstart.md scenarios manually (requires `pnpm dev` running with DB and Redis) â€” validates escenarios 1â€“7 from `specs/002-consultorio/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias â€” comenzar inmediatamente
- **Foundational (Phase 2)**: Depende de Phase 1 â€” BLOQUEA todas las historias
- **US1â€“US4 (Phases 3â€“6)**: Solo dependen de Phase 2 â€” pueden ejecutarse en paralelo entre sÃ­
- **US5 (Phase 7)**: Depende de US2 (mÃ©dicos) y US3 (pacientes) para verificar pertenencia al consultorio
- **US6 (Phase 8)**: Depende de US2 (mÃ©dicos) y US3 (pacientes)
- **US7 (Phase 9)**: Depende de US3 (pacientes), US4 (servicios), US5 opcional (citaId)
- **US8 (Phase 10)**: Depende de US7 (atencionId requerido en receta)
- **Polish (Phase 11)**: Depende de todas las historias

### User Story Dependencies

```
Phase 1 (Setup)
  â†’ Phase 2 (Foundational)
    â†’ US1 (Perfil)        â† puede empezar solo con Phase 2
    â†’ US2 (MÃ©dicos)       â† puede empezar solo con Phase 2
    â†’ US3 (Pacientes)     â† puede empezar solo con Phase 2
    â†’ US4 (Servicios)     â† puede empezar solo con Phase 2
    â†’ US5 (Citas)         â† necesita US2 + US3
    â†’ US6 (Historia)      â† necesita US2 + US3
    â†’ US7 (AtenciÃ³n)      â† necesita US3 + US4; US5 opcional
    â†’ US8 (Receta)        â† necesita US7
  â†’ Polish (Phase 11)     â† necesita todas las historias deseadas
```

### Parallel Opportunities

- T002 y T003 (Phase 1) pueden ejecutarse en paralelo
- T004â€“T007 (Phase 2) pueden ejecutarse en paralelo
- Dentro de cada historia: entidad [P] + puerto [P] pueden hacerse en paralelo antes del repositorio
- US1, US2, US3, US4 pueden ejecutarse completamente en paralelo entre sÃ­
- T078â€“T084 (Polish tests) pueden ejecutarse en paralelo

---

## Parallel Example: US2 (MÃ©dicos)

```bash
# En paralelo: entidad + puerto
Task T015: "Create MedicoEntity in src/modules/consultorio/domain/medico.entity.ts"
Task T016: "Create IMedicoRepository port in src/modules/consultorio/domain/ports/IMedicoRepository.ts"

# Luego secuencial: repositorio (depende de los dos anteriores)
Task T017: "Implement MedicoPrismaRepository..."

# En paralelo: casos de uso (dependen de T016, T017)
Task T018: "CrearMedicoUseCase"
Task T019: "ListarMedicosUseCase"
Task T020: "ObtenerMedicoUseCase"
Task T021: "ActualizarMedicoUseCase"

# Secuencial: gestionar horarios (lÃ³gica cross)
Task T022: "GestionarHorariosUseCase"

# Secuencial: REST adapter (depende de todos los casos de uso)
Task T023: "medico.rest.ts"
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3 + US4 + US5)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (CRÃTICO â€” bloquea todo)
3. Completar US1: Perfil â†’ validar con `GET/PUT /api/consultorio/perfil`
4. Completar US2: MÃ©dicos â†’ validar escenario 2 del quickstart
5. Completar US3: Pacientes â†’ validar escenario 3 del quickstart
6. Completar US4: Servicios â†’ validar CRUD servicios
7. Completar US5: Citas â†’ **STOP y VALIDAR** escenario 3+7 del quickstart; verificar Socket.IO
8. **Deploy/demo** con el mÃ³dulo de agenda operativo (P1 completo)

### Incremental Delivery

1. Setup + Foundational â†’ estructura lista
2. US1â€“US4 en paralelo â†’ configuraciÃ³n base del consultorio
3. US5 (Citas) â†’ agenda funcional con tiempo real â†’ **MVP demostrable**
4. US6 (Historia ClÃ­nica) â†’ historial mÃ©dico
5. US7 (AtenciÃ³n MÃ©dica) â†’ cobro de consultas
6. US8 (Receta MÃ©dica) â†’ prescripciones
7. Polish â†’ tests + validaciÃ³n TypeScript

---

## Notes

- `[P]` = archivos distintos, sin dependencias entre sÃ­ dentro de la misma fase
- Cada historia de usuario es completamente implementable e independientemente testeable
- El guard `requireConsultorio` se aplica globalmente en `consultorio-router.ts` (T008)
- Los eventos Socket.IO se emiten desde los casos de uso, nunca desde los adaptadores REST
- Usar `crearPrismaScoped(tenantId, userId)` en TODOS los repositorios para garantizar aislamiento
- Los snapshots (nombre paciente, mÃ©dico, especialidad) se toman al momento de crear la entidad
- `withAudit(data, userId)` y `withTenantScope(where, tenantId)` de `core/prisma-scoped.ts` para auditorÃ­a y filtrado
- Lanzar `pnpm exec tsc --noEmit` despuÃ©s de cada fase para detectar errores de tipo temprano
