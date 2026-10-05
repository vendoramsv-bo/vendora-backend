# Data Model: Configuración del negocio

**Feature**: `026-configuracion-tenant-api` | **Fecha**: 2026-10-04

## Cambios de schema (`prisma/10-tenant.prisma`)

```prisma
model Propietario {
  // userId         String    @unique        ← antes
  userId            String                   // un usuario puede ser propietario de varios negocios
  tenantId          String    @unique        // sin cambio: uno por negocio (Q1)
  @@index([userId])
  // …resto sin cambios
}

model EquipoDeTrabajo {
  telefono          String?                  // antes String
  domicilio         String?                  // antes String
  // @@unique([tenantId, telefono]) se mantiene: varios NULL no chocan en PostgreSQL
}
```

### Migración `<ts>_configuracion_tenant`

1. `DROP INDEX "Propietario_userId_key"` + `CREATE INDEX` sobre `userId`.
2. `ALTER COLUMN telefono DROP NOT NULL`, `ALTER COLUMN domicilio DROP NOT NULL` en
   `EquipoDeTrabajo`.
3. Backfill de propietarios:

```sql
INSERT INTO tenant."Propietario"
  (id, "tenantId", "userId", nombres, telefono, domicilio, "nombreReferencia",
   "telefonoReferencia", estado, "createdAt", "createdById", "updatedById")
SELECT gen_random_uuid()::text, m."organizationId", m."userId", '', '', '', '', '',
       'ACTIVO', now(), m."userId", m."userId"
FROM (
  SELECT DISTINCT ON ("organizationId") "organizationId", "userId"
  FROM <tabla de TenantMember>
  WHERE role IN ('owner', 'PROPIETARIO')
  ORDER BY "organizationId", "createdAt" ASC
) m
WHERE NOT EXISTS (SELECT 1 FROM tenant."Propietario" p WHERE p."tenantId" = m."organizationId");
```

`<tabla de TenantMember>` y los nombres reales de columnas se toman de
`prisma/10-tenant.prisma` (`@@map`) al generar la migración. `@@unique([tenantId,
nombres])` y `@@unique([tenantId, telefono])` no chocan porque hay una sola fila por
negocio.

## Recursos y su traducción contrato ↔ modelo

### Descripción → `Descripcion`

| Contrato | Modelo | Reglas |
|---|---|---|
| `id` | `id` | |
| `contenido` | `descripcion` | 1–500 caracteres |
| `orden` | `orden` | asignado por el sistema |
| `createdAt` | `createdAt` | ISO 8601 |

### Imagen del local → `Imagen`

| Contrato | Modelo | Reglas |
|---|---|---|
| `url` | `imagenUrl` | URL; única por negocio → `409` |
| `descripcion?` | `descripcion` | ≤ 200; el modelo la exige, se guarda `""` si falta |
| `orden`, `createdAt`, `id` | ídem | |

### Miembro del equipo → `EquipoDeTrabajo`

| Contrato | Modelo | Reglas |
|---|---|---|
| `nombre` | `nombres` | 2–100; único por negocio → `409` |
| `telefono?` | `telefono` | teléfono boliviano; único por negocio si está → `409` |
| `cargo` | `cargo` | 2–100 |
| `domicilio?` | `domicilio` | ≤ 200 |
| `fotoUrl?` | `imagenUrl` | URL o vacío (vacío → `null`) |
| `orden`, `createdAt`, `id` | ídem | |

### Localización → `Localizacion`

| Contrato | Modelo | Reglas |
|---|---|---|
| `latitud` / `longitud` | ídem | ±90 / ±180 |
| `direccion` | ídem | 5–200 |
| `barrio?` | ídem | ≤ 100 |
| `ciudad`, `departamento` | ídem | 2–100 |
| `id`, `createdAt` | ídem | |

Borrar la única → `422 ULTIMA_LOCALIZACION`.

### Propietario → `Propietario`

| Contrato | Modelo | Reglas |
|---|---|---|
| `nombre` | `nombres` | 2–100 |
| `telefono` | `telefono` | teléfono boliviano |
| `domicilio?` | `domicilio` | ≤ 200 (`""` si falta) |
| `referenciaNombre?` | `nombreReferencia` | ≤ 100 |
| `referenciaTelefono?` | `telefonoReferencia` | teléfono boliviano |
| `id`, `createdAt` | ídem | |

### Miembro → `TenantMember` (+ `User`)

| Contrato | Origen |
|---|---|
| `id`, `userId` | `TenantMember` |
| `nombreCompleto`, `email` | `User.name`, `User.email` |
| `rol` | `role`, con `owner` normalizado a `PROPIETARIO` |
| `estado` | `"activo"` (literal: solo se listan los activos) |
| `joinedAt` | `createdAt` |

### Invitación → `Invitacion`

| Contrato | Origen |
|---|---|
| `id`, `email`, `expiresAt`, `createdAt` | ídem |
| `rol` | `role` |

Estados: `pending` → (`accepted` lo pone Better-Auth | `canceled` lo pone esta feature).
Solo se listan las `pending` no vencidas.

### Capacidad (sin tabla propia)

| Contrato | Origen |
|---|---|
| `tipo` | `tienda` / `consultorio` / `restaurante` |
| `activa` | `Tenant.esTienda` / `esConsultorio` / `esRestaurante` |

## Reglas de dominio (puras, testeables sin infraestructura)

| Función | Archivo | Regla |
|---|---|---|
| `validarReordenamiento(actuales, enviados)` | `domain/lista-ordenada.ts` | mismo conjunto, sin repetidos → si no, `OrdenDesactualizadoError` |
| `rolesAsignables(verticales)` | `domain/roles-por-vertical.ts` | unión de roles por vertical activa (research §8) |
| `validarCambioDeRol(actor, objetivo, rolNuevo, propietariosRestantes)` | ídem | solo PROPIETARIO toca PROPIETARIO; nunca 0 propietarios |
| `validarDesactivacion(verticales, tipo)` | `domain/capacidades.ts` | no desactivar la última activa |

## Errores de dominio (`domain/tenant.errors.ts`)

| Clase | `code` | HTTP |
|---|---|---|
| `RecursoConfiguracionNoEncontrado` | `NO_ENCONTRADO` | 404 |
| `ConflictoUnicidadConfiguracion` | `CONFLICTO_UNICIDAD` | 409 |
| `OrdenDesactualizadoError` | `ORDEN_DESACTUALIZADO` | 409 |
| `LimiteListaAlcanzadoError` | `LIMITE_ALCANZADO` | 422 |
| `UltimaLocalizacionError` | `ULTIMA_LOCALIZACION` | 422 |
| `UltimaVerticalError` | `ULTIMA_VERTICAL` | 422 |
| `UnicoPropietarioError` | `UNICO_PROPIETARIO` | 422 |
| `RolNoAsignableError` | `ROL_NO_ASIGNABLE` | 422 (lista los válidos) |
| `SoloPropietarioError` | `SOLO_PROPIETARIO` | 403 |
| `YaEsMiembroError` | `YA_ES_MIEMBRO` | 409 |
| `InvitacionPendienteError` | `INVITACION_PENDIENTE` | 409 |
