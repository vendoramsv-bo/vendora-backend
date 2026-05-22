# Contratos REST — Autenticación (Better-Auth)

> Estos endpoints son provistos **automáticamente** por Better-Auth montado en
> Hono en `/api/auth`. No requieren código custom salvo la inicialización del handler.
>
> Referencia: https://better-auth.com/docs

---

## Base URL

```
POST/GET /api/auth/**
```

Montado en Hono con:
```ts
app.on(["GET", "POST"], "/api/auth/**", (c) => auth.handler(c.req.raw))
```

---

## Registro y Verificación de Email

### POST /api/auth/sign-up/email

Crea cuenta con email y contraseña. Envía correo de verificación automáticamente.

**Request body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "mínimo8chars",
  "name": "Nombre Apellido",
  "userName": "usuario123"
}
```

**Response 200:**
```json
{ "user": { "id": "...", "email": "...", "emailVerified": false } }
```

**Response 400:** Email ya registrado / contraseña muy corta.

---

### GET /api/auth/verify-email?token=TOKEN

Verifica el email del usuario. Tras verificación, inicia sesión automáticamente
(`autoSignInAfterVerification: true`).

**Response 200:** Redirige + sesión activa.
**Response 400:** Token inválido o expirado (24 horas).

---

## Inicio de Sesión

### POST /api/auth/sign-in/email

Login con email y contraseña. Requiere email verificado.

**Request body:**
```json
{ "email": "usuario@ejemplo.com", "password": "miContraseña" }
```

**Response 200:**
```json
{
  "session": { "token": "...", "expiresAt": "..." },
  "user": { "id": "...", "email": "...", "emailVerified": true }
}
```

**Response 401:** Email no verificado / credenciales incorrectas.
**Response 429:** Demasiados intentos — `Retry-After` en headers (espera creciente).

---

### POST /api/auth/sign-in/social

Inicio de sesión con proveedor social (Google).

**Request body:**
```json
{ "provider": "google", "callbackURL": "/dashboard" }
```

**Response 200:** Redirige al OAuth consent de Google.
Tras OAuth exitoso → redirige a `callbackURL` con sesión activa.

---

## Sesión y Cierre

### POST /api/auth/sign-out

Cierra sesión e invalida el token activo.

**Headers requeridos:** `Authorization: Bearer <token>` o cookie de sesión.

**Response 200:** `{ "success": true }`

---

### GET /api/auth/get-session

Obtiene la sesión activa del usuario actual.

**Response 200:**
```json
{
  "session": { "token": "...", "expiresAt": "...", "activeOrganizationId": "..." },
  "user": { "id": "...", "name": "...", "email": "...", "emailVerified": true }
}
```

**Response 401:** Sin sesión activa.

---

## Recuperación de Contraseña

### POST /api/auth/forget-password

Solicita enlace de restablecimiento de contraseña por email.

**Request body:** `{ "email": "usuario@ejemplo.com" }`
**Response 200:** `{ "success": true }` (siempre, para no revelar si el email existe)

---

### POST /api/auth/reset-password

Restablece la contraseña con el token del enlace.

**Request body:** `{ "token": "TOKEN_DEL_EMAIL", "newPassword": "nuevaContraseña" }`
**Response 200:** `{ "success": true }`
**Response 400:** Token inválido o expirado.

---

## Gestión de Tenant (BA Organization Plugin)

### POST /api/auth/organization/create

Crea un nuevo tenant. El usuario queda como propietario (TenantMember con role="owner").

**Request body:**
```json
{
  "name": "Mi Negocio",
  "slug": "mi-negocio",
  "nombreLargo": "Mi Negocio S.A.S.",
  "descripcion": "Descripción del negocio",
  "logo": "https://...",
  "esTienda": false,
  "esConsultorio": true,
  "esRestaurante": false
}
```

**Response 200:** `{ "organization": { "id": "...", "name": "...", "slug": "..." } }`
**Response 400:** Slug o name ya existe.

**Hook de dominio (código propio):** Al completar → crear `Propietario` + emitir
`tenant:creado` en Socket.IO.

---

### PATCH /api/auth/organization/update

Actualiza datos del tenant activo.

**Request body:** Cualquier subset de los campos editables (name, slug, logo,
nombreLargo, descripcion, esTienda, esConsultorio, esRestaurante, plan).

**Response 200:** `{ "organization": { ...updatedFields } }`

**Hook de dominio:** Al completar → emitir `tenant:actualizado`.

---

### DELETE /api/auth/organization/delete

Elimina el tenant activo. Solo el propietario puede ejecutarlo. Cascade delete
sobre TenantMember, Invitacion y Propietario (definido en Prisma).

**Response 200:** `{ "success": true }`

**Hook de dominio:** Al completar → emitir `tenant:eliminado`.

---

### POST /api/auth/organization/invite-member

Envía invitación por email a un rol específico. Requiere rol admin u owner.

**Request body:**
```json
{ "email": "invitado@ejemplo.com", "role": "VENDEDOR" }
```

**Response 200:** `{ "invitation": { "id": "...", "status": "pending" } }`

---

### POST /api/auth/organization/accept-invitation

Acepta una invitación pendiente. El invitado queda como TenantMember.

**Request body:** `{ "invitationId": "..." }`
**Response 200:** `{ "member": { "id": "...", "role": "VENDEDOR" } }`
**Response 400:** Invitación expirada (>7 días) o ya aceptada.

---

### DELETE /api/auth/organization/remove-member

Remueve a un miembro del tenant. Requiere rol admin u owner.

**Request body:** `{ "memberIdOrEmail": "..." }`
**Response 200:** `{ "success": true }`
**Response 400:** El miembro a remover es el único propietario del tenant.

> **Guard custom (código propio):** BA **no bloquea** nativamente que se elimine al único
> propietario. El hook `beforeRemoveMember` en `better-auth.setup.ts` lanza `APIError` si
> el miembro tiene rol owner/PROPIETARIO y es el único con ese rol (FR-026, H2).

---

### POST /api/auth/organization/leave

El usuario activo sale voluntariamente del tenant.

**Response 200:** `{ "success": true }`
**Response 400:** El usuario es el único propietario del tenant.

> **Guard custom (código propio):** BA **no expone** hook `beforeLeaveOrganization`. El guard
> se aplica en `beforeRemoveMember` si BA enruta `leave` por esa vía, o como middleware Hono
> previo al handler de BA si no lo enruta (verificar durante implementación de T034a, FR-027).

---

### POST /api/auth/organization/set-active

Cambia el tenant activo en la sesión del usuario.

**Request body:** `{ "organizationId": "tenant_id" }`
**Response 200:** `{ "session": { ...updatedSession } }`
**Response 403:** El usuario no pertenece al tenant solicitado.

---

## Eliminación de Cuenta (Endpoint Custom)

> Este endpoint **no es provisto por BA**. Es un handler Hono custom en el módulo
> `autenticacion` que combina lógica de dominio con la BA admin API server-side.

### DELETE /api/user

Elimina la cuenta del usuario autenticado. Si es el único propietario de uno o más tenants,
los elimina en cascada antes de borrar la cuenta (FR-031).

**Headers requeridos:** `Authorization: Bearer <token>`

**Flujo interno:**
1. `requireAuth` — verificar sesión activa.
2. Consultar `TenantMember` via Prisma: todos los tenants donde el usuario tiene rol `owner`/`PROPIETARIO`.
3. Para cada uno: verificar si hay **otro** miembro con rol owner. Si no → eliminar tenant con `auth.api.deleteOrganization` server-side (el usuario es owner → autorizado; cascade de TenantMember, Invitacion, Propietario vía `onDelete: Cascade` Prisma).
4. Eliminar la cuenta en una transacción Prisma (`$transaction`): borrar en orden de FK todas las filas que referencian al usuario (`Invitacion`, `Propietario`, `TenantMember`, `Session`, `Account`) y finalmente la fila `User`.
5. Retornar 204.

**Response 204:** Cuenta eliminada correctamente.
**Response 401:** Sin sesión activa.

> **Por qué no `auth.api.removeUser`**: el endpoint `removeUser` pertenece al **admin plugin**
> de Better-Auth y exige que el llamador tenga rol admin. Un usuario eliminando su propia
> cuenta no es admin, por lo que esa vía sería rechazada con 403. El borrado directo vía
> Prisma en transacción es determinista y no depende de un cascade hacia `User` (el schema
> sólo garantiza cascade hacia `Tenant`).

> **Nota**: La eliminación de tenants en paso 3 dispara los hooks `onOrganizationDeleted`
> → `notificador.tenantEliminado()` → evento Socket.IO `tenant:eliminado` a los miembros conectados.
