# Implementation Plan: Configuración del negocio — las pantallas que hoy no tienen backend

**Branch**: `026-configuracion-tenant-api` | **Date**: 2026-10-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/026-configuracion-tenant-api/spec.md`

## Summary

26 operaciones REST nuevas bajo `/api/tenant`, en el módulo `tenant`, para las 8
pantallas de Configuración que hoy responden 404. Además:

- **Una migración** que corrige dos reglas del modelo: el propietario deja de ser
  único por usuario, y teléfono y domicilio del equipo pasan a ser opcionales. La
  misma migración completa el propietario de los negocios que no lo tienen.
- **Se alinea la respuesta** de los dos GET que ya existen (`/miembros` e
  `/invitaciones`) con los campos que la pantalla lee. El cambio es aditivo.

El contrato (métodos, paths y nombres de campos) lo fija el frontend; los adaptadores
traducen al modelo de datos. Ver [contracts/configuracion-tenant.md](./contracts/configuracion-tenant.md).

## Technical Context

**Language/Version**: TypeScript 5.8 strict · Node.js ≥ 20
**Primary Dependencies**: Hono + `@hono/zod-openapi`, Zod 3, Prisma 7, Better-Auth 1.6 (plugin organization), Resend
**Storage**: PostgreSQL — schemas `tenant` y `autenticacion` (tablas existentes)
**Testing**: Vitest — unit con fakes por caso de uso; contrato sobre `/api/openapi.json`; `openapi-rutas-unicas.test.ts` vigila colisiones
**Target Platform**: Render, Web Service
**Project Type**: web-service (REST)
**Performance Goals**: operaciones unitarias; sin requisitos especiales
**Constraints**: listas ordenadas acotadas a 100 elementos por negocio (una página siempre las contiene completas, ver research §4); todo id de ruta se busca dentro del negocio activo
**Scale/Scope**: 26 operaciones nuevas, 2 respuestas alineadas, 1 migración, 8 recursos

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Artículo | Evaluación | Estado |
|---|---|---|
| I — Stack | Sin dependencias nuevas. Resend ya está en el stack | ✅ |
| II.1 — El núcleo no depende de verticales | `tenant` es núcleo y las capacidades activan tienda, consultorio y restaurante. Se resuelve con un **puerto** `IActivadorVertical` que cada vertical registra al arrancar (mismo patrón que `almacen-inventario.port.provider.ts`) | ✅ |
| II.2 — Hexagonal | Un caso de uso por operación con lógica (reordenar, quitar miembro, cambiar rol, invitar, capacidades); los CRUD simples comparten un caso de uso genérico de lista ordenada | ✅ |
| III.1 — Aislamiento | Cada búsqueda por id lleva `tenantId` del contexto; un id ajeno da 404, no 403 | ✅ |
| III.3 — Prisma scoped | Igual que el resto del backend: `tenantId` explícito. La brecha del scoping automático sigue registrada en la spec 020 | ⚠️ preexistente |
| IV — Consultas | Listas con `makeQueryParamsSchema` + `paginate()` + `paginadoSchema`. Orden por defecto `orden asc` en las listas ordenadas, `createdAt desc` en el resto | ✅ |
| V — Datos | Migración con cambios de restricciones y backfill; sin tablas nuevas | ✅ |
| VI — Tiempo real | Cambios de miembros y capacidades emiten por `ITenantNotificador` (ya existe), desde el caso de uso | ✅ |
| VII — Auth | Invitar y cancelar **no pasan por la API de Better-Auth**: esa API rechaza los roles de VENDORA (research §1). Aceptar la invitación sigue siendo de Better-Auth | ✅ justificado |
| VIII — Testing | Unit con fakes para cada caso de uso con reglas; contrato para las 26 | ✅ |
| IX — Convenciones | Errores de dominio en `tenant.errors.ts`, mapeados a HTTP en el adaptador | ✅ |

**Resultado**: sin violaciones. Re-check post-diseño: sin cambios.

## Project Structure

### Documentation (this feature)

```text
specs/026-configuracion-tenant-api/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/configuracion-tenant.md
├── checklists/requirements.md
└── tasks.md            # /speckit-tasks
```

### Source Code

```text
prisma/
├── 10-tenant.prisma                                   # Propietario.userId sin @unique; EquipoDeTrabajo.telefono/domicilio opcionales
└── migrations/<ts>_configuracion_tenant/migration.sql # + backfill de propietarios

src/modules/tenant/
├── domain/
│   ├── tenant.errors.ts                               # + errores de esta feature
│   ├── lista-ordenada.ts                              # NUEVO — validar reordenamiento (puro)
│   ├── roles-por-vertical.ts                          # NUEVO — roles asignables según verticales activas
│   ├── capacidades.ts                                 # NUEVO — regla "al menos una vertical activa"
│   └── ports/
│       ├── IListaOrdenadaRepository.ts                # NUEVO — descripciones, imágenes, equipo
│       ├── ILocalizacionRepository.ts                 # NUEVO
│       ├── IPropietarioRepository.ts                  # NUEVO
│       ├── IMiembrosRepository.ts                     # NUEVO — miembros + invitaciones + sesiones
│       ├── INotificadorInvitacion.ts                  # NUEVO — envío del correo
│       └── IActivadorVertical.ts                      # NUEVO — puerto que registran las verticales
├── application/configuracion/
│   ├── lista-ordenada.usecases.ts                     # listar, crear, editar, borrar, reordenar
│   ├── localizaciones.usecases.ts
│   ├── propietario.usecases.ts
│   ├── invitar-miembro.usecase.ts
│   ├── cancelar-invitacion.usecase.ts
│   ├── cambiar-rol-miembro.usecase.ts
│   ├── quitar-miembro.usecase.ts
│   └── capacidades.usecases.ts
├── infrastructure/
│   ├── descripcion.prisma.repository.ts               # + imagen, equipo (mapean campos del contrato)
│   ├── imagen-local.prisma.repository.ts
│   ├── equipo.prisma.repository.ts
│   ├── localizacion.prisma.repository.ts
│   ├── propietario.prisma.repository.ts
│   ├── miembros.prisma.repository.ts
│   ├── resend.notificador-invitacion.ts
│   └── activador-vertical.provider.ts
└── adapters/
    ├── configuracion.schema.ts                        # NUEVO — Zod de entrada/salida (nombres del frontend)
    ├── configuracion-contenido.rest.ts                # descripciones, imágenes, equipo
    ├── configuracion-negocio.rest.ts                  # localizaciones, propietario, capacidades
    └── configuracion-miembros.rest.ts                 # miembros e invitaciones (+ alinear los 2 GET de tenant.rest.ts)

src/modules/{tienda,consultorio,restaurante}/infrastructure/
└── *.activador-vertical.ts                            # NUEVO — implementan IActivadorVertical con sus casos de uso existentes

src/server/index.ts                                    # montar routers + registrar activadores

tests/
├── unit/modules/tenant/configuracion/*.test.ts
└── integration/configuracion-tenant-contrato.test.ts
```

**Structure Decision**: todo en el módulo `tenant` (núcleo), con tres routers por
afinidad. Las verticales solo aportan su implementación de `IActivadorVertical`.

## Complexity Tracking

| Desvío | Por qué | Alternativa descartada |
|---|---|---|
| Invitar y cancelar escriben en `Invitacion` con casos de uso propios, no con `auth.api.createInvitation` | Better-Auth valida el rol contra `owner/admin/member` y los permisos contra el rol del que invita; con `PROPIETARIO`, `VENDEDOR`, etc. responde `ROLE_NOT_FOUND`/`FORBIDDEN` (research §1) | Declarar los 9 roles en la config de Better-Auth con su access control: cambia la autorización de todos los endpoints `/api/auth/organization/*` y excede esta feature |
| Quitar un miembro limpia `activeOrganizationId` de sus sesiones | `requireTenantActivo` no verifica la membresía: sin esto, un miembro quitado sigue entrando hasta que expire su sesión (research §2) | Agregar `resolverMiembroActivo` a todos los routers: correcto, pero toca todo el backend; queda como recomendación |
