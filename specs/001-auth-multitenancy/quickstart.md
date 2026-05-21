# Quickstart — Cimiento de Autenticación y Multi-tenancy

Guía para arrancar el desarrollo de este feature en el repositorio.

---

## Pre-requisitos

```bash
# Node.js LTS ≥ 20 y pnpm
node -v   # ≥ 20
pnpm -v   # cualquier versión reciente

# PostgreSQL corriendo (local o Testcontainers para tests)
# Redis corriendo (local)
```

---

## Variables de entorno

Crear `.env` en la raíz del proyecto:

```env
# Base de datos
DATABASE_URL="postgresql://user:pass@localhost:5432/vendora"

# Better-Auth
BETTER_AUTH_SECRET="secreto-de-32-chars-minimo"
APP_URL="http://localhost:3000"

# Google OAuth (para sign-in/social)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Redis (Socket.IO + BullMQ + cache)
REDIS_URL="redis://localhost:6379"

# Email (Resend)
RESEND_API_KEY="re_..."
```

---

## Setup inicial

```bash
# Instalar dependencias
pnpm install

# Generar cliente Prisma
pnpm prisma generate

# Crear schemas y tablas en PostgreSQL
pnpm prisma migrate dev --name init

# (Opcional) Seedear datos de prueba
pnpm prisma db seed
```

---

## Estructura de código a crear

Este feature requiere crear los siguientes archivos (en orden de dependencias):

### 1. Infraestructura core

```
src/core/prisma-scoped.ts      ← Prisma extension: scope tenant + audit
src/core/hono-context.ts       ← Middleware base: sesión BA + tenant activo
src/core/query-params.ts       ← makeQueryParamsSchema, toPrismaArgs, paginate
```

### 2. Módulo `autenticacion`

```
src/modules/autenticacion/
├── domain/
│   └── autenticacion.errors.ts
├── infrastructure/
│   └── better-auth.setup.ts   ← auth instancia + hooks de dominio
└── adapters/
    └── auth.rest.ts           ← monta BA en Hono en /api/auth
```

### 3. Módulo `tenant`

```
src/modules/tenant/
├── domain/
│   ├── tenant.entity.ts
│   ├── tenant.errors.ts
│   └── ports/
│       ├── ITenantRepository.ts
│       └── ITenantNotificador.ts
├── application/
│   ├── obtener-tenant.usecase.ts
│   ├── listar-tenants-usuario.usecase.ts
│   ├── listar-miembros.usecase.ts
│   └── listar-invitaciones-pendientes.usecase.ts
├── infrastructure/
│   ├── tenant.prisma.repository.ts
│   └── tenant.socket.notificador.ts
└── adapters/
    ├── tenant.rest.ts
    └── tenant.schema.ts
```

### 4. Servidor

```
src/server/hono.ts             ← app Hono con rutas
src/server/index.ts            ← entry point
```

---

## Verificar que funciona

### Test de registro + login

```bash
# 1. Registrar usuario
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test1234","name":"Test User","userName":"testuser"}'

# 2. Verificar email (ver consola — el link se loguea en dev)
# GET http://localhost:3000/api/auth/verify-email?token=TOKEN

# 3. Login
curl -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test1234"}'
# → guarda el token de sesión

# 4. Crear tenant
curl -X POST http://localhost:3000/api/auth/organization/create \
  -H "Authorization: Bearer SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Mi Tienda","slug":"mi-tienda","nombreLargo":"Mi Tienda S.A.S.","descripcion":"Una tienda de prueba"}'

# 5. Obtener tenant vía REST
curl http://localhost:3000/api/tenant/actual \
  -H "Authorization: Bearer SESSION_TOKEN"
```

---

## Ejecutar tests

```bash
# Tests de dominio (sin infraestructura, rápidos)
pnpm vitest run src/modules/tenant/domain
pnpm vitest run src/modules/autenticacion/domain

# Tests de integración (requiere Docker para Testcontainers)
pnpm vitest run src/modules/tenant/infrastructure
```

---

## Puntos de extensión para verticales futuras

Al agregar una vertical nueva, este cimiento ya provee:
- El tenant activo en la sesión (`session.activeOrganizationId`)
- El Prisma scoped client para aislamiento automático
- Los guards `requireTenantActivo` y `requireRol()`
- Los eventos Socket.IO para sincronización en tiempo real

Solo se necesita agregar el flag de capability al tenant (ej. `esHotel: Boolean`)
y el guard correspondiente.
