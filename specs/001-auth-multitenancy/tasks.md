# Tasks: Cimiento de Autenticación y Multi-tenancy

**Feature**: `001-auth-multitenancy`
**Input**: Design documents from `specs/001-auth-multitenancy/`
**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅ · contracts/ ✅

**Tests**: No incluidos (no solicitados en la especificación). Ver Phase 8 para helpers de test opcionales.

**Organization**: Tasks agrupadas por user story para implementación e iteración independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Se puede ejecutar en paralelo (archivos distintos, sin dependencias entre sí)
- **[Story]**: A qué user story pertenece esta task (US1–US5)
- Incluye rutas exactas de archivos en todas las descripciones

---

## Phase 1: Setup (Estructura inicial)

**Purpose**: Crear la estructura de directorios y verificar dependencias antes de escribir código.

- [ ] T001 Crear estructura de directorios del proyecto: `src/core/`, `src/modules/autenticacion/{domain,infrastructure,adapters}/`, `src/modules/tenant/{domain/ports,application,infrastructure,adapters}/`, `src/server/`, `tests/{unit/modules/tenant/domain,integration/modules/tenant/infrastructure,helpers}/`
- [ ] T002 [P] Verificar que las dependencias requeridas están en `package.json`: `better-auth`, `hono`, `@hono/zod-openapi`, `socket.io`, `ioredis`, `zod`, `pino`, `pino-http`, `@prisma/client`; instalar faltantes con `pnpm install`
- [ ] T003 [P] Crear archivo `.env` en la raíz del proyecto con las variables de `specs/001-auth-multitenancy/quickstart.md`: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `APP_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `REDIS_URL`, `RESEND_API_KEY`

---

## Phase 2: Foundational (Bloqueante para todas las user stories)

**Purpose**: Infraestructura core que DEBE estar completa antes de implementar cualquier user story.

**⚠️ CRÍTICO**: Ninguna user story puede comenzar hasta que esta fase esté completa.

- [ ] T004 Generar cliente Prisma ejecutando `pnpm prisma generate` (output: `src/generated/prisma/`) — verifica que genera desde `prisma/schema.prisma` con multiSchema habilitado
- [ ] T005 [P] Implementar `src/core/query-params.ts`: función `makeQueryParamsSchema(allowedOrderByFields)` retorna Zod schema con `take/skip/orderBy/order/search/filterField/filterOp/filterValue`; función `toPrismaArgs(params)` convierte al formato Prisma `{ take, skip, orderBy, where }`; función `paginate<T>(data, total, params)` retorna `{ data, meta: { take, total, hasMore, nextCursor } }`
- [ ] T006 [P] Crear `src/server/hono.ts`: instancia Hono con OpenAPIHono de `@hono/zod-openapi`, middleware Pino para logging HTTP, handler de errores JSON estándar con status codes (400/401/403/404/429/500), ruta `GET /api/openapi.json` para spec OpenAPI
- [ ] T007 Crear `src/server/index.ts`: entry point del Web Service — crea servidor HTTP Node.js con la app Hono, escucha en `process.env.PORT ?? 3000`, exporta `httpServer` para que Socket.IO lo use en US5
- [ ] T008 Implementar `src/modules/autenticacion/infrastructure/better-auth.setup.ts`: instancia Better-Auth con `emailAndPassword({ requireEmailVerification: true, minPasswordLength: 8 })`, plugin `organization` con `additionalFields` mapeados a `Tenant`/`TenantMember`/`Invitacion`, plugin `admin` con roles `user`/`admin`, `session.expiresIn: 604800` (7 días) — los proveedores email y hooks de dominio se añaden en fases US1/US2
- [ ] T009 [P] Implementar `src/modules/autenticacion/adapters/auth.rest.ts`: handler Hono que delega todos los requests en `/api/auth/**` al handler de BA (`auth.handler(req)`), convirtiendo Request/Response de Web API a Hono context
- [ ] T010 Implementar `src/core/hono-context.ts`: middleware `requireAuth` que llama a `auth.api.getSession()` con el request actual, establece `c.var.session` y `c.var.usuario`, retorna 401 si no hay sesión válida — exportar tipos `Variables` para Hono `Context<{ Variables }>`

**Checkpoint**: Fundación lista. BA maneja todos los flujos de auth; el middleware protege rutas. Se puede iniciar US1 y US2 en paralelo.

---

## Phase 3: User Story 1 — Registro e Inicio de Sesión (Priority: P1) 🎯 MVP

**Goal**: Un visitante puede registrarse con email/contraseña, verificar su email e iniciar sesión. También puede iniciar sesión con Google. Los intentos fallidos tienen espera creciente.

**Independent Test**: Ejecutar los pasos 1–3 de `specs/001-auth-multitenancy/quickstart.md` (sign-up → verify-email → sign-in) sin ningún tenant existente. Verificar 200 en sign-in con sesión activa.

- [ ] T011 [P] [US1] Crear `src/modules/autenticacion/domain/autenticacion.errors.ts` con clases de error de dominio: `EmailNoVerificado`, `CredencialesInvalidas`, `EmailYaRegistrado`, `TokenInvalido`, `CuentaEliminada` — cada una extiende `Error` con `code` string para discriminar en handlers
- [ ] T012 [US1] Agregar envío de email de verificación en `src/modules/autenticacion/infrastructure/better-auth.setup.ts`: implementar `emailVerification.sendVerificationEmail({ user, url })` usando Resend API (`RESEND_API_KEY`) para enviar correo HTML con el enlace de verificación a `user.email`
- [ ] T013 [US1] Agregar envío de email de restablecimiento de contraseña en `src/modules/autenticacion/infrastructure/better-auth.setup.ts`: implementar `emailAndPassword.sendResetPassword({ user, url })` usando Resend API para enviar correo HTML con enlace de reset a `user.email`
- [ ] T014 [US1] Configurar proveedor Google OAuth en `src/modules/autenticacion/infrastructure/better-auth.setup.ts`: `socialProviders.google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })` — BA crea cuenta automáticamente en el primer login
- [ ] T015 [US1] Configurar `rateLimit` en BA en `src/modules/autenticacion/infrastructure/better-auth.setup.ts`: `rateLimit({ window: 60, max: 5, storage: "memory" })` sobre endpoints de sign-in — BA retorna 429 con `Retry-After` para que el cliente aplique espera creciente (5 s, 15 s, 60 s)
- [ ] T016 [US1] Registrar router `/api/auth/**` en `src/server/hono.ts`: importar y montar `auth.rest.ts` — verificar que BA responde en `GET /api/auth/get-session`

**Checkpoint**: US1 completo. Flujo register → verify-email → login → logout funciona vía `/api/auth/*`. Google OAuth disponible. Rate limiting activo en sign-in.

---

## Phase 4: User Story 2 — Creación y Configuración de Tenant (Priority: P1)

**Goal**: Un usuario autenticado crea un tenant; queda registrado automáticamente como propietario (fila `Propietario` creada); puede leer los datos del tenant y listar sus tenants.

**Independent Test**: Crear tenant vía `POST /api/auth/organization/create`, verificar fila en tabla `propietario`, llamar `GET /api/tenant/actual` y recibir datos del tenant.

- [ ] T017 [P] [US2] Crear `src/modules/tenant/domain/tenant.entity.ts`: clase `TenantEntity` con factory `fromPrisma(raw)`, getters de capability flags (`esTienda`, `esConsultorio`, `esRestaurante`), método `toJSON()` que retorna el shape del contrato `tenant-rest.md`
- [ ] T018 [P] [US2] Crear `src/modules/tenant/domain/tenant.errors.ts`: clases `TenantNoEncontrado(id)`, `SlugDuplicado(slug)`, `SinTenantActivo`, `PermisoDenegado(rol, rolRequerido)`, `PropietarioUnico` — cada una con `code` string
- [ ] T019 [P] [US2] Crear `src/modules/tenant/domain/ports/ITenantRepository.ts`: interfaz con métodos `obtener(id: string): Promise<TenantEntity>`, `listarPorUsuario(userId: string, params): Promise<{ data, total }>`, `listarMiembros(tenantId: string, params): Promise<{ data, total }>`, `listarInvitaciones(tenantId: string, params): Promise<{ data, total }>`
- [ ] T020 [P] [US2] Crear `src/modules/tenant/domain/ports/ITenantNotificador.ts`: interfaz con métodos `tenantActualizado(tenantId: string, datos: Partial<TenantEntity>): void`, `tenantEliminado(tenantId: string): void`, `miembroUnido(tenantId: string, userId: string): void`, `miembroRemovido(tenantId: string, userId: string): void`
- [ ] T021 [US2] Implementar `src/modules/tenant/infrastructure/tenant.prisma.repository.ts` con Prisma (cliente estándar, sin scope aún): `obtener` busca por ID lanzando `TenantNoEncontrado` si no existe; `listarPorUsuario` join con `TenantMember` filtrando por `userId`; `listarMiembros` y `listarInvitaciones` filtran por `organizationId` explícito — aplicar `toPrismaArgs` de `core/query-params.ts`
- [ ] T022 [US2] Agregar hook `onOrganizationCreated` en `src/modules/autenticacion/infrastructure/better-auth.setup.ts`: recibe `{ organization, member }`, crea fila en `Propietario` vía Prisma con `tenantId: organization.id`, `userId: member.userId`, campos requeridos con valores placeholder (`nombres: ""`, `telefono: ""`), llama `notificador.miembroUnido(organization.id, member.userId)`
- [ ] T023 [US2] Agregar hook `onOrganizationUpdated` en `src/modules/autenticacion/infrastructure/better-auth.setup.ts`: recibe `{ organization }`, llama `notificador.tenantActualizado(organization.id, organization)`
- [ ] T024 [US2] Agregar hook `onOrganizationDeleted` en `src/modules/autenticacion/infrastructure/better-auth.setup.ts`: recibe `{ organizationId }`, llama `notificador.tenantEliminado(organizationId)`
- [ ] T025 [P] [US2] Crear `src/modules/tenant/application/obtener-tenant.usecase.ts`: `ObtenerTenantUseCase` recibe `ITenantRepository`, método `ejecutar(tenantId: string)` delega a `repo.obtener(tenantId)` — no lanza errores propios, propaga los del repo
- [ ] T026 [P] [US2] Crear `src/modules/tenant/application/listar-tenants-usuario.usecase.ts`: `ListarTenantsUsuarioUseCase` recibe `ITenantRepository`, método `ejecutar(userId: string, params)` delega a `repo.listarPorUsuario(userId, params)`
- [ ] T027 [US2] Crear `src/modules/tenant/adapters/tenant.schema.ts`: Zod schemas para contratos de `specs/001-auth-multitenancy/contracts/tenant-rest.md` — `TenantActualResponseSchema` (con `propietario` anidado), `ListaTenantItemSchema` (con `miRol`), `PaginadoMetaSchema`, `QueryParamsTenantSchema` usando `makeQueryParamsSchema(["name", "createdAt"])`
- [ ] T028 [US2] Crear `src/modules/tenant/adapters/tenant.rest.ts`: router Hono+zod-openapi con `GET /api/tenant/actual` (llama `ObtenerTenantUseCase` con `session.activeOrganizationId`) y `GET /api/tenant` (llama `ListarTenantsUsuarioUseCase` con `session.userId`); aplicar `requireAuth` de `hono-context.ts`; instanciar use cases con `TenantPrismaRepository`
- [ ] T029 [US2] Registrar router `/api/tenant/**` en `src/server/hono.ts`: importar y montar `tenant.rest.ts` — verificar que `GET /api/tenant/actual` retorna 400 si no hay tenant activo

**Checkpoint**: US2 completo. Crear tenant → fila `Propietario` creada → `GET /api/tenant/actual` retorna datos. Hooks de dominio (update/delete) invocados. `GET /api/tenant` lista los tenants del usuario con paginación.

---

## Phase 5: User Story 3 — Invitación y Membresía (Priority: P2)

**Goal**: Propietario/admin invita usuarios por email; el invitado acepta y se convierte en miembro. El endpoint `GET /api/tenant/invitaciones` lista invitaciones. Eventos de membresía emitidos vía Socket.IO.

**Independent Test**: Con un tenant creado, invitar un email vía `POST /api/auth/organization/invite-member`, aceptar el link, verificar con `GET /api/tenant/invitaciones` que el status cambia a `accepted`.

- [ ] T030 [P] [US3] Crear `src/modules/tenant/application/listar-invitaciones-pendientes.usecase.ts`: `ListarInvitacionesPendientesUseCase` recibe `ITenantRepository`, método `ejecutar(tenantId: string, params)` delega a `repo.listarInvitaciones(tenantId, params)`
- [ ] T031 [US3] Agregar schemas de invitación en `src/modules/tenant/adapters/tenant.schema.ts`: `InvitacionResponseSchema` con campos `id`, `email`, `role`, `status`, `expiresAt`, `invitador: { name, email }`; `QueryParamsInvitacionSchema` con `makeQueryParamsSchema(["status", "createdAt"])` + `filterField/filterValue` para filtrar por status
- [ ] T032 [US3] Agregar `GET /api/tenant/invitaciones` en `src/modules/tenant/adapters/tenant.rest.ts`: requiere `requireAuth` + guard `requireRol(["PROPIETARIO", "owner", "ADMIN"])`; llama `ListarInvitacionesPendientesUseCase` con `tenantId` del query param o de `session.activeOrganizationId`; retorna shape paginado del contrato
- [ ] T033 [US3] Agregar hook `onMemberCreated` en `src/modules/autenticacion/infrastructure/better-auth.setup.ts`: recibe `{ member }`, llama `notificador.miembroUnido(member.organizationId, member.userId)` — se dispara cuando un invitado acepta la invitación
- [ ] T034 [US3] Agregar hook `onMemberDeleted` en `src/modules/autenticacion/infrastructure/better-auth.setup.ts`: recibe `{ member }`, llama `notificador.miembroRemovido(member.organizationId, member.userId)` — se dispara cuando un miembro es eliminado o sale voluntariamente

**Checkpoint**: US3 completo. Invite → email (BA) → aceptar → miembro listado. Eventos `miembro:unido` y `miembro:removido` disparados en cada cambio de membresía.

---

## Phase 6: User Story 4 — Tenant Activo y Aislamiento (Priority: P2)

**Goal**: Prisma scoped client garantiza aislamiento de datos por tenant. Guards de hono-context bloquean acceso sin tenant activo. `GET /api/tenant/miembros` lista miembros del tenant activo con búsqueda y filtros.

**Independent Test**: Con dos tenants y un usuario miembro de ambos, cambiar tenant activo vía BA (`PUT /api/auth/organization/set-active`) y verificar que `GET /api/tenant/miembros` retorna los miembros del tenant activo únicamente.

- [ ] T035 [US4] Implementar `src/core/prisma-scoped.ts`: función `crearPrismaScoped(tenantId: string, userId: string)` que retorna `prisma.$extends({ query: { $allModels: { create: inyecta `tenantId`, `createdById`, `updatedById`; findMany/findFirst/findUnique: agrega `where: { tenantId }` automáticamente; update: inyecta `updatedById` } } })` — el cliente extendido es específico por request
- [ ] T036 [US4] Agregar guard `requireTenantActivo` en `src/core/hono-context.ts`: lee `c.var.session.activeOrganizationId`, retorna 400 con código `SIN_TENANT_ACTIVO` si es null/undefined, establece `c.var.tenantId` para uso downstream
- [ ] T037 [US4] Agregar factory `requireRol(roles: string[])` en `src/core/hono-context.ts`: middleware que busca `TenantMember` por `{ organizationId: c.var.tenantId, userId: c.var.session.userId }`, retorna 403 si el rol no está en la lista permitida (acepta `"owner"` y `"PROPIETARIO"` como equivalentes)
- [ ] T038 [US4] Actualizar `src/modules/tenant/infrastructure/tenant.prisma.repository.ts`: modificar `listarMiembros` y `listarInvitaciones` para recibir el cliente Prisma scoped como parámetro; actualizar `ITenantRepository` para pasar `prismaScoped` en esos métodos o inyectarlo vía constructor para queries con scope
- [ ] T039 [P] [US4] Crear `src/modules/tenant/application/listar-miembros.usecase.ts`: `ListarMiembrosUseCase` recibe `ITenantRepository`, método `ejecutar(tenantId: string, params)` delega a `repo.listarMiembros(tenantId, params)` incluyendo JOIN con `User` para campos `name`, `email`, `image`
- [ ] T040 [US4] Agregar schemas de miembro en `src/modules/tenant/adapters/tenant.schema.ts`: `MiembroResponseSchema` con campos `id`, `userId`, `role`, `estado`, `createdAt`, `usuario: { name, email, image }`; `QueryParamsMiembrosSchema` con `makeQueryParamsSchema(["createdAt", "role"])` + `search` y `filterField/filterOp/filterValue`
- [ ] T041 [US4] Agregar `GET /api/tenant/miembros` en `src/modules/tenant/adapters/tenant.rest.ts`: aplica `requireAuth` + `requireTenantActivo`; llama `ListarMiembrosUseCase` con `tenantId` de `c.var.tenantId`; pasa prismaScoped construido con `crearPrismaScoped(tenantId, userId)` al repositorio
- [ ] T042 [US4] Aplicar `requireTenantActivo` a `GET /api/tenant/actual` en `src/modules/tenant/adapters/tenant.rest.ts`: el endpoint ya usa `session.activeOrganizationId`, agregar el guard formalmente para retornar 400 estructurado en lugar de error genérico

**Checkpoint**: US4 completo. Aislamiento verificado: cambiar tenant activo cambia los datos visibles. Ningún usuario puede acceder a datos de tenants ajenos. `GET /api/tenant/miembros` soporta búsqueda por nombre/email y paginación.

---

## Phase 7: User Story 5 — Actualizaciones en Tiempo Real (Priority: P3)

**Goal**: Usuarios conectados al mismo tenant reciben eventos Socket.IO cuando el tenant es modificado o cuando cambia la membresía.

**Independent Test**: Abrir dos conexiones WebSocket al mismo sala `tenant:${tenantId}`, actualizar el tenant vía BA, verificar que el segundo cliente recibe `tenant:actualizado` en menos de 2 segundos.

- [ ] T043 [P] [US5] Configurar servidor Socket.IO en `src/server/index.ts`: crear `Server` de `socket.io` adjunto al `httpServer`, configurar Redis adapter con `ioredis` (`REDIS_URL`) para soporte horizontal — exportar `io` para uso en el notificador
- [ ] T044 [US5] Implementar `src/modules/tenant/infrastructure/tenant.socket.notificador.ts`: clase `TenantSocketNotificador` implementando `ITenantNotificador` — recibe `io: Server` en constructor; cada método emite al room `tenant:${tenantId}` el evento correspondiente: `tenant:actualizado`, `tenant:eliminado`, `tenant:miembro:unido`, `tenant:miembro:removido` con payload según `specs/001-auth-multitenancy/contracts/socket-events.md`
- [ ] T045 [US5] Agregar middleware de autenticación Socket.IO en `src/server/index.ts`: en `io.use()`, leer `socket.handshake.auth.token`, validar sesión BA con `auth.api.getSession()`, rechazar con `Error("unauthorized")` si inválida, establecer `socket.data.session` para uso en handlers
- [ ] T046 [US5] Agregar handler de conexión y salas en `src/server/index.ts`: en `io.on("connection", socket => ...)`, consultar `TenantMember` por `userId` del socket, hacer `socket.join(`tenant:${tm.organizationId}`)` para cada tenant del usuario — el socket queda suscrito a todas las salas de sus tenants
- [ ] T047 [US5] Conectar `TenantSocketNotificador` en `src/modules/autenticacion/infrastructure/better-auth.setup.ts`: reemplazar el notificador stub en hooks `onOrganizationCreated/Updated/Deleted` y `onMemberCreated/Deleted` con la instancia real de `TenantSocketNotificador` — pasar la instancia `io` exportada desde `src/server/index.ts`
- [ ] T048 [US5] Conectar `TenantSocketNotificador` en `src/modules/tenant/adapters/tenant.rest.ts`: pasar instancia a los use cases que lo necesiten vía inyección en el factory de routes en `src/server/hono.ts`

**Checkpoint**: US5 completo. Flujo end-to-end: acción BA → hook `onOrganizationUpdated` → `ITenantNotificador.tenantActualizado()` → `io.to("tenant:id").emit("tenant:actualizado")` → cliente WS recibe el evento.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Mejoras transversales que benefician todas las user stories.

- [ ] T049 [P] Registrar todos los schemas Zod en el registry OpenAPI de `@hono/zod-openapi` en `src/server/hono.ts`: verificar que `GET /api/openapi.json` retorna spec válida con todos los endpoints de `/api/tenant/**`
- [ ] T050 [P] Agregar logging estructurado Pino en adaptadores y use cases: loguear `[autenticacion] hook:onOrganizationCreated tenantId=X`, `[tenant] usecase:obtenerTenant tenantId=X`, `[socket] emit:tenant:actualizado tenantId=X room=tenant:X`
- [ ] T051 Crear `tests/helpers/fake-tenant.repository.ts`: implementación en memoria de `ITenantRepository` para tests unitarios de use cases — `Map<string, TenantEntity>` con métodos que resuelven localmente sin Prisma
- [ ] T052 [P] Crear `tests/helpers/fake-tenant.notificador.ts`: spy de `ITenantNotificador` que registra llamadas en arrays `eventos: { tipo, tenantId, payload }[]` para assertions en tests
- [ ] T053 Ejecutar validación de `specs/001-auth-multitenancy/quickstart.md`: correr los 5 comandos curl del quickstart y verificar respuestas esperadas (201 sign-up, 200 sign-in, 201 org/create, 200 tenant/actual)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias — puede comenzar de inmediato
- **Foundational (Phase 2)**: Depende de Phase 1 — BLOQUEA todas las user stories
- **US1 (Phase 3)** y **US2 (Phase 4)**: Dependen de Phase 2 — pueden ejecutarse en paralelo entre sí
- **US3 (Phase 5)**: Depende de US2 (necesita tenant + hooks de membresía)
- **US4 (Phase 6)**: Depende de US2 (necesita repositorio base); puede solaparse con US3
- **US5 (Phase 7)**: Depende de US2 (hooks) + US4 (notificador) para el wiring completo; la infraestructura Socket.IO (T043–T046) puede hacerse antes
- **Polish (Phase 8)**: Depende de que las user stories deseadas estén completas

### User Story Dependencies

- **US1 (P1)**: Inicia tras Phase 2. Sin dependencias de otras US.
- **US2 (P1)**: Inicia tras Phase 2. Sin dependencias de otras US. Puede correr en paralelo con US1.
- **US3 (P2)**: Inicia tras US2 (necesita tenant creado y hooks de membresía).
- **US4 (P2)**: Inicia tras US2 (extiende el repositorio). Puede correr en paralelo con US3.
- **US5 (P3)**: Inicia tras US2 (hooks) y puede solaparse con US4. T043–T046 (infra Socket.IO) son independientes.

### Within Each User Story

- Puertos/entidades de dominio antes que infraestructura
- Repositorio antes que use cases
- Use cases antes que adaptadores REST
- Adaptadores REST antes de registrar en `hono.ts`

### Parallel Opportunities

- T002, T003, T005, T006, T009 — Setup y fundacional: archivos distintos, sin dependencias
- T017, T018, T019, T020 — Dominio de tenant: cuatro archivos distintos, todos paralelos
- T025, T026 — Use cases de lectura de tenant: independientes entre sí
- T030, T039 — Use cases de invitaciones y miembros: independientes entre sí
- T043, T051, T052 — Socket.IO infra y test helpers: paralelos entre sí
- Una vez completada la Phase 2, **US1 y US2 pueden ejecutarse en paralelo** por desarrolladores distintos

---

## Parallel Example: Phase 4 (US2)

```bash
# Lanzar en paralelo — archivos distintos, sin dependencias entre sí:
Task: "T017 — src/modules/tenant/domain/tenant.entity.ts"
Task: "T018 — src/modules/tenant/domain/tenant.errors.ts"
Task: "T019 — src/modules/tenant/domain/ports/ITenantRepository.ts"
Task: "T020 — src/modules/tenant/domain/ports/ITenantNotificador.ts"

# Luego, en paralelo una vez que T019/T020 están completos:
Task: "T025 — src/modules/tenant/application/obtener-tenant.usecase.ts"
Task: "T026 — src/modules/tenant/application/listar-tenants-usuario.usecase.ts"
```

---

## Implementation Strategy

### MVP (US1 + US2 solamente)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (**CRÍTICO** — bloquea todo)
3. Completar Phase 3: US1 — register/login/email/Google
4. Completar Phase 4: US2 — tenant creation/read
5. **VALIDAR**: Ejecutar quickstart.md pasos 1–5
6. Deploy/demo: el sistema es funcional para un solo usuario y un tenant

### Entrega Incremental

1. Setup + Foundational → servidor en pie con BA montado
2. US1 → Auth completo con email y Google → **Demo**
3. US2 → Tenants funcionales → **Demo** (MVP real)
4. US3 → Invitaciones y membresía → **Demo**
5. US4 → Aislamiento de tenant + member listing → **Demo**
6. US5 → Tiempo real → **Demo** (funcionalidad completa)
7. Polish → Logging, OpenAPI, test helpers

### Estrategia con Dos Desarrolladores

Con Phase 2 completada:
- **Dev A**: US1 (auth flows, email providers, Google OAuth)
- **Dev B**: US2 (tenant entity, hooks, read endpoints)

Luego secuencial: US3 → US4 → US5 (cada uno depende del anterior en diferente medida).

---

## Notes

- [P] = archivos distintos, sin dependencias entre sí — paralelizables
- Cada user story es independientemente implementable y testeable
- `better-auth.setup.ts` se construye incrementalmente: base en T008, emails en T012–T013, Google en T014, rate limit en T015, hooks de tenant en T022–T024, hooks de membresía en T033–T034, wire notificador en T047
- El Prisma scoped client (T035) se aplica únicamente en queries que requieren tenant isolation (listarMiembros, listarInvitaciones) — `obtener` y `listarPorUsuario` usan el cliente estándar
- `"owner"` (rol de BA) y `"PROPIETARIO"` (rol de dominio) son equivalentes — `requireRol` debe aceptar ambos
- `Propietario.nombres`, `Propietario.telefono` y campos requeridos se inicializan con `""` en `onOrganizationCreated`; un wizard de onboarding post-creación los completará (fuera de este feature)
- El campo `ultimoPasoCreacion` en `Propietario` controla el estado del wizard
