# Specification Analysis Report

**Feature**: `001-auth-multitenancy`
**Analyzed**: 2026-05-21
**Artifacts**: spec.md · plan.md · tasks.md · constitution v1.5.1

---

## Findings

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| **C1** | Coverage Gap | **CRITICAL** | spec.md FR-031, tasks.md | FR-031 (eliminación de cuenta con cascade condicional) tiene **cero cobertura de tasks**. No hay endpoint en auth-rest.md, ni hook, ni use case. La regla "solo si es el único propietario → cascade del tenant" requiere lógica custom; BA no la implementa nativamente. | Agregar task en US1 o Phase 2: custom handler `DELETE /api/auth/user` que verifica si es único propietario antes de delegar a BA. Si BA lo soporta via admin plugin, documentarlo explícitamente. |
| **H1** | Inconsistency | **HIGH** | tasks.md T022–T024, T047 | Los hooks `onOrganizationCreated/Updated/Deleted` (T022–T024, Phase 4) invocan `notificador.xxx()` pero `TenantSocketNotificador` no existe hasta T044 (Phase 7). No hay task para crear un **stub del notificador** en las fases intermedias. El código de US2 no compilará sin una implementación concreta de `ITenantNotificador`. | Agregar task temprana (antes de T022): crear `NullTenantNotificador` (implementación no-op de `ITenantNotificador`) usada por defecto hasta que US5 crea la implementación real. Reemplazar en T047. |
| **H2** | Underspecification | **HIGH** | spec.md FR-026, FR-027, FR-028, tasks.md | Los requisitos de "único propietario" no tienen cobertura de tasks: (a) FR-026: ¿BA bloquea que el único propietario se elimine a sí mismo como miembro? (b) FR-027: ¿BA valida el mismo guard al salir voluntariamente? (c) FR-028: ¿El guard "solo propietario puede eliminar org" es nativo en BA o requiere middleware custom? Ningún task lo verifica. | Investigar comportamiento nativo de BA Organization plugin para estos casos. Agregar task en US3: "verificar y/o implementar guards de sole-owner en better-auth.setup.ts para leave/remove/delete-org". |
| **M1** | Constitution Conflict | **MEDIUM** | constitution Art.III.3, tasks.md T021 vs T035 | Artículo III.3 es NO-NEGOCIABLE: "las queries usan un cliente Prisma extendido." El repositorio se construye en Phase 4 (T021) sin scope; el Prisma scoped client llega en Phase 6 (T035). Durante fases 4–5, las queries violan III.3 aunque sea temporalmente durante desarrollo. | Mover T035 (`prisma-scoped.ts`) a Phase 2 Foundational. El repositorio puede construirse con la interfaz del cliente como parámetro desde el inicio, recibiendo `prismaStandard` en US2 y `prismaScoped` en US4. |
| **M2** | Constitution Conflict | **MEDIUM** | constitution Art.VI.2, research.md, tasks.md T022–T024 | Artículo VI.2: "Los eventos se emiten DENTRO del caso de uso (vía el puerto Notificador), NO en el adaptador." Los hooks de BA viven en `infrastructure/better-auth.setup.ts` — capa de infraestructura, no `application/`. La decisión está justificada en research.md pero no registrada como excepción constitucional formal en la constitución. | Agregar una nota de "Excepción justificada" en la constitución o en plan.md Complexity Tracking, reconociendo que los hooks de BA son el equivalente funcional de los casos de uso para este módulo. |
| **M3** | Inconsistency | **MEDIUM** | plan.md, tasks.md T037, spec.md | Terminología dual: `"owner"` (rol asignado por BA al crear org) vs `"PROPIETARIO"` (rol de dominio en spec). Aparece en plan.md notas de implementación, T037 (`requireRol(["PROPIETARIO", "owner"])`), y edge cases de spec. Sin convención documentada, futuras verticales podrían usar cualquiera. | Definir en un comentario de `hono-context.ts` o en `autenticacion.errors.ts` la equivalencia canónica: `"owner" === "PROPIETARIO"`. Considerar normalizar a `"PROPIETARIO"` en la extensión Prisma al leer el rol. |
| **M4** | Ambiguity | **MEDIUM** | tasks.md T030, contracts/tenant-rest.md | El use case se llama `listar-invitaciones-**pendientes**.usecase.ts` pero el endpoint `GET /api/tenant/invitaciones` filtra por todos los estados (pending/accepted/rejected/canceled). El nombre sugiere filtrado fijo; la implementación es paramétrica. | Renombrar a `listar-invitaciones.usecase.ts`. Actualizar T030, T031, T032 en tasks.md. |
| **M5** | Coverage Gap | **MEDIUM** | spec.md US4 Scenario 3, tasks.md | "Al cerrar y reabrir sesión, el tenant activo se restaura." BA crea una sesión NUEVA al re-autenticarse; `activeOrganizationId` puede no persistir entre sesiones. No hay task que verifique ni implemente esta persistencia. | Investigar si BA persiste `activeOrganizationId` entre sesiones o si el cliente debe re-establecerlo. Si no persiste, agregar un task: "al crear sesión, restaurar `activeOrganizationId` del último miembro activo vía hook `onSessionCreated`." |
| **M6** | Ambiguity | **MEDIUM** | spec.md FR-030 | FR-030: "espera creciente (ej. 5 s, 15 s, 60 s)". El prefijo "ej." lo hace un ejemplo, no una especificación. BA `rateLimit` soporta `window`/`max` pero no una progresión de backoff creciente nativa; devuelve `429 + Retry-After` con el tiempo restante de la ventana. | Especificar en FR-030: "BA retorna 429 + `Retry-After`; el cliente implementa el backoff creciente." O agregar un task de middleware Redis que trackee intentos y calcule el delay creciente servidor-side. |
| **M7** | Underspecification | **MEDIUM** | spec.md FR-012, tasks.md | FR-012 cubre activar/desactivar capability flags. Los flags son `additionalFields` del plugin Organization de BA. No hay task que verifique que `PATCH /api/auth/organization/update` acepta y persiste estos campos custom. | Agregar task en US2: "verificar que `PATCH /api/auth/organization/update` acepta `esTienda`, `esConsultorio`, `esRestaurante` vía BA additionalFields config y validar con curl." |
| **M8** | Coverage Gap | **MEDIUM** | spec.md SC-002, SC-003, SC-006, tasks.md | SC-002 (login < 3 s), SC-003 (crear tenant < 3 s), SC-006 (eventos < 2 s) son criterios de éxito medibles sin tasks de benchmark, pruebas de carga ni medición de latencia. | Agregar tasks en Phase 8 Polish: "medir latencia de sign-in con `autocannon`/`k6`" y "medir latencia Socket.IO con cliente de prueba." |
| **L1** | Coverage Gap | **LOW** | tasks.md, contracts/auth-rest.md | FR-008, FR-013, FR-021, FR-028 cubiertos implícitamente por BA vía T009. Sin nota en tasks.md, un lector aislado no lo descubre. | Agregar nota en T009: "cubre implícitamente FR-008, FR-013, FR-021, FR-028 vía los endpoints de `contracts/auth-rest.md`." |
| **L2** | Inconsistency | **LOW** | spec.md FR-025, tasks.md T033–T034 | FR-025 define eventos para creado/actualizado/eliminado del tenant. T033 y T034 agregan `tenant:miembro:unido` y `tenant:miembro:removido` no mencionados en FR-025. La implementación excede el scope del FR sin enmienda. | Actualizar FR-025 en spec.md para incluir los eventos de membresía. |
| **L3** | Ambiguity | **LOW** | spec.md FR-011 | "solo caracteres válidos para URLs" no especifica regex exacto (¿mayúsculas? ¿guiones bajos? ¿solo a-z0-9-?). | Especificar en spec o en `tenant.schema.ts`: `slug: z.string().regex(/^[a-z0-9-]+$/)`. |
| **L4** | Ambiguity | **LOW** | spec.md SC-001 | SC-001 incluye verificación de email en el SLA de 5 minutos, que depende de la latencia de entrega de Resend (servicio externo) — métrica no 100% controlable. | Reformular: "registro e inicio de sesión (excluida espera de email) en < 1 minuto; flujo completo típicamente < 5 minutos." |

---

## Coverage Summary

### Functional Requirements

| Requirement | ¿Tiene task? | Task IDs | Notas |
|-------------|-------------|----------|-------|
| FR-001 | ✅ | T008, T009, T012 | |
| FR-002 | ✅ | T012 | |
| FR-003 | ✅ | T008, T012 | |
| FR-004 | ✅ | T008, T009 | |
| FR-005 | ✅ | T009, T014 | |
| FR-006 | ✅ | T008, T009, T010 | |
| FR-007 | ✅ | T013 | |
| FR-008 | ⚠️ implícito | T009 | BA sign-out nativo; sin task explícita |
| FR-009 | ✅ | T017, T025, T028 | |
| FR-010 | ✅ | T022 | |
| FR-011 | ⚠️ implícito | T008 (BA org plugin) | Sin task de verificación explícita |
| FR-012 | ⚠️ parcial | T017, T027 | Sin task que valide additionalFields en BA update |
| FR-013 | ⚠️ implícito | T009, T023 | BA PATCH org; sin task de verificación |
| FR-014 | ✅ | T009, T030, T032 | |
| FR-015 | ⚠️ implícito | T009 (BA invite email) | BA envía el email; sin tarea explícita |
| FR-016 | ✅ | T009, T033 | |
| FR-017 | ✅ | T026, T028 | |
| FR-018 | ⚠️ implícito | T009 (BA enforces) | Sin tarea de verificación |
| FR-019 | ✅ | T030, T031, T032 | |
| FR-020 | ✅ | T008, T036 | |
| FR-021 | ⚠️ implícito | T009 (BA set-active) | Sin tarea explícita |
| FR-022 | ✅ | T005, T035, T036, T042 | |
| FR-023 | ✅ | T035, T037, T038 | |
| FR-024 | ✅ | T035 | |
| FR-025 | ✅ | T020, T043–T048 | FR-025 no menciona eventos de membresía (ver L2) |
| FR-026 | ⚠️ parcial | T009, T037 | Sole-owner exception sin verificar (ver H2) |
| FR-027 | ⚠️ parcial | T009, T034 | Sole-owner constraint sin task (ver H2) |
| FR-028 | ⚠️ implícito | T009, T024 | Propietario-only guard sin task explícita (ver H2) |
| FR-029 | ✅ | T008 | |
| FR-030 | ⚠️ parcial | T015 | Backoff progresivo no implementable solo con BA rateLimit (ver M6) |
| FR-031 | ❌ | **ninguna** | **CRITICAL — ver C1** |

### Success Criteria con trabajo construible

| SC | ¿Tiene task? | Notas |
|----|-------------|-------|
| SC-005 (aislamiento 100%) | ✅ | T035–T038 (Prisma scoped + guards) |
| SC-002 (login < 3 s) | ❌ | Sin task de benchmark (ver M8) |
| SC-003 (tenant < 3 s) | ❌ | Sin task de benchmark (ver M8) |
| SC-006 (eventos < 2 s) | ❌ | Sin task de benchmark (ver M8) |

---

## Constitution Alignment Issues

| Artículo | Status | Detalle |
|----------|--------|---------|
| III.3 — Prisma scoped obligatorio | ⚠️ | Scoped client diferido a Phase 6; repo en Phase 4 opera sin scope temporalmente (M1) |
| VI.2 — Eventos desde capa de aplicación | ⚠️ | Hooks en infrastructure/ justificados en research.md pero sin excepción constitucional formal registrada (M2) |
| I, II, IV, V, VII, VIII, IX | ✅ | Sin conflictos detectados |

---

## Unmapped Tasks (sin FR directo)

T001–T003 (setup), T004 (generate Prisma), T006–T007 (server infra), T016, T029 (route registration), T049 (OpenAPI), T050 (logging), T051–T053 (test helpers, validación). Todos son infraestructura/cross-cutting correctamente ubicados en fases 1, 2 y 8.

---

## Metrics

| Métrica | Valor |
|---------|-------|
| Total FRs | 31 |
| Total User Stories | 5 |
| Total Success Criteria | 7 |
| Total Tasks | 53 |
| Cobertura FR (≥1 task explícita) | 20/31 = **65%** |
| Cobertura FR (incluyendo BA implícito) | 30/31 = **97%** |
| FRs con cero cobertura | **1** (FR-031) |
| FRs con cobertura parcial/ambigua | 7 |
| Issues CRITICAL | **1** |
| Issues HIGH | **2** |
| Issues MEDIUM | **8** |
| Issues LOW | **4** |

---

## Next Actions

### ⛔ Resolver antes de `/speckit-implement`

1. **C1 — FR-031**: Agregar task para "eliminar cuenta de usuario con cascade condicional de tenant." Investigar si BA admin plugin expone un endpoint de account deletion; si no, diseñar custom handler `DELETE /api/user` con verificación de sole-owner.
2. **H1 — Notificador stub**: Agregar task `T_NullNotificador` en Phase 2 o inicio de Phase 4 — crear `NullTenantNotificador` (no-op de `ITenantNotificador`) para que US2 compile sin Socket.IO. Reemplazar en T047.
3. **H2 — Sole-owner guards**: Clarificar qué aplica BA nativamente y qué requiere middleware custom para FR-026, FR-027, FR-028. Agregar task de verificación/implementación en US3.

### ✅ Opcionales (pueden resolverse post-MVP)

- **M1**: Mover `prisma-scoped.ts` a Phase 2 para alinear con Artículo III.3.
- **M2**: Registrar excepción constitucional de hooks BA en plan.md Complexity Tracking.
- **M4**: Renombrar `listar-invitaciones-pendientes.usecase.ts` → `listar-invitaciones.usecase.ts`.
- **M6**: Especificar comportamiento exacto del backoff en FR-030.
- **M7**: Agregar task de verificación de additionalFields en BA para capability flags.
- **M8**: Agregar tasks de benchmark para SC-002, SC-003, SC-006 en Phase 8.
- **L2**: Actualizar FR-025 para incluir eventos de membresía (`miembro:unido`, `miembro:removido`).
