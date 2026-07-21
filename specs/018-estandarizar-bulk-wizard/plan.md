# Implementation Plan: Estandarización de los Procesos BULK del Wizard de Tenant

**Branch**: `018-estandarizar-bulk-wizard` | **Date**: 2026-07-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/018-estandarizar-bulk-wizard/spec.md`

## Summary

Nueve endpoints `POST .../bulk` de `wizard.rest.ts` gestionan la selección múltiple de cada paso del wizard de creación de tenant (actividades económicas, productos, servicios médicos, proveedores, turnos de atención, seguros, especialidades, tipos de cocina, zonas), más la sincronización de `PuntosDeVenta` vía `PATCH /config`. La auditoría (`research.md`) encontró que **solo `PuntosDeVenta` implementa hoy el patrón correcto** (crear lo que falta + eliminar solo lo que no tiene datos dependientes). El resto está en tres estados distintos: dos endpoints (`actividades-economicas/bulk`, `turnos/bulk`) ya eliminan lo deseleccionado pero **sin protección — y por el `onDelete: Cascade` del schema, esto ya borra ventas/productos reales hoy en producción**; `proveedores/bulk` elimina sin protección y puede romper la transacción completa por una FK `NO ACTION`; `catalogo/productos/bulk` y `catalogo/servicios/bulk` **nunca eliminan nada** (el bug reportado); y los 4 endpoints de arrays JSON (`seguros`, `especialidades`, `categorias`, `zonas`) ya son reemplazo total seguro y no requieren cambio de lógica, solo exponer su estado vía `GET`.

El plan extiende a los 5 endpoints con `remove` real (`ActividadEconomica`, `Producto`, `ServicioMedico`, `Proveedor`, `TurnosDeAtencion`) el mismo patrón ya construido para `PuntosDeVenta`, con el criterio de "dato dependiente" propio de cada entidad (`data-model.md`), y agrega los `GET` faltantes (`servicios-seleccionados` nuevo, extensión de `GET /config` para seguros/especialidades/tipos de cocina/zonas) para que el wizard pueda reconstruir cualquier paso al regresar a él.

## Technical Context

**Language/Version**: TypeScript (modo `strict`) · Node.js LTS ≥ 20
**Primary Dependencies**: Hono + `@hono/zod-openapi`, Prisma 7 (`multiSchema`), Zod
**Storage**: PostgreSQL vía Prisma — sin cambios de schema; solo cambia la lógica de sincronización sobre tablas existentes (`ActividadEconomica`, `Producto`, `ServicioMedico`, `Proveedor`, `TurnosDeAtencion`, `PuntosDeVenta`, y los campos JSON `Consultorio.contactoPublico`/`especialidades`, `Restaurante.contactoPublico`)
**Testing**: Vitest — tests de integración por endpoint bulk siguiendo el patrón ya usado en el repo (Testcontainers PostgreSQL real)
**Target Platform**: Servidor Render (mismo backend existente)
**Project Type**: Web service (API REST) — cambio contenido en `src/modules/tenant/adapters/wizard.rest.ts` y, para `Producto`, en `src/modules/catalogo/application/producto/`
**Performance Goals**: N/A — mismo volumen de datos que el wizard ya maneja (decenas de ítems por paso, no miles)
**Constraints**: `npx tsc --noEmit` → 0 errores; no se modifica el schema Prisma; no se cambia la forma de request/response de los endpoints existentes (solo su comportamiento de `remove`), para no romper el frontend ya integrado
**Scale/Scope**: 5 endpoints a corregir (agregar/ajustar `remove` + protección), 4 endpoints sin cambio de lógica, 1 endpoint nuevo (`GET /catalogo/servicios-seleccionados`), 1 endpoint extendido (`GET /config`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Artículo | Criterio | Estado |
|----------|----------|--------|
| **I — Stack** | Hono + `@hono/zod-openapi`, Prisma, Zod — sin introducir dependencias nuevas | ✅ Cumple |
| **II.1 — Monolito modular** | No se agrega vertical ni módulo nuevo; se ajusta lógica dentro de módulos existentes (`tenant`, `catalogo`) | ✅ Cumple |
| **II.2 — Hexagonal (Ports & Adapters)** | Para `Producto`, la lógica de sincronización se agrega en `application/` (extiende el patrón ya usado por `AltaMasivaProductosUseCase`), reutilizando `ProductoPrismaRepository`. Para `ActividadEconomica`, `ServicioMedico`, `Proveedor`, `TurnosDeAtencion`, la lógica queda en `wizard.rest.ts` (adaptador), replicando el patrón ya usado para `PuntosDeVenta` en el mismo archivo | ⚠️ Desviación parcial — ver Complexity Tracking |
| **II.3 — Transport-agnostic** | No aplica cambio: la orquestación del wizard es intrínsecamente multi-módulo y ya vive en el adaptador | ⚠️ Ver Complexity Tracking |
| **III.3 — Prisma scopeado** | Todas las queries nuevas filtran por `tenantId` (o `consultorioId`/`restauranteId` derivados del tenant), igual que el código existente que se extiende | ✅ Cumple |
| **VIII.3 — Validación en el borde** | Los `body` de los endpoints ya existentes no cambian de forma; se mantiene la validación Zod ya presente en cada `createRoute` | ✅ Cumple |
| **IX.3 — Errores de dominio** | La protección de datos dependientes NO es un error de negocio (no se lanza excepción) — es el mismo comportamiento silencioso ya implementado para `PuntosDeVenta`; consistente con el criterio ya aceptado en ese precedente | ✅ Cumple (por precedente) |
| **IX.4 — Sin lógica en adaptadores** | `wizard.rest.ts` ya contiene lógica de negocio significativa en sus 9 endpoints bulk (esto es preexistente a esta feature, no introducido por ella) | ⚠️ Desviación preexistente — ver Complexity Tracking |

**Resultado**: Sin violaciones nuevas introducidas por esta feature. Existe una desviación **preexistente** de II.2/II.3/IX.4 en `wizard.rest.ts` (todo el archivo, no solo los endpoints bulk) que esta feature **extiende consistentemente** en vez de corregir de raíz — justificación en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/018-estandarizar-bulk-wizard/
├── plan.md              # Este archivo
├── research.md          # Fase 0 — auditoría de los 9 endpoints + hallazgo de severidad
├── data-model.md         # Fase 1 — criterio de "dato dependiente" por entidad
├── contracts/
│   └── wizard-bulk-endpoints.md   # Fase 1 — contrato de comportamiento estandarizado
└── quickstart.md         # Fase 1 — guía de validación manual
```

### Source Code (repository root)

```text
src/modules/tenant/adapters/
└── wizard.rest.ts                          # 5 endpoints bulk a corregir + 1 GET nuevo + GET /config extendido

src/modules/catalogo/application/producto/
├── alta-masiva-productos.usecase.ts        # ya existe — cubre el "agregar"
└── sincronizar-productos-usecase.ts        # NUEVO — cubre "agregar + quitar protegido" para el paso wizard de Productos

src/modules/catalogo/infrastructure/
└── producto.prisma.repository.ts           # se reutiliza (o extiende con un método de conteo de uso) para el criterio "dato dependiente" de Producto

tests/integration/
└── wizard-bulk.test.ts                     # NUEVO — cubre los 9 endpoints con el patrón agregar → quitar → reenviar de quickstart.md
```

**Structure Decision**: Se mantiene la estructura existente. Para `Producto` (el caso reportado y el de mayor radio de impacto por cascada), la lógica de sincronización se agrega como un nuevo caso de uso en `catalogo/application/`, consistente con que ese módulo ya tiene arquitectura hexagonal completa. Para las 4 entidades restantes con `remove` (`ActividadEconomica`, `ServicioMedico`, `Proveedor`, `TurnosDeAtencion`), la lógica se agrega directamente en `wizard.rest.ts`, replicando el patrón ya establecido ahí mismo para `PuntosDeVenta` — introducir 4 módulos de aplicación nuevos solo para este ajuste sería una refactorización desproporcionada frente al problema que se está resolviendo (ver Complexity Tracking).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| `wizard.rest.ts` mezcla lógica de negocio (diffs de sincronización, transacciones Prisma, protección de datos dependientes) directamente en el adaptador REST, para `ActividadEconomica`, `ServicioMedico`, `Proveedor` y `TurnosDeAtencion` (Artículo II.2/II.3/IX.4) | El wizard orquesta pasos que cruzan 5+ módulos distintos (`catalogo`, `consultorio`, `ventas`, `tienda`, `restaurante`) en una sola pantalla de alta de tenant; ya es así desde que el wizard existe (commit `669e39e`), incluyendo el precedente de `PuntosDeVenta` que esta feature toma como referencia. Corregirlo de raíz significaría crear un caso de uso de aplicación por cada una de las 4 entidades restantes, cada uno usado por un único endpoint del wizard, sin otro consumidor — puro movimiento de código sin beneficio de reutilización | Crear 4 módulos/casos de uso de aplicación nuevos solo para mover código que hoy vive en un único lugar (el propio wizard) y que no se reutiliza desde ningún otro adaptador introduciría más superficie e indirección que la que resuelve, y además dejaría el archivo en un estado híbrido inconsistente (algunos pasos con lógica en el adaptador, otros no) sin corregir el resto del archivo (`GET /config`, `PATCH /config`, actividades, etc., que igual seguirían con lógica en el adaptador). Se prefiere extender el patrón ya aceptado en el archivo (visible en `PuntosDeVenta`) de forma uniforme, y dejar la refactorización arquitectónica completa de `wizard.rest.ts` como una iniciativa aparte si se decide abordarla |
| `Producto` sí recibe un caso de uso de aplicación nuevo (`sincronizar-productos-usecase.ts`) mientras las otras 4 entidades no | Inconsistencia interna aceptada deliberadamente | `catalogo` ya es un módulo con arquitectura hexagonal completa y `AltaMasivaProductosUseCase` ya vive en `application/`; agregar el `remove` fuera de esa capa, solo para este caso, rompería la consistencia interna del módulo `catalogo` (que sí se usa desde múltiples adaptadores, no solo el wizard) más de lo que la respetaría |
