# Implementation Plan: Cimiento de Autenticación y Multi-tenancy

**Branch**: `001-auth-multitenancy` | **Date**: 2026-05-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-auth-multitenancy/spec.md`

---

## Summary

Construir el cimiento de autenticación (Better-Auth con email/contraseña + Google OAuth)
y multi-tenancy (plugin Organization de BA mapeado a Tenant/TenantMember/Invitacion).
El modelo de datos ya está definido en `prisma/00-autenticacion.prisma` y
`prisma/10-tenant.prisma`. El código propio añade:
1. Hooks de dominio sobre BA (crear Propietario, emitir eventos Socket.IO).
2. Endpoints REST de lectura con Prisma scoped client (tenant isolation + auditoría).
3. Infraestructura core reutilizable (Prisma extension, middleware Hono, query-params).

---

## Technical Context

**Language/Version**: TypeScript strict / Node.js LTS ≥ 20
**Primary Dependencies**: Hono, `@hono/zod-openapi`, Better-Auth (organization + admin plugins), Prisma 7, Socket.IO, Redis, Zod, Pino
**Storage**: PostgreSQL con multiSchema (`autenticacion`, `tenant`) — schemas y modelos ya migrados
**Testing**: Vitest + Testcontainers (PostgreSQL real para repos), fakes en memoria para dominio
**Target Platform**: Render (Web Service + Background Worker) — serverful
**Project Type**: Backend monolito modular hexagonal (Web Service)
**Performance Goals**: Login < 3 s · Creación de tenant < 3 s · Eventos Socket.IO < 2 s p95
**Constraints**: Sesiones de 7 días · Sin serverless edge · Prisma scoped client obligatorio
**Scale/Scope**: Multi-tenant SaaS inicial — sin cuota de tenants/usuarios en este feature

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Artículo | Gate | Estado | Notas |
|----------|------|--------|-------|
| I — Stack tecnológico | Node.js ≥ 20, TypeScript strict, Hono + zod-openapi, Better-Auth, Prisma 7, Socket.IO, Zod | ✅ PASS | Auth.ts ya configura BA. Stack completo presente. |
| I — Deploy Render | Sin Cloudflare Workers / Vercel Functions | ✅ PASS | Web Service en Render. |
| II.1 — Monolito modular | Un solo repo, módulos autenticacion + tenant con fronteras estrictas | ✅ PASS | Dos módulos hexagonales. Núcleo no depende de verticales. |
| II.2 — Hexagonal | domain/ sin infra · application/ solo puertos · adapters delgados | ✅ PASS | Estructura definida. BA handle ≠ lógica de negocio. |
| II.3 — Agnóstico del transporte | Casos de uso ejecutables desde REST, jobs y tests | ✅ PASS | Los use cases de tenant son puros; BA hooks equivalen a casos de uso. |
| III — Multi-tenancy | tenantId desde session.activeOrganizationId · Prisma scoped · guards por capability | ✅ PASS | Prisma extension en core/prisma-scoped.ts. Guards en middleware Hono. |
| IV — Consultas parametrizables | take/skip/filter/orderBy/search en listarMiembros y listarInvitaciones | ✅ PASS | makeQueryParamsSchema aplicado a ambas queries. |
| V — Capa de datos | Modelos existentes usados tal cual · nombres en español · auditoría | ✅ PASS | Sin cambios de schema. createdById/updatedById en Tenant y Propietario. |
| VI — Tiempo real | Eventos desde casos de uso (hooks BA) vía puerto ITenantNotificador | ✅ PASS | 4 eventos: actualizado, eliminado, miembro:unido, miembro:removido. |
| VII — Auth | Better-Auth único · roles libres en TenantMember.role · mismo token HTTP+WS | ✅ PASS | Plugin Organization + Admin. Roles libres por vertical. |
| VIII — Testing | Dominio con fakes · repos con Testcontainers | ✅ PASS | Estructura de tests definida. |
| IX — Convenciones | Código de dominio en español · estructura hexagonal | ✅ PASS | Nombres de modelos, campos y módulos en español. |

**Resultado: TODAS LAS GATES PASAN. Sin violaciones constitucionales.**

---

## Project Structure

### Documentation (this feature)

```text
specs/001-auth-multitenancy/
├── plan.md              ← Este archivo
├── research.md          ← Decisiones de diseño y rationale
├── data-model.md        ← Modelos Prisma existentes documentados
├── quickstart.md        ← Guía de arranque para desarrolladores
├── contracts/
│   ├── auth-rest.md     ← Endpoints REST de Better-Auth
│   ├── tenant-rest.md   ← Endpoints REST del módulo tenant
│   └── socket-events.md ← Eventos Socket.IO del módulo tenant
└── tasks.md             ← Generado por /speckit-tasks (pendiente)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                   ← Entry point (generator + datasource)
├── 00-autenticacion.prisma         ← User, Session, Account, Verification, Invitacion
├── 10-tenant.prisma                ← Tenant, TenantMember, Propietario, ...
├── auth.ts                         ← Configuración de Better-Auth (ya existe)
└── prisma.config.ts                ← Prisma 7 config (ya existe)

src/
├── generated/prisma/               ← Cliente Prisma generado (no editar)
├── core/
│   ├── prisma-scoped.ts            ← Prisma extension: inject tenantId + audit
│   ├── hono-context.ts             ← Middleware base: sesión BA + tenant activo
│   └── query-params.ts             ← makeQueryParamsSchema, toPrismaArgs, paginate
├── modules/
│   ├── autenticacion/
│   │   ├── domain/
│   │   │   └── autenticacion.errors.ts
│   │   ├── infrastructure/
│   │   │   └── better-auth.setup.ts   ← instancia auth + hooks de dominio
│   │   └── adapters/
│   │       └── auth.rest.ts           ← Hono handler para /api/auth/**
│   └── tenant/
│       ├── domain/
│       │   ├── tenant.entity.ts
│       │   ├── tenant.errors.ts
│       │   └── ports/
│       │       ├── ITenantRepository.ts
│       │       └── ITenantNotificador.ts
│       ├── application/
│       │   ├── obtener-tenant.usecase.ts
│       │   ├── listar-tenants-usuario.usecase.ts
│       │   ├── listar-miembros.usecase.ts
│       │   └── listar-invitaciones-pendientes.usecase.ts
│       ├── infrastructure/
│       │   ├── tenant.prisma.repository.ts
│       │   └── tenant.socket.notificador.ts
│       └── adapters/
│           ├── tenant.rest.ts     ← rutas Hono + zod-openapi
│           └── tenant.schema.ts   ← Zod schemas de entrada/salida
└── server/
    ├── hono.ts                     ← App Hono con rutas montadas
    └── index.ts                    ← Entry point del Web Service

tests/
├── unit/
│   └── modules/tenant/domain/     ← Tests de entidades y errores (sin infra)
├── integration/
│   └── modules/tenant/infrastructure/ ← Tests de repos contra PG real
└── helpers/
    ├── fake-tenant.repository.ts
    └── fake-tenant.notificador.ts
```

**Structure Decision**: Backend monolito modular hexagonal, un solo repositorio con
dos módulos para este feature: `autenticacion` (thin adapter sobre BA) y `tenant`
(dominio de lectura + eventos). La infraestructura core es transversal a todos los módulos.

---

## Complexity Tracking

### Excepción constitucional registrada: Artículo VI.2 — Eventos desde hooks de BA

**Principio afectado:** Artículo VI.2 — "Los eventos se emiten DENTRO del caso de uso
(vía el puerto `Notificador`), NO en el adaptador."

**Desviación:** Los hooks `onOrganizationCreated`, `onOrganizationUpdated`,
`onOrganizationDeleted`, `onMemberCreated` y `onMemberDeleted` viven en
`src/modules/autenticacion/infrastructure/better-auth.setup.ts` — capa de
infraestructura, no en `application/`.

**Justificación:**
Better-Auth controla el ciclo de vida de las mutaciones de organización y membresía.
Sus hooks son el **único punto de extensión** que la librería expone para ejecutar
lógica de dominio después de que una mutación persiste en la base de datos. No existe
una capa de aplicación independiente para estos flujos porque BA no permite inyectar
casos de uso propios en el flujo de escritura — solo permite registrar hooks.

En este contexto, los hooks de BA son el **equivalente funcional de un caso de uso**:
se ejecutan exactamente cuando el dominio cambia de estado, reciben los datos del
cambio, y tienen acceso completo al puerto `ITenantNotificador` para emitir eventos.
La alternativa (crear use cases en `application/` y llamarlos desde los hooks)
añadiría una capa de indirección sin valor: el hook seguiría siendo el punto de
entrada real.

**Scope de la excepción:** Solo aplica al módulo `autenticacion` y únicamente para
los hooks de BA Organization/Member. En el módulo `tenant` (endpoints propios) los
eventos se emiten desde los use cases en `application/`, alineados con VI.2.

**Referencia:** Confirmado en `research.md` Decisión 5. Registrado también en
la Constitución v1.5.2 como excepción explícita de VI.2.

---

## Phase 0: Research — Decisiones clave

Ver [research.md](research.md) para el detalle completo. Resumen:

1. **Better-Auth gestiona el 80% de los flujos** — registro, login, sesiones, org CRUD,
   invitaciones. El código propio se limita a hooks de dominio y queries de lectura.
2. **Distribución clara**: BA → REST /api/auth · Dominio → REST /api/tenant
3. **Session 7 días** ya configurada en `auth.ts` (`session.expiresIn: 604800`).
4. **Rate limiting** via `rateLimit` de BA; devuelve 429 + `Retry-After`.
5. **Eventos Socket.IO** desde hooks BA equivalen a "dentro del caso de uso".
6. **Modelos Prisma sin cambios** — autoritativos tal como están.

---

## Phase 1: Design — Artefactos

### Data Model

Ver [data-model.md](data-model.md). Sin cambios al schema Prisma existente.

Relaciones clave:
```
User ──< Session · Account · TenantMember · Invitacion · Propietario(1-1)
Tenant ──< TenantMember · Invitacion · Propietario(1-1)
(todos con onDelete: Cascade hacia Tenant)
```

Auditoría: `createdById` / `updatedById` en `Tenant` y `Propietario` (poblados
por la Prisma extension de `core/prisma-scoped.ts`).

### Contracts

| Contrato | Archivo | Descripción |
|----------|---------|-------------|
| REST Better-Auth | [auth-rest.md](contracts/auth-rest.md) | 15 endpoints gestionados por BA |
| REST tenant (propio) | [tenant-rest.md](contracts/tenant-rest.md) | 4 endpoints de lectura con Prisma scoped |
| Socket.IO | [socket-events.md](contracts/socket-events.md) | 4 eventos server→client |

### Diseño de la Prisma Extension (core/prisma-scoped.ts)

```typescript
// Por request: recibe tenantId + userId del contexto de sesión BA
function crearPrismaScoped(tenantId: string, userId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        // create: inyecta tenantId y createdById/updatedById
        // findMany/findFirst/findUnique: filtra por tenantId
        // update: inyecta updatedById
      }
    }
  })
}
```

### Diseño de hooks de BA (infrastructure/better-auth.setup.ts)

```typescript
// Los hooks se registran en la config de BA y actúan como "after" del caso de uso
organization.hooks = {
  onOrganizationCreated: async ({ organization, member }) => {
    await crearPropietario(organization.id, member.userId)
    notificador.tenantCreado(organization.id)
  },
  onOrganizationUpdated: async ({ organization }) => {
    notificador.tenantActualizado(organization.id, organization)
  },
  onOrganizationDeleted: async ({ organizationId }) => {
    notificador.tenantEliminado(organizationId)
  },
}
```

---

## Phase 1: Agent Context Update

CLAUDE.md actualizado para apuntar a este plan (ver sección SPECKIT).

---

## Notas de implementación

- El campo `role` en TenantMember que crea BA es `"owner"` por defecto para el creador.
  En nuestro dominio, `"owner"` equivale a `"PROPIETARIO"`. El guard
  `requireRol(["PROPIETARIO", "owner"])` debe aceptar ambos.
- `Propietario` requiere campos adicionales (`nombres`, `telefono`, `domicilio`,
  `nombreReferencia`, `telefonoReferencia`) que BA no puede proveer. El hook
  `onOrganizationCreated` debe inicializarlos con valores temporales o un wizard
  de onboarding post-creación los completa (controlado por `ultimoPasoCreacion`).
- El `enum Estado` (PENDIENTE, ACTIVO, INACTIVO, ELIMINADO) ya existe en el schema
  del módulo `compartido`.
