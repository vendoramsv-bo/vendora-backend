# Tasks: Cimiento de AutenticaciÃ³n y Multi-tenancy

**Feature**: `001-auth-multitenancy`
**Input**: Design documents from `specs/001-auth-multitenancy/`
**Prerequisites**: plan.md âœ… Â· spec.md âœ… Â· research.md âœ… Â· data-model.md âœ… Â· contracts/ âœ…

**Tests**: No incluidos (no solicitados en la especificaciÃ³n). Ver Phase 8 para helpers de test opcionales.

**Organization**: Tasks agrupadas por user story para implementaciÃ³n e iteraciÃ³n independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Se puede ejecutar en paralelo (archivos distintos, sin dependencias entre sÃ­)
- **[Story]**: A quÃ© user story pertenece esta task (US1â€“US5)
- Incluye rutas exactas de archivos en todas las descripciones

---

## Phase 1: Setup (Estructura inicial)

**Purpose**: Crear la estructura de directorios y verificar dependencias antes de escribir cÃ³digo.

- [X] T001 Crear estructura de directorios del proyecto: `src/core/`, `src/modules/autenticacion/{domain,infrastructure,adapters}/`, `src/modules/tenant/{domain/ports,application,infrastructure,adapters}/`, `src/server/`, `tests/{unit/modules/tenant/domain,integration/modules/tenant/infrastructure,helpers}/`
- [X] T002 [P] Verificar que las dependencias requeridas estÃ¡n en `package.json`: `better-auth`, `hono`, `@hono/zod-openapi`, `socket.io`, `ioredis`, `zod`, `pino`, `pino-http`, `@prisma/client`; instalar faltantes con `pnpm install`
- [X] T003 [P] Crear archivo `.env` en la raÃ­z del proyecto con las variables de `specs/001-auth-multitenancy/quickstart.md`: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `APP_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `REDIS_URL`, `RESEND_API_KEY`

---

## Phase 2: Foundational (Bloqueante para todas las user stories)

**Purpose**: Infraestructura core que DEBE estar completa antes de implementar cualquier user story.

**âš ï¸ CRÃTICO**: Ninguna user story puede comenzar hasta que esta fase estÃ© completa.

- [X] T004 Generar cliente Prisma ejecutando `pnpm prisma generate` (output: `src/generated/prisma/`) â€” verifica que genera desde `prisma/schema.prisma` con multiSchema habilitado
- [X] T005 [P] Implementar `src/core/query-params.ts`: funciÃ³n `makeQueryParamsSchema(allowedOrderByFields)` retorna Zod schema con `take/skip/orderBy/order/search/filterField/filterOp/filterValue`; funciÃ³n `toPrismaArgs(params)` convierte al formato Prisma `{ take, skip, orderBy, where }`; funciÃ³n `paginate<T>(data, total, params)` retorna `{ data, meta: { take, total, hasMore, nextCursor } }`
- [X] T006 [P] Crear `src/server/hono.ts`: instancia Hono con OpenAPIHono de `@hono/zod-openapi`, middleware Pino para logging HTTP, handler de errores JSON estÃ¡ndar con status codes (400/401/403/404/429/500), ruta `GET /api/openapi.json` para spec OpenAPI
- [X] T007 Crear `src/server/index.ts`: entry point del Web Service â€” crea servidor HTTP Node.js con la app Hono, escucha en `process.env.PORT ?? 3000`, exporta `httpServer` para que Socket.IO lo use en US5
- [X] T008 Implementar `src/modules/autenticacion/infrastructure/better-auth.setup.ts`: instancia Better-Auth con `emailAndPassword({ requireEmailVerification: true, minPasswordLength: 8 })`, plugin `organization` con `additionalFields` mapeados a `Tenant`/`TenantMember`/`Invitacion`, plugin `admin` con roles `user`/`admin`, `session.expiresIn: 604800` (7 dÃ­as) â€” los proveedores email y hooks de dominio se aÃ±aden en fases US1/US2
- [X] T009 [P] Implementar `src/modules/autenticacion/adapters/auth.rest.ts`: handler Hono que delega todos los requests en `/api/auth/**` al handler de BA (`auth.handler(req)`), convirtiendo Request/Response de Web API a Hono context. _Este handler cubre **implÃ­citamente** los siguientes FR vÃ­a endpoints nativos de BA listados en `contracts/auth-rest.md`: FR-008 (sign-out), FR-013 (update tenant), FR-021 (cambiar tenant activo / set-active), FR-028 (delete tenant). No requieren cÃ³digo custom adicional._
- [X] T010 [M3] Implementar `src/core/hono-context.ts`: middleware `requireAuth` que llama a `auth.api.getSession()` con el request actual, establece `c.var.session` y `c.var.usuario`, retorna 401 si no hay sesiÃ³n vÃ¡lida â€” exportar tipos `Variables` para Hono `Context<{ Variables }>`. Incluir al inicio del archivo un comentario que documente la **equivalencia canÃ³nica de roles**: `// CANÃ“NICO: el rol "owner" que asigna Better-Auth al creador de una organizaciÃ³n es equivalente a "PROPIETARIO" en el dominio. Toda comparaciÃ³n de rol debe tratarlos como sinÃ³nimos. La extensiÃ³n Prisma (core/prisma-scoped.ts) normaliza "owner" â†’ "PROPIETARIO" al leer; los guards aceptan ambos como defensa adicional.` Exportar una constante `ROL_PROPIETARIO = "PROPIETARIO"` y un helper `esPropietario(rol: string): boolean` que retorne `rol === "owner" || rol === "PROPIETARIO"`.
- [X] T010a [M1] [M3] Implementar `src/core/prisma-scoped.ts`: funciÃ³n `crearPrismaScoped(tenantId: string, userId: string)` que retorna `prisma.$extends({ query: { $allModels: { create: inyecta `tenantId`, `createdById`, `updatedById` automÃ¡ticamente; findMany/findFirst/findUnique: agrega `where: { tenantId }` automÃ¡ticamente; update: inyecta `updatedById` } } })` â€” el cliente extendido es especÃ­fico por request. Incluir ademÃ¡s un `result` extension sobre el modelo `member` (TenantMember) que **normaliza el rol al leer**: si `role === "owner"` lo retorna como `"PROPIETARIO"` (equivalencia canÃ³nica documentada en `hono-context.ts`, ver T010/M3). Exportar el tipo `ScopedPrismaClient = ReturnType<typeof crearPrismaScoped>` para tipar los constructores de repositorios. _ArtÃ­culo III.3 es NO-NEGOCIABLE: este mÃ³dulo debe existir antes de construir cualquier repositorio._

**Checkpoint**: FundaciÃ³n lista. BA maneja todos los flujos de auth; el middleware protege rutas; `crearPrismaScoped` disponible para inyecciÃ³n desde Phase 4. Se puede iniciar US1 y US2 en paralelo.

---

## Phase 3: User Story 1 â€” Registro e Inicio de SesiÃ³n (Priority: P1) ðŸŽ¯ MVP

**Goal**: Un visitante puede registrarse con email/contraseÃ±a, verificar su email e iniciar sesiÃ³n. TambiÃ©n puede iniciar sesiÃ³n con Google. Los intentos fallidos tienen espera creciente.

**Independent Test**: Ejecutar los pasos 1â€“3 de `specs/001-auth-multitenancy/quickstart.md` (sign-up â†’ verify-email â†’ sign-in) sin ningÃºn tenant existente. Verificar 200 en sign-in con sesiÃ³n activa.

- [X] T011 [P] [US1] Crear `src/modules/autenticacion/domain/autenticacion.errors.ts` con clases de error de dominio: `EmailNoVerificado`, `CredencialesInvalidas`, `EmailYaRegistrado`, `TokenInvalido`, `CuentaEliminada` â€” cada una extiende `Error` con `code` string para discriminar en handlers
- [X] T012 [US1] Agregar envÃ­o de email de verificaciÃ³n en `src/modules/autenticacion/infrastructure/better-auth.setup.ts`: implementar `emailVerification.sendVerificationEmail({ user, url })` usando Resend API (`RESEND_API_KEY`) para enviar correo HTML con el enlace de verificaciÃ³n a `user.email`
- [X] T013 [US1] Agregar envÃ­o de email de restablecimiento de contraseÃ±a en `src/modules/autenticacion/infrastructure/better-auth.setup.ts`: implementar `emailAndPassword.sendResetPassword({ user, url })` usando Resend API para enviar correo HTML con enlace de reset a `user.email`
- [X] T014 [US1] Configurar proveedor Google OAuth en `src/modules/autenticacion/infrastructure/better-auth.setup.ts`: `socialProviders.google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })` â€” BA crea cuenta automÃ¡ticamente en el primer login
- [X] T015 [US1] [I2] Configurar `rateLimit` en BA en `src/modules/autenticacion/infrastructure/better-auth.setup.ts`: `rateLimit({ window: 60, max: 5, storage: "memory" })` sobre los endpoints de sign-in â€” al superar los intentos, BA responde `429 Too Many Requests` con header `Retry-After`. El cliente que consume la API es responsable de aplicar el backoff creciente respetando ese header (ver FR-030; no se especifica una progresiÃ³n fija servidor-side)
- [X] T016 [US1] Registrar router `/api/auth/**` en `src/server/hono.ts`: importar y montar `auth.rest.ts` â€” verificar que BA responde en `GET /api/auth/get-session`
- [X] T016a [US1] [C1] [U1] Implementar endpoint custom `DELETE /api/user` en `src/modules/autenticacion/adapters/auth.rest.ts` cubriendo FR-031: (1) aplicar `requireAuth`; (2) consultar via Prisma los `TenantMember` donde `userId = session.userId` y `role IN ['owner', 'PROPIETARIO']`; (3) para cada tenant, contar otros miembros con rol owner â€” si el usuario es el **Ãºnico** â†’ llamar `auth.api.deleteOrganization({ body: { organizationId }, headers })` server-side (el usuario es owner, por lo tanto autorizado; cascade de TenantMember/Invitacion/Propietario via `onDelete: Cascade` hacia Tenant); (4) eliminar la cuenta en una transacciÃ³n Prisma `$transaction`: borrar en orden de FK todas las filas que referencian al usuario (`Invitacion`, `Propietario`, `TenantMember`, `Session`, `Account`) y finalmente la fila `User`; (5) retornar 204. Documentar el contrato en `specs/001-auth-multitenancy/contracts/auth-rest.md`. _**No usar `auth.api.removeUser`**: pertenece al admin plugin y exige rol admin del llamador â€” un usuario eliminando su propia cuenta no es admin. El borrado directo vÃ­a Prisma en transacciÃ³n es determinista y no depende de un cascade hacia `User`. El cascade condicional de tenants es lÃ³gica de dominio custom que BA no implementa._

**Checkpoint**: US1 completo. Flujo register â†’ verify-email â†’ login â†’ logout â†’ delete-account funciona vÃ­a `/api/auth/*`. Google OAuth disponible. Rate limiting activo en sign-in.

---

## Phase 4: User Story 2 â€” CreaciÃ³n y ConfiguraciÃ³n de Tenant (Priority: P1)

**Goal**: Un usuario autenticado crea un tenant; queda registrado automÃ¡ticamente como propietario (fila `Propietario` creada); puede leer los datos del tenant y listar sus tenants.

**Independent Test**: Crear tenant vÃ­a `POST /api/auth/organization/create`, verificar fila en tabla `propietario`, llamar `GET /api/tenant/actual` y recibir datos del tenant.

- [X] T017 [P] [US2] Crear `src/modules/tenant/domain/tenant.entity.ts`: clase `TenantEntity` con factory `fromPrisma(raw)`, getters de capability flags (`esTienda`, `esConsultorio`, `esRestaurante`), mÃ©todo `toJSON()` que retorna el shape del contrato `tenant-rest.md`
- [X] T018 [P] [US2] Crear `src/modules/tenant/domain/tenant.errors.ts`: clases `TenantNoEncontrado(id)`, `SlugDuplicado(slug)`, `SinTenantActivo`, `PermisoDenegado(rol, rolRequerido)`, `PropietarioUnico` â€” cada una con `code` string
- [X] T019 [P] [US2] Crear `src/modules/tenant/domain/ports/ITenantRepository.ts`: interfaz con mÃ©todos `obtener(id: string): Promise<TenantEntity>`, `listarPorUsuario(userId: string, params): Promise<{ data, total }>`, `listarMiembros(tenantId: string, params): Promise<{ data, total }>`, `listarInvitaciones(tenantId: string, params): Promise<{ data, total }>`
- [X] T020 [P] [US2] Crear `src/modules/tenant/domain/ports/ITenantNotificador.ts`: interfaz con mÃ©todos `tenantActualizado(tenantId: string, datos: Partial<TenantEntity>): void`, `tenantEliminado(tenantId: string): void`, `miembroUnido(tenantId: string, userId: string): void`, `miembroRemovido(tenantId: string, userId: string): void`
- [X] T020a [US2] [H1] Crear `src/modules/tenant/infrastructure/null-tenant.notificador.ts`: clase `NullTenantNotificador` que implementa el puerto `ITenantNotificador` (T020) con mÃ©todos no-op (cuerpos vacÃ­os sin efectos). Es el notificador por defecto que se inyecta en los hooks de BA durante US2â€“US4; US5 lo reemplaza por `TenantSocketNotificador` (T044/T047). _Debe completarse antes de T022 â€” los hooks `onOrganizationCreated/Updated/Deleted` lo invocan y sin esta clase el cÃ³digo no compila. Depende de T017 (`TenantEntity`) y T020 (`ITenantNotificador`), ambos en esta misma fase._
- [X] T021 [US2] Implementar `src/modules/tenant/infrastructure/tenant.prisma.repository.ts`: el constructor acepta `db: PrismaClient | ScopedPrismaClient` (tipo exportado por `core/prisma-scoped.ts`, T010a) â€” en US2 se instancia con el cliente estÃ¡ndar `prisma` para `obtener` y `listarPorUsuario`; en US4 (T038) se instanciarÃ¡ con `crearPrismaScoped(tenantId, userId)` para `listarMiembros` y `listarInvitaciones`. MÃ©todos: `obtener(id)` busca por ID lanzando `TenantNoEncontrado` si no existe; `listarPorUsuario(userId, params)` hace join con `TenantMember` filtrando por `userId`; `listarMiembros(tenantId, params)` y `listarInvitaciones(tenantId, params)` filtran por `organizationId` explÃ­cito â€” aplicar `toPrismaArgs` de `core/query-params.ts`. _La inyecciÃ³n del cliente desde el constructor garantiza ArtÃ­culo III.3 desde el inicio; no hay "modo sin scope"._
- [X] T022 [US2] Agregar hook `onOrganizationCreated` en `src/modules/autenticacion/infrastructure/better-auth.setup.ts`: recibe `{ organization, member }`, crea fila en `Propietario` vÃ­a Prisma con `tenantId: organization.id`, `userId: member.userId`, campos requeridos con valores placeholder (`nombres: ""`, `telefono: ""`), llama `notificador.miembroUnido(organization.id, member.userId)`
- [X] T023 [US2] Agregar hook `onOrganizationUpdated` en `src/modules/autenticacion/infrastructure/better-auth.setup.ts`: recibe `{ organization }`, llama `notificador.tenantActualizado(organization.id, organization)`
- [X] T024 [US2] Agregar hook `onOrganizationDeleted` en `src/modules/autenticacion/infrastructure/better-auth.setup.ts`: recibe `{ organizationId }`, llama `notificador.tenantEliminado(organizationId)`
- [X] T025 [P] [US2] Crear `src/modules/tenant/application/obtener-tenant.usecase.ts`: `ObtenerTenantUseCase` recibe `ITenantRepository`, mÃ©todo `ejecutar(tenantId: string)` delega a `repo.obtener(tenantId)` â€” no lanza errores propios, propaga los del repo
- [X] T026 [P] [US2] Crear `src/modules/tenant/application/listar-tenants-usuario.usecase.ts`: `ListarTenantsUsuarioUseCase` recibe `ITenantRepository`, mÃ©todo `ejecutar(userId: string, params)` delega a `repo.listarPorUsuario(userId, params)`
- [X] T027 [US2] [L3] Crear `src/modules/tenant/adapters/tenant.schema.ts`: Zod schemas para contratos de `specs/001-auth-multitenancy/contracts/tenant-rest.md` â€” `TenantActualResponseSchema` (con `propietario` anidado), `ListaTenantItemSchema` (con `miRol`), `PaginadoMetaSchema`, `QueryParamsTenantSchema` usando `makeQueryParamsSchema(["name", "createdAt"])`. Definir y exportar `SlugSchema = z.string().regex(/^[a-z0-9-]+$/, "El slug solo admite minÃºsculas, dÃ­gitos y guiones")` como schema reutilizable para validar el slug del tenant (FR-011), referenciable desde la validaciÃ³n de entrada de creaciÃ³n/actualizaciÃ³n de tenant.
- [X] T028 [US2] Crear `src/modules/tenant/adapters/tenant.rest.ts`: router Hono+zod-openapi con `GET /api/tenant/actual` (llama `ObtenerTenantUseCase` con `session.activeOrganizationId`) y `GET /api/tenant` (llama `ListarTenantsUsuarioUseCase` con `session.userId`); aplicar `requireAuth` de `hono-context.ts`; instanciar use cases con `TenantPrismaRepository`
- [X] T029 [US2] Registrar router `/api/tenant/**` en `src/server/hono.ts`: importar y montar `tenant.rest.ts` â€” verificar que `GET /api/tenant/actual` retorna 400 si no hay tenant activo
- [X] T029a [US2] [M7] Verificar que `PATCH /api/auth/organization/update` acepta y persiste los capability flags (FR-012): confirmar en `src/modules/autenticacion/infrastructure/better-auth.setup.ts` que `esTienda`, `esConsultorio`, `esRestaurante` estÃ¡n declarados en `organization.schema.organization.additionalFields` con `input: true`; validar con curl que un `PATCH` con `{ "esTienda": true }` persiste el cambio y se refleja en `GET /api/tenant/actual`. _Sin `input: true` en additionalFields, BA ignora silenciosamente estos campos en el update._

**Checkpoint**: US2 completo. Crear tenant â†’ fila `Propietario` creada â†’ `GET /api/tenant/actual` retorna datos. Capability flags persistibles vÃ­a BA update. Hooks de dominio (update/delete) invocados. `GET /api/tenant` lista los tenants del usuario con paginaciÃ³n.

---

## Phase 5: User Story 3 â€” InvitaciÃ³n y MembresÃ­a (Priority: P2)

**Goal**: Propietario/admin invita usuarios por email; el invitado acepta y se convierte en miembro. El endpoint `GET /api/tenant/invitaciones` lista invitaciones. Eventos de membresÃ­a emitidos vÃ­a Socket.IO.

**Independent Test**: Con un tenant creado, invitar un email vÃ­a `POST /api/auth/organization/invite-member`, aceptar el link, verificar con `GET /api/tenant/invitaciones` que el status cambia a `accepted`.

- [X] T030 [P] [US3] [M4] Crear `src/modules/tenant/application/listar-invitaciones.usecase.ts`: `ListarInvitacionesUseCase` recibe `ITenantRepository`, mÃ©todo `ejecutar(tenantId: string, params)` delega a `repo.listarInvitaciones(tenantId, params)`. _Nombre sin sufijo "pendientes": el endpoint filtra por todos los estados (pending/accepted/rejected/canceled), no solo pendientes._
- [X] T031 [US3] Agregar schemas de invitaciÃ³n en `src/modules/tenant/adapters/tenant.schema.ts`: `InvitacionResponseSchema` con campos `id`, `email`, `role`, `status`, `expiresAt`, `invitador: { name, email }`; `QueryParamsInvitacionSchema` con `makeQueryParamsSchema(["status", "createdAt"])` + `filterField/filterValue` para filtrar por status
- [X] T032 [US3] [M4] Agregar `GET /api/tenant/invitaciones` en `src/modules/tenant/adapters/tenant.rest.ts`: requiere `requireAuth` + guard `requireRol(["PROPIETARIO", "owner", "ADMIN"])`; llama `ListarInvitacionesUseCase` con `tenantId` del query param o de `session.activeOrganizationId`; retorna shape paginado del contrato
- [X] T033 [US3] Agregar hook `onMemberCreated` en `src/modules/autenticacion/infrastructure/better-auth.setup.ts`: recibe `{ member }`, llama `notificador.miembroUnido(member.organizationId, member.userId)` â€” se dispara cuando un invitado acepta la invitaciÃ³n
- [X] T034 [US3] Agregar hook `onMemberDeleted` en `src/modules/autenticacion/infrastructure/better-auth.setup.ts`: recibe `{ member }`, llama `notificador.miembroRemovido(member.organizationId, member.userId)` â€” se dispara cuando un miembro es eliminado o sale voluntariamente
- [X] T034a [US3] [H2] Implementar guards de sole-owner vÃ­a hooks BA Organization en `src/modules/autenticacion/infrastructure/better-auth.setup.ts` cubriendo FR-026/FR-027: (a) `beforeRemoveMember({ member, organization })` â€” contar miembros con rol owner/PROPIETARIO en la org; si el miembro a remover es el Ãºnico, lanzar `new APIError("BAD_REQUEST", { message: "No puedes eliminar al Ãºnico propietario" })` â€” aplica tanto a `removeMember` como a `leave` si BA lo enruta por aquÃ­; (b) verificar durante implementaciÃ³n si `organization.leave` dispara `beforeRemoveMember`: si NO lo dispara, agregar un middleware Hono **previo** al handler de BA en `POST /api/auth/organization/leave` que realice la misma verificaciÃ³n y retorne 400 antes de llegar a BA. _BA no aplica ninguno de estos guards nativamente â€” confirmado en docs._

**Checkpoint**: US3 completo. Invite â†’ email (BA) â†’ aceptar â†’ miembro listado. Guards de sole-owner activos: el Ãºnico propietario no puede ser removido ni salir. Eventos `miembro:unido` y `miembro:removido` disparados en cada cambio de membresÃ­a.

---

## Phase 6: User Story 4 â€” Tenant Activo y Aislamiento (Priority: P2)

**Goal**: Prisma scoped client garantiza aislamiento de datos por tenant. Guards de hono-context bloquean acceso sin tenant activo. `GET /api/tenant/miembros` lista miembros del tenant activo con bÃºsqueda y filtros.

**Independent Test**: Con dos tenants y un usuario miembro de ambos, cambiar tenant activo vÃ­a BA (`PUT /api/auth/organization/set-active`) y verificar que `GET /api/tenant/miembros` retorna los miembros del tenant activo Ãºnicamente.

- [X] T036 [US4] Agregar guard `requireTenantActivo` en `src/core/hono-context.ts`: lee `c.var.session.activeOrganizationId`, retorna 400 con cÃ³digo `SIN_TENANT_ACTIVO` si es null/undefined, establece `c.var.tenantId` para uso downstream
- [X] T036a [US4] [M5] Agregar hook `databaseHooks.session.create.before` en `src/modules/autenticacion/infrastructure/better-auth.setup.ts`: al crear una sesiÃ³n, consultar el `TenantMember` mÃ¡s reciente del usuario (`where userId, orderBy createdAt desc`) y poblar `session.activeOrganizationId` con su `organizationId`; si el usuario no pertenece a ningÃºn tenant, dejar `null`. _BA inicializa `activeOrganizationId` en `null` en cada sesiÃ³n nueva â€” no persiste el tenant activo entre sesiones (confirmado en docs). Sin este hook, US4 Scenario 3 (restaurar el tenant activo al reabrir sesiÃ³n) no funciona._
- [X] T037 [US4] Agregar factory `requireRol(roles: string[])` en `src/core/hono-context.ts`: middleware que busca `TenantMember` por `{ organizationId: c.var.tenantId, userId: c.var.session.userId }`, retorna 403 si el rol no estÃ¡ en la lista permitida (acepta `"owner"` y `"PROPIETARIO"` como equivalentes)
- [X] T038 [US4] Instanciar `TenantPrismaRepository` con cliente scoped en los handlers que lo requieren (`src/modules/tenant/adapters/tenant.rest.ts`): para `GET /api/tenant/miembros` y `GET /api/tenant/invitaciones`, construir `crearPrismaScoped(c.var.tenantId, c.var.session.userId)` y pasarlo al constructor del repositorio en cada request â€” `listarMiembros` y `listarInvitaciones` quedan automÃ¡ticamente aislados por tenant. Para `GET /api/tenant/actual` y `GET /api/tenant`, continuar usando el cliente estÃ¡ndar (no requieren scope de tenant). _T010a ya existe desde Phase 2; esta task solo conecta el cliente correcto en cada ruta._
- [X] T039 [P] [US4] Crear `src/modules/tenant/application/listar-miembros.usecase.ts`: `ListarMiembrosUseCase` recibe `ITenantRepository`, mÃ©todo `ejecutar(tenantId: string, params)` delega a `repo.listarMiembros(tenantId, params)` incluyendo JOIN con `User` para campos `name`, `email`, `image`
- [X] T040 [US4] Agregar schemas de miembro en `src/modules/tenant/adapters/tenant.schema.ts`: `MiembroResponseSchema` con campos `id`, `userId`, `role`, `estado`, `createdAt`, `usuario: { name, email, image }`; `QueryParamsMiembrosSchema` con `makeQueryParamsSchema(["createdAt", "role"])` + `search` y `filterField/filterOp/filterValue`
- [X] T041 [US4] Agregar `GET /api/tenant/miembros` en `src/modules/tenant/adapters/tenant.rest.ts`: aplica `requireAuth` + `requireTenantActivo`; llama `ListarMiembrosUseCase` con `tenantId` de `c.var.tenantId`; pasa prismaScoped construido con `crearPrismaScoped(tenantId, userId)` al repositorio
- [X] T042 [US4] Aplicar `requireTenantActivo` a `GET /api/tenant/actual` en `src/modules/tenant/adapters/tenant.rest.ts`: el endpoint ya usa `session.activeOrganizationId`, agregar el guard formalmente para retornar 400 estructurado en lugar de error genÃ©rico

**Checkpoint**: US4 completo. Aislamiento verificado: cambiar tenant activo cambia los datos visibles. NingÃºn usuario puede acceder a datos de tenants ajenos. `GET /api/tenant/miembros` soporta bÃºsqueda por nombre/email y paginaciÃ³n.

---

## Phase 7: User Story 5 â€” Actualizaciones en Tiempo Real (Priority: P3)

**Goal**: Usuarios conectados al mismo tenant reciben eventos Socket.IO cuando el tenant es modificado o cuando cambia la membresÃ­a.

**Independent Test**: Abrir dos conexiones WebSocket al mismo sala `tenant:${tenantId}`, actualizar el tenant vÃ­a BA, verificar que el segundo cliente recibe `tenant:actualizado` en menos de 2 segundos.

- [X] T043 [P] [US5] Configurar servidor Socket.IO en `src/server/index.ts`: crear `Server` de `socket.io` adjunto al `httpServer`, configurar Redis adapter con `ioredis` (`REDIS_URL`) para soporte horizontal â€” exportar `io` para uso en el notificador
- [X] T044 [US5] Implementar `src/modules/tenant/infrastructure/tenant.socket.notificador.ts`: clase `TenantSocketNotificador` implementando `ITenantNotificador` â€” recibe `io: Server` en constructor; cada mÃ©todo emite al room `tenant:${tenantId}` el evento correspondiente: `tenant:actualizado`, `tenant:eliminado`, `tenant:miembro:unido`, `tenant:miembro:removido` con payload segÃºn `specs/001-auth-multitenancy/contracts/socket-events.md`
- [X] T045 [US5] Agregar middleware de autenticaciÃ³n Socket.IO en `src/server/index.ts`: en `io.use()`, leer `socket.handshake.auth.token`, validar sesiÃ³n BA con `auth.api.getSession()`, rechazar con `Error("unauthorized")` si invÃ¡lida, establecer `socket.data.session` para uso en handlers
- [X] T046 [US5] Agregar handler de conexiÃ³n y salas en `src/server/index.ts`: en `io.on("connection", socket => ...)`, consultar `TenantMember` por `userId` del socket, hacer `socket.join(`tenant:${tm.organizationId}`)` para cada tenant del usuario â€” el socket queda suscrito a todas las salas de sus tenants
- [X] T047 [US5] Conectar `TenantSocketNotificador` en `src/modules/autenticacion/infrastructure/better-auth.setup.ts`: reemplazar la instancia `NullTenantNotificador` (stub creado en T020a) con la instancia real de `TenantSocketNotificador` en hooks `onOrganizationCreated/Updated/Deleted` y `onMemberCreated/Deleted` â€” pasar la instancia `io` exportada desde `src/server/index.ts`
- [X] T048 [US5] Conectar `TenantSocketNotificador` en `src/modules/tenant/adapters/tenant.rest.ts`: pasar instancia a los use cases que lo necesiten vÃ­a inyecciÃ³n en el factory de routes en `src/server/hono.ts`

**Checkpoint**: US5 completo. Flujo end-to-end: acciÃ³n BA â†’ hook `onOrganizationUpdated` â†’ `ITenantNotificador.tenantActualizado()` â†’ `io.to("tenant:id").emit("tenant:actualizado")` â†’ cliente WS recibe el evento.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Mejoras transversales que benefician todas las user stories.

- [X] T049 [P] Registrar todos los schemas Zod en el registry OpenAPI de `@hono/zod-openapi` en `src/server/hono.ts`: verificar que `GET /api/openapi.json` retorna spec vÃ¡lida con todos los endpoints de `/api/tenant/**`
- [X] T050 [P] Agregar logging estructurado Pino en adaptadores y use cases: loguear `[autenticacion] hook:onOrganizationCreated tenantId=X`, `[tenant] usecase:obtenerTenant tenantId=X`, `[socket] emit:tenant:actualizado tenantId=X room=tenant:X`
- [X] T051 Crear `tests/helpers/fake-tenant.repository.ts`: implementaciÃ³n en memoria de `ITenantRepository` para tests unitarios de use cases â€” `Map<string, TenantEntity>` con mÃ©todos que resuelven localmente sin Prisma
- [X] T052 [P] Crear `tests/helpers/fake-tenant.notificador.ts`: spy de `ITenantNotificador` que registra llamadas en arrays `eventos: { tipo, tenantId, payload }[]` para assertions en tests
- [X] T053 Ejecutar validaciÃ³n de `specs/001-auth-multitenancy/quickstart.md`: correr los 5 comandos curl del quickstart y verificar respuestas esperadas (201 sign-up, 200 sign-in, 201 org/create, 200 tenant/actual)
- [X] T054 [P] [M8] Crear benchmark de latencia HTTP en `tests/perf/auth-latency.ts` usando `autocannon` (o `k6`): ejecutar N requests contra `POST /api/auth/sign-in/email` y `POST /api/auth/organization/create`, reportar p95. Verificar **SC-002** (sign-in < 3 s) y **SC-003** (creaciÃ³n de tenant < 3 s).
- [X] T055 [P] [M8] Crear benchmark de latencia Socket.IO en `tests/perf/socket-latency.ts`: cliente de prueba que se une a la sala `tenant:${id}`, dispara un `PATCH /api/auth/organization/update` y mide el tiempo hasta recibir el evento `tenant:actualizado`. Verificar **SC-006** (eventos en tiempo real < 2 s p95).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias â€” puede comenzar de inmediato
- **Foundational (Phase 2)**: Depende de Phase 1 â€” BLOQUEA todas las user stories
- **US1 (Phase 3)** y **US2 (Phase 4)**: Dependen de Phase 2 â€” pueden ejecutarse en paralelo entre sÃ­
- **US3 (Phase 5)**: Depende de US2 (necesita tenant + hooks de membresÃ­a)
- **US4 (Phase 6)**: Depende de US2 (necesita repositorio base); puede solaparse con US3
- **US5 (Phase 7)**: Depende de US2 (hooks) + US4 (notificador) para el wiring completo; la infraestructura Socket.IO (T043â€“T046) puede hacerse antes
- **Polish (Phase 8)**: Depende de que las user stories deseadas estÃ©n completas

### User Story Dependencies

- **US1 (P1)**: Inicia tras Phase 2. Sin dependencias de otras US.
- **US2 (P1)**: Inicia tras Phase 2. Sin dependencias de otras US. Puede correr en paralelo con US1.
- **US3 (P2)**: Inicia tras US2 (necesita tenant creado y hooks de membresÃ­a).
- **US4 (P2)**: Inicia tras US2 (extiende el repositorio). Puede correr en paralelo con US3.
- **US5 (P3)**: Inicia tras US2 (hooks) y puede solaparse con US4. T043â€“T046 (infra Socket.IO) son independientes.

### Within Each User Story

- Puertos/entidades de dominio antes que infraestructura
- Repositorio antes que use cases
- Use cases antes que adaptadores REST
- Adaptadores REST antes de registrar en `hono.ts`

### Parallel Opportunities

- T002, T003, T005, T006, T009, T010a â€” Setup y fundacional: archivos distintos, sin dependencias entre sÃ­
- T017, T018, T019, T020 â€” Dominio de tenant: cuatro archivos distintos, todos paralelos
- T025, T026 â€” Use cases de lectura de tenant: independientes entre sÃ­
- T030, T039 â€” Use cases de invitaciones y miembros: independientes entre sÃ­
- T043, T051, T052 â€” Socket.IO infra y test helpers: paralelos entre sÃ­
- T054, T055 â€” Benchmarks de latencia HTTP y Socket.IO: archivos distintos, paralelos entre sÃ­
- Una vez completada la Phase 2, **US1 y US2 pueden ejecutarse en paralelo** por desarrolladores distintos

---

## Parallel Example: Phase 4 (US2)

```bash
# Lanzar en paralelo â€” archivos distintos, sin dependencias entre sÃ­:
Task: "T017 â€” src/modules/tenant/domain/tenant.entity.ts"
Task: "T018 â€” src/modules/tenant/domain/tenant.errors.ts"
Task: "T019 â€” src/modules/tenant/domain/ports/ITenantRepository.ts"
Task: "T020 â€” src/modules/tenant/domain/ports/ITenantNotificador.ts"

# Luego, en paralelo una vez que T019/T020 estÃ¡n completos:
Task: "T025 â€” src/modules/tenant/application/obtener-tenant.usecase.ts"
Task: "T026 â€” src/modules/tenant/application/listar-tenants-usuario.usecase.ts"
```

---

## Implementation Strategy

### MVP (US1 + US2 solamente)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (**CRÃTICO** â€” bloquea todo)
3. Completar Phase 3: US1 â€” register/login/email/Google
4. Completar Phase 4: US2 â€” tenant creation/read
5. **VALIDAR**: Ejecutar quickstart.md pasos 1â€“5
6. Deploy/demo: el sistema es funcional para un solo usuario y un tenant

### Entrega Incremental

1. Setup + Foundational â†’ servidor en pie con BA montado
2. US1 â†’ Auth completo con email y Google â†’ **Demo**
3. US2 â†’ Tenants funcionales â†’ **Demo** (MVP real)
4. US3 â†’ Invitaciones y membresÃ­a â†’ **Demo**
5. US4 â†’ Aislamiento de tenant + member listing â†’ **Demo**
6. US5 â†’ Tiempo real â†’ **Demo** (funcionalidad completa)
7. Polish â†’ Logging, OpenAPI, test helpers

### Estrategia con Dos Desarrolladores

Con Phase 2 completada:
- **Dev A**: US1 (auth flows, email providers, Google OAuth)
- **Dev B**: US2 (tenant entity, hooks, read endpoints)

Luego secuencial: US3 â†’ US4 â†’ US5 (cada uno depende del anterior en diferente medida).

---

## Notes

- [P] = archivos distintos, sin dependencias entre sÃ­ â€” paralelizables
- Cada user story es independientemente implementable y testeable
- `better-auth.setup.ts` se construye incrementalmente: base en T008, emails en T012â€“T013, Google en T014, rate limit en T015, hooks de tenant en T022â€“T024, hooks de membresÃ­a en T033â€“T034, wire notificador en T047
- El Prisma scoped client (T010a) se aplica Ãºnicamente en queries que requieren tenant isolation (listarMiembros, listarInvitaciones) â€” `obtener` y `listarPorUsuario` usan el cliente estÃ¡ndar
- `"owner"` (rol de BA) y `"PROPIETARIO"` (rol de dominio) son equivalentes â€” `requireRol` debe aceptar ambos
- `Propietario.nombres`, `Propietario.telefono` y campos requeridos se inicializan con `""` en `onOrganizationCreated`; un wizard de onboarding post-creaciÃ³n los completarÃ¡ (fuera de este feature)
- El campo `ultimoPasoCreacion` en `Propietario` controla el estado del wizard

