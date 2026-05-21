# Data Model: Cimiento de Autenticación y Multi-tenancy

> **IMPORTANTE**: Los modelos son autoritativos y viven en `prisma/`. Este documento
> los describe tal como están — NO se proponen cambios de schema.
>
> Archivos fuente:
> - `prisma/00-autenticacion.prisma` → schema `autenticacion`
> - `prisma/10-tenant.prisma` → schema `tenant`

---

## Schema `autenticacion`

### User — tabla `user`

Identidad de acceso a la plataforma. Gestionado por Better-Auth.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (cuid) | PK |
| name | String | Nombre completo (BA required) |
| email | String UNIQUE | Email de la cuenta |
| emailVerified | Boolean (false) | True tras verificar email |
| image | String? | URL de imagen de perfil |
| userName | String UNIQUE | Handle público |
| firstName | String? | Nombre |
| lastName | String? | Apellido |
| role | String? ("user") | Rol global: "user" \| "admin" |
| banned | Boolean (false) | Ban administrativo por BA admin plugin |
| banReason | String? | Motivo del ban |
| banExpiresAt | DateTime? | Expiración del ban |
| locked | Boolean (false) | Bloqueo aplicativo independiente |
| createdAt | DateTime | Timestamp de creación |
| updatedAt | DateTime | Timestamp de última modificación |

**Relaciones**: sessions, accounts, memberships (TenantMember[]),
invitacionesEnviadas (Invitacion[]), propietario (Propietario?)

---

### Session — tabla `session`

Sesión activa de 7 días. Gestionada por Better-Auth.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (cuid) | PK |
| token | String UNIQUE | Token de sesión |
| expiresAt | DateTime | Expiración (ahora + 7 días) |
| userId | String FK | Usuario dueño de la sesión |
| activeOrganizationId | String? | Tenant activo en esta sesión |
| ipAddress | String? | IP del cliente |
| userAgent | String? | UA del cliente |
| impersonatedBy | String? | Admin que impersona (plugin admin) |

**Índice**: [userId]

---

### Account — tabla `account`

Credenciales de acceso por proveedor. Gestionado por Better-Auth.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (cuid) | PK |
| providerId | String | "credential" \| "google" \| "github" |
| accountId | String | ID del proveedor (sub de OAuth o email) |
| userId | String FK | Usuario propietario |
| password | String? | Hash de contraseña (solo credential) |
| accessToken | String? | Token OAuth |
| refreshToken | String? | Refresh token OAuth |
| scope | String? | Scopes OAuth |

**Unique**: [providerId, accountId] · **Índice**: [userId]

---

### Verification — tabla `verification`

Tokens de verificación de email y reset de contraseña. Gestionado por BA.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (cuid) | PK |
| identifier | String | Email o teléfono al que se envió el token |
| value | String | Token o código (hasheado) |
| expiresAt | DateTime | Expiración del token |

**Índice**: [identifier]

---

### Invitacion — tabla `invitation`

Invitación pendiente para unirse a un tenant. Gestionado por BA Organization plugin.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (cuid) | PK |
| organizationId | String FK | Tenant que invita |
| email | String | Email del invitado |
| role | String? | Rol asignado al aceptar |
| status | String ("pending") | "pending" \| "accepted" \| "rejected" \| "canceled" |
| expiresAt | DateTime | Expiración (7 días desde creación) |
| inviterId | String FK | Usuario que envió la invitación |

**Índices**: [email], [organizationId, status]

---

## Schema `tenant`

### Tenant — tabla `organization`

Organización/negocio. Gestionado por BA Organization plugin (create/update/delete).
Los campos `additionalFields` se registran en la config de BA.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (cuid) | PK |
| name | String UNIQUE | Nombre corto (BA required) |
| slug | String UNIQUE | Identificador para URLs |
| logo | String? | URL del logo |
| metadata | String? | JSON serializado (BA internal) |
| nombreLargo | String UNIQUE | Nombre largo del negocio |
| descripcion | String | Descripción del negocio |
| esTienda | Boolean (false) | Flag: capacidad retail activa |
| esConsultorio | Boolean (false) | Flag: capacidad clínica activa |
| esRestaurante | Boolean (false) | Flag: capacidad restaurant activa |
| plan | PlanTenant (BASICO) | BASICO \| PROFESIONAL \| EMPRESARIAL |
| estado | Estado (PENDIENTE) | PENDIENTE \| ACTIVO \| INACTIVO \| ELIMINADO |
| ultimoPasoCreacion | Int (1) | Paso del wizard de onboarding |
| createdAt | DateTime | Timestamp de creación |
| updatedAt | DateTime? | Timestamp de última modificación |
| createdById | String? | Auditoría: quién creó |
| updatedById | String? | Auditoría: quién modificó por última vez |

**Relaciones**: miembros (TenantMember[]), invitaciones (Invitacion[]),
propietarios (Propietario[]), tienda (Tienda?), consultorio (Consultorio?),
restaurante (Restaurante?)

---

### TenantMember — tabla `member`

Relación usuario-tenant con rol. Gestionado por BA Organization plugin.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (cuid) | PK |
| organizationId | String FK | Tenant al que pertenece |
| userId | String FK | Usuario miembro |
| role | String ("member") | Rol libre por vertical (ej. "PROPIETARIO", "ADMIN") |
| estado | Estado (ACTIVO) | ACTIVO \| INACTIVO |
| createdAt | DateTime | Fecha de ingreso |
| updatedAt | DateTime? | Última modificación |

**Unique**: [organizationId, userId] · **Índice**: [userId]

**Roles por vertical (cadenas libres):**
- Tienda: PROPIETARIO, ADMIN, VENDEDOR, BODEGUERO
- Consultorio: ADMIN, MEDICO, RECEPCIONISTA
- Restaurante: PROPIETARIO, ADMIN, ENCARGADO, VENDEDOR, CHEF, MESERO

---

### Propietario — tabla `propietario`

Perfil extendido del dueño del tenant. Creado por hook de dominio al crear Tenant.
Relación 1-a-1 tanto con Tenant como con User.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (cuid) | PK |
| tenantId | String UNIQUE FK | Tenant propietario (cascade delete) |
| userId | String UNIQUE FK | Usuario propietario (cascade delete) |
| nombres | String | Nombre completo del propietario |
| telefono | String | Teléfono de contacto |
| domicilio | String | Dirección |
| nombreReferencia | String | Nombre de referencia de emergencia |
| telefonoReferencia | String | Teléfono de referencia de emergencia |
| imagenUrl | String? | URL de imagen del propietario |
| estado | Estado (ACTIVO) | Estado del perfil |
| createdAt | DateTime | Timestamp de creación |
| updatedAt | DateTime? | Última modificación |
| createdById | String? | Auditoría: quién creó |
| updatedById | String? | Auditoría: quién modificó |

**Unique**: [tenantId, telefono], [tenantId, nombres]

---

## Estados y Enums

```
enum Estado (schema compartido/tenant):
  PENDIENTE | ACTIVO | INACTIVO | ELIMINADO

enum PlanTenant (schema tenant):
  BASICO | PROFESIONAL | EMPRESARIAL
```

---

## Relaciones clave para este feature

```
User ──< Session          (userId)
User ──< Account          (userId)
User ──< TenantMember     (userId)
User ──< Invitacion       (inviterId)   ← invitaciones que envió
User ──  Propietario      (userId)      ← 1-a-1
Tenant ──< TenantMember   (organizationId)
Tenant ──< Invitacion     (organizationId)
Tenant ──  Propietario    (tenantId)    ← 1-a-1
```

Todas las relaciones hacia Tenant usan `onDelete: Cascade` — al eliminar un tenant,
se eliminan en cascada todos sus miembros, invitaciones y el registro Propietario.
