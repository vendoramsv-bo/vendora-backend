# Research: Configuración del negocio — pantallas sin backend

**Feature**: `026-configuracion-tenant-api` | **Fecha**: 2026-10-04

Verificado contra `main` (`15f5b50`), el frontend en `../vendora-frontend` y la base de
desarrollo (Neon; solo lecturas).

## 1. Invitar y cancelar: casos de uso propios, no la API de Better-Auth

**Hallazgo**: `auth.api.createInvitation` (Better-Auth 1.6.11,
`plugins/organization/routes/crud-invites.mjs`) hace dos chequeos que fallan con los
roles de VENDORA:

1. `hasPermission({ role: miembro.role, permissions: { invitation: ["create"] } })`
   evalúa el rol **del que invita** contra los roles por defecto (`owner`, `admin`,
   `member`). Un `ADMIN` o `PROPIETARIO` de VENDORA no es ninguno de esos → `FORBIDDEN`.
2. El rol **invitado** tiene que estar en `defaultRoles` o en `orgOptions.roles`. La
   configuración (`better-auth.setup.ts`) no declara `roles` → `ROLE_NOT_FOUND` para
   `VENDEDOR`, `CHEF`, etc.

En cambio, `acceptInvitation` crea el miembro copiando `invitation.role` **sin
validarlo** (`crud-invites.mjs:287-290`).

**Decision**: crear y cancelar invitaciones con casos de uso propios que escriben en
`Invitacion` (`status: "pending"` / `"canceled"`, `expiresAt` a 7 días, como dice el
correo actual). El correo se envía por un puerto `INotificadorInvitacion` implementado
con Resend, con el mismo contenido y la misma URL que hoy. **La aceptación no cambia**:
la sigue haciendo Better-Auth.

**Alternatives considered**: declarar los 9 roles con su *access control* en la config
del plugin. Es lo correcto a largo plazo, pero redefine la autorización de todos los
endpoints `/api/auth/organization/*`, que el frontend también usa. Merece su propia spec.

## 2. Quitar un miembro tiene que cortar su acceso de inmediato

**Hallazgo**: `requireTenantActivo` (`core/hono-context.ts:123`) toma el negocio de
`session.activeOrganizationId` **sin verificar la membresía**. Solo
`resolverMiembroActivo` (montado en `almacenApp` y algunos otros) y `requireRol` la
verifican. Un miembro quitado con la sesión abierta seguiría entrando a los endpoints
que solo usan `requireTenantActivo`.

**Decision**: `QuitarMiembroUseCase`, en una transacción, borra el `TenantMember` y
pone `activeOrganizationId = NULL` en las sesiones de ese usuario que apuntan a ese
negocio. Desde la siguiente request, `requireTenantActivo` responde
`SIN_TENANT_ACTIVO` (SC-004). Lo mismo al **bajar** de rol no hace falta: `requireRol`
lee el rol de la base en cada request.

**Recomendación fuera de alcance**: que `requireTenantActivo` verifique la membresía,
o montar `resolverMiembroActivo` en todos los routers.

## 3. Nombres de campos: el contrato usa los del frontend

**Decision**: entrada y salida usan los nombres que el frontend ya envía y lee; los
repositorios traducen al modelo.

| Recurso | Contrato (frontend) | Modelo |
|---|---|---|
| Descripción | `contenido` | `descripcion` |
| Imagen del local | `url`, `descripcion` | `imagenUrl`, `descripcion` |
| Equipo | `nombre`, `fotoUrl` | `nombres`, `imagenUrl` |
| Propietario | `nombre`, `referenciaNombre`, `referenciaTelefono` | `nombres`, `nombreReferencia`, `telefonoReferencia` |
| Miembro | `rol`, `nombreCompleto`, `email`, `estado: "activo"`, `joinedAt` | `role` (`owner` ≡ `PROPIETARIO`), `user.name`, `user.email`, `createdAt` |
| Invitación | `rol` | `role` |

**Rationale**: la spec fija que el contrato lo dicta el frontend (Assumptions). Cambiar
los nombres en las 3 apps no aporta nada y rompe pantallas ya construidas.

## 4. Listas ordenadas: tope de 100 y reordenamiento atómico

**Decision**:
- Descripciones, imágenes y equipo se listan por `orden asc, createdAt asc, id asc`
  (orden estable aunque haya empates).
- **Tope de 100 elementos por lista y negocio**: crear el 101 → `422 LIMITE_ALCANZADO`.
  Con `take` máximo 100 (Art. IV), una página siempre trae la lista completa, que es lo
  que necesita la pantalla para arrastrar y soltar.
- `PATCH /x/reorder { ids }`: válido solo si `ids` es **exactamente** el conjunto de
  elementos del negocio (sin repetidos, sin faltantes, sin ajenos). Si no → `409
  ORDEN_DESACTUALIZADO`, sin aplicar nada. Si es válido, una transacción asigna
  `orden = posición`.
- Crear asigna `orden = max + 1`. Editar no toca `orden`.

**Detalle de ruteo**: `PATCH /x/reorder` tiene que registrarse **antes** que
`PATCH /x/{id}`, o Hono lo toma como `id = "reorder"`. El test de rutas únicas no lo
detecta (son paths distintos); lo cubre el test de contrato.

## 5. Borrar: físico, no lógico

**Decision**: borrar elimina la fila en descripciones, imágenes, equipo y
localizaciones. Se corrige el supuesto de la spec ("baja lógica").

**Rationale**: `EquipoDeTrabajo` es único por `(tenantId, telefono)` y por
`(tenantId, nombres)`, e `Imagen` por `(tenantId, imagenUrl)`. Con baja lógica, un
miembro borrado impide volver a cargar a alguien con el mismo nombre, y no hay ningún
requisito de conservar el histórico de este contenido. La vitrina ya filtra por
`estado: "ACTIVO"`, así que lo borrado deja de verse igual (FR-011).

## 6. Migración del modelo

**Decision**: una migración con:
1. `Propietario`: quitar `@unique` de `userId`. Se mantiene `@unique` de `tenantId`
   (Q1: uno por negocio). Hoy un usuario dueño de dos negocios no puede tener
   propietario en ninguno de los dos; es el caso del usuario dueño de 2 de los 3
   negocios de desarrollo.
2. `EquipoDeTrabajo.telefono` y `.domicilio` → opcionales. El frontend los trata como
   opcionales, y un `""` en `telefono` haría chocar al segundo miembro sin teléfono con
   el `@@unique([tenantId, telefono])`. En PostgreSQL varios `NULL` no chocan.
3. **Backfill**: un `INSERT … SELECT` que crea el `Propietario` de cada negocio que no
   lo tiene, a partir de su miembro `owner`/`PROPIETARIO` más antiguo, con los campos de
   texto vacíos, igual que hace hoy `onOrganizationCreated`. Datos actuales: 3 negocios,
   1 propietario; el backfill crea 2.

Las pantallas de propietario no exponen alta (Q1), así que sin el backfill esos
negocios no tendrían cómo cargarlo.

## 7. Capacidades: puerto por vertical y regla de la última

**Decision**:
- `GET /capabilities` → `{ data: [{ tipo, activa }] }` con `tipo ∈ tienda | consultorio
  | restaurante`, leído de `esTienda/esConsultorio/esRestaurante`.
- `PATCH /capabilities/{tipo} { activa }` delega en `IActivadorVertical` (registrado
  por cada vertical en `server/index.ts`), que llama a los casos de uso que ya existen:
  `ActivarTiendaUseCase`/`DesactivarTiendaUseCase`,
  `ActivarPerfilPublicoConsultorioUseCase`/`DesactivarPerfilPublicoConsultorioUseCase`
  y `ActivarPerfilPublicoUseCase`/`DesactivarPerfilPublicoUseCase` (restaurante).
- Desactivar la última activa → `422 ULTIMA_VERTICAL` (el frontend ya espera un 422).
- La regla vive en `domain/capacidades.ts` y la usa también `DesactivarTiendaUseCase`,
  para que `PATCH /tienda/desactivar` no la saltee.
- Solo `PROPIETARIO` puede cambiar capacidades, igual que `tienda/activar`.

**Por qué un puerto**: `tenant` es núcleo y, por el Art. II.1, no puede importar
verticales.

**Límite conocido**: la tienda no tiene un guard equivalente a `requireConsultorio` /
`requireRestaurante`, así que desactivarla oculta su perfil público pero no bloquea sus
endpoints de staff. Es preexistente y queda fuera de alcance; US5-3 se cumple para
consultorio y restaurante.

## 8. Roles asignables por vertical

**Decision**: los roles válidos son la unión de los roles de las verticales activas
(Art. VII.2), más `PROPIETARIO` y `ADMIN`:

| Vertical | Roles |
|---|---|
| tienda | PROPIETARIO, ADMIN, VENDEDOR, BODEGUERO |
| consultorio | ADMIN, MEDICO, RECEPCIONISTA |
| restaurante | PROPIETARIO, ADMIN, ENCARGADO, VENDEDOR, CHEF, MESERO |

Reglas adicionales:
- Solo un `PROPIETARIO` puede asignar o quitar el rol `PROPIETARIO`. Es la misma regla
  que aplica Better-Auth con `creatorRole`.
- El negocio no puede quedar sin `PROPIETARIO` (`owner` cuenta como `PROPIETARIO`).
- Invitar a un correo que ya es miembro → `409 YA_ES_MIEMBRO`. Si ya tiene una
  invitación pendiente → `409 INVITACION_PENDIENTE`.

## 9. Las dos lecturas que ya existen

`GET /miembros` y `GET /invitaciones` devuelven hoy `role` y `usuario.{name,email}`,
pero la pantalla lee `rol`, `nombreCompleto`, `email` y `joinedAt`. Se **agregan** esos
campos sin quitar los actuales: puede haber otros consumidores.

## 10. Lo que la vitrina lee

La vitrina pública lee equipo, imágenes y localizaciones, pero **no lee la tabla
`Descripcion`**: muestra el campo `Tenant.descripcion`. Las descripciones de esta
pantalla no tienen hoy ningún lugar público donde mostrarse. Se construyen igual (la
pantalla existe); mostrarlas en la vitrina es trabajo de la vitrina y queda fuera de
alcance.
