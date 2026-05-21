# Research: Cimiento de Autenticación y Multi-tenancy

**Feature**: 001-auth-multitenancy
**Date**: 2026-05-20

---

## Decisión 1 — Motor de Autenticación

**Decision**: Better-Auth con plugins `organization` y `admin`.

**Rationale**: El archivo `prisma/auth.ts` ya existe con BA completamente configurado:
- `emailAndPassword` habilitado con `requireEmailVerification: true`, `minPasswordLength: 8`
- `socialProviders.google` configurado
- Plugin `organization` mapeado a `Tenant / TenantMember / Invitacion`
- Plugin `admin` con roles globales `user / admin`
- `session.expiresIn: 60 * 60 * 24 * 7` (7 días — coincide con clarificación Q3)
- `emailVerification.autoSignInAfterVerification: true`
- `experimental.joins: true` para mejorar rendimiento de `getSession`

**Alternatives considered**: Auth.js, Lucia, JWT propio. Descartados porque BA
provee Organization plugin con mapeo directo a Tenant/TenantMember/Invitacion, eliminando
lógica custom para el 80% de los flujos de auth.

---

## Decisión 2 — Distribución de responsabilidades BA vs código propio

**Decision**: Better-Auth gestiona TODOS los flujos de auth + org. El código propio
agrega hooks de dominio y endpoints de lectura con Prisma scopeado.

**BA gestiona directamente (via REST /api/auth/**):**
- Registro, verificación de email, login (email/contraseña + Google)
- Reset de contraseña, cierre de sesión
- Crear/actualizar/eliminar Tenant (org)
- Invitar miembro, aceptar invitación, remover miembro, salir del tenant
- Cambiar tenant activo en la sesión
- Verificación de 7 días de expiración de sesión

**Código propio (capa de dominio):**
- Hook `onOrganizationCreated` → crea registro `Propietario` + emite evento Socket.IO
- Hook `onOrganizationUpdated` → emite evento Socket.IO `tenant:actualizado`
- Hook `onOrganizationDeleted` → emite evento Socket.IO `tenant:eliminado`
- Endpoints REST de lectura con Prisma scoped client (tenant isolation)
- Prisma extension para inyección automática de tenantId y createdById/updatedById

**Alternatives considered**: Reimplementar la gestión de invitaciones en nuestro dominio.
Descartado: el plugin Organization de BA ya implementa el ciclo completo con tokens,
expiración y estados, mapeado exactamente a nuestro modelo `Invitacion`.

---

## Decisión 3 — Limitación de intentos de login (Q4: espera creciente)

**Decision**: Configurar el módulo `rateLimit` de Better-Auth para los endpoints de auth.

**Rationale**: BA tiene soporte nativo de rate limiting vía `rateLimit` en la config.
La implementación de espera creciente (5s, 15s, 60s) se logra combinando:
- `rateLimit.window` + `rateLimit.max` para detectar intentos repetidos
- BA devuelve `429 Too Many Requests` con header `Retry-After`
- El cliente aplica la espera indicada en el header

**Alternatives considered**: Implementar middleware propio en Hono con Redis store.
Se deja como alternativa si BA no cubre el comportamiento exacto; pero BA primero.

---

## Decisión 4 — Prisma Scoped Client (Artículo III.3)

**Decision**: Prisma Client Extension que inyecta tenantId en mutaciones y filtra en lecturas.

**Rationale**: La constitución requiere un cliente Prisma extendido que:
1. Inyecte `tenantId` automáticamente en `create`
2. Filtre por `tenantId` en `findMany`/`findUnique`/etc.
3. Rellene `createdById` y `updatedById` (auditoría)

Este cliente vive en `src/core/prisma-scoped.ts` y se instancia por request,
recibiendo `tenantId` y `userId` del contexto de BA.

---

## Decisión 5 — Socket.IO eventos de tenant (Artículo VI)

**Decision**: Los eventos se emiten desde los hooks de BA (equivalentes a casos de uso)
vía el puerto `ITenantNotificador`. El notificador de infraestructura emite a la sala
`tenant:${tenantId}`.

**Rationale**: Los hooks de BA (`onOrganizationCreated`, etc.) son el punto de ejecución
donde el dominio es modificado — equivalente al interior del caso de uso. Emitir desde
ahí garantiza que una mutación vía REST también notifica a usuarios web (Artículo VI.2).

---

## Decisión 6 — Modelos de datos: sin cambios (instrucción del usuario)

**Decision**: Usar los modelos Prisma tal como están en `prisma/00-autenticacion.prisma`
y `prisma/10-tenant.prisma`. NO se proponen tablas nuevas ni cambios de schema.

**Key mapping confirmed:**
- `User` → tabla `user` en schema `autenticacion`
- `Session` → tabla `session` en schema `autenticacion`
- `Account` → tabla `account` en schema `autenticacion`
- `Verification` → tabla `verification` en schema `autenticacion`
- `Invitacion` → tabla `invitation` en schema `autenticacion`
- `Tenant` → tabla `organization` en schema `tenant`
- `TenantMember` → tabla `member` en schema `tenant`
- `Propietario` → tabla `propietario` en schema `tenant` (sin @@map, nombre en español)

---

## Decisión 7 — Estructura de módulos

**Decision**: Dos módulos hexagonales: `autenticacion` (thin adapter sobre BA) y `tenant`
(dominio de tenant, lectura y eventos).

**autenticacion**: La mayor parte de la lógica vive en BA; el módulo solo monta el handler
y define los hooks. No necesita application/ con casos de uso propios.

**tenant**: Tiene puertos, casos de uso de lectura (obtener, listar miembros, listar
invitaciones), repositorio Prisma y notificador Socket.IO.
