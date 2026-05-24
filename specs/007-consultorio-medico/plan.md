# Implementation Plan: Módulo de Consultorio Médico

**Branch**: `007-consultorio-medico` | **Date**: 2026-05-24 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/007-consultorio-medico/spec.md`

## Summary

Completar la implementación del módulo `src/modules/consultorio/` para la vertical TuConsultorio de VENDORA. El modelo de datos ya está definido en `prisma/60-consultorio.prisma` (Prisma 7, schema `consultorio`) y la arquitectura hexagonal del módulo está parcialmente implementada. El plan cubre los 8 gaps identificados en la investigación: vacunaciones, DNI de paciente, canal de notificación, cobro→venta unificada, bloqueo optimista, audit trail HIPAA, corrección de violaciones de la Constitución (Art. VI.2), y un job BullMQ para expirar recetas.

## Technical Context

**Language/Version**: TypeScript strict · Node.js LTS ≥ 20  
**Primary Dependencies**: Hono + `@hono/zod-openapi` · Prisma 7 (multiSchema) · Socket.IO + Redis adapter · BullMQ · Better-Auth · Zod · Vitest + Testcontainers · Pino · Resend · Cloudflare R2  
**Storage**: PostgreSQL — schemas `tenant` (Consultorio model) + `consultorio` (todos los demás modelos)  
**Testing**: Vitest — domain/application con repositorios en memoria; infrastructure con Testcontainers PostgreSQL  
**Target Platform**: Render (serverful) — Web Service + Background Worker  
**Project Type**: Módulo vertical de monolito modular hexagonal  
**Performance Goals**: Agenda en tiempo real < 3s latencia (SC-003) · Expediente clínico < 5s (SC-005)  
**Constraints**: Compliance HIPAA-equivalente — audit trail de lecturas, cifrado en reposo (infraestructura), bloqueo optimista en registros médicos  
**Scale/Scope**: Un consultorio por tenant · N médicos · N pacientes · N citas concurrentes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Artículo | Verifica | Estado |
|----------|----------|--------|
| I — Stack | Node.js + TS strict + Hono + Prisma 7 + Socket.IO + BullMQ + Redis + Better-Auth + Zod + Vitest + Testcontainers | ✅ Pass |
| II.1 — Monolito modular | Módulo `consultorio` en `src/modules/consultorio/` con estructura hexagonal, sin microservicios | ✅ Pass |
| II.2 — Hexagonal | `domain/` sin imports de infra · `application/` solo conoce puertos · `infrastructure/` implementa puertos · `adapters/` delgados | ✅ Pass |
| II.3 — Agnóstico transporte | Los casos de uso deben ejecutarse desde REST o BullMQ sin cambios | ⚠️ **Violación parcial** → `CrearAtencionUseCase` y `CrearHistoriaUseCase` no inyectan notificador (ver Decision 7 en research.md) |
| III.1 — Aislamiento tenant | Todas las queries filtran por `consultorioId` (scoped Prisma client) | ✅ Pass |
| III.4 — Guard capability | `requireConsultorio` guard ya implementado en `consultorio-router.ts` | ✅ Pass |
| IV — Queries parametrizables | Listas usan `toPrismaArgs` de `core/query-params.ts`; vacunaciones debe seguir el mismo patrón | ✅ Pass (vacunaciones pendiente) |
| V.2 — Nomenclatura | Schema `consultorio` en español; modelos en español | ✅ Pass |
| V.3 — Auditoría | `createdById`/`updatedById` en todas las tablas principales | ✅ Pass |
| VI.1 — Broadcast tenant | Eventos emitidos a `tenant:${tenantId}` vía Socket.IO | ✅ Pass |
| VI.2 — Eventos desde application | `CrearAtencion` y `CrearHistoria` no emiten eventos | ❌ **Violación** → debe corregirse |
| VI.3 — Eventos tipados | Contrato `ConsultorioServerToClientEvents` en `contracts/rest-api.md` | Pendiente implementar |
| VII.2 — Roles consultorio | `ADMIN | MEDICO | RECEPCIONISTA` (mapean a Admin, Médico, Staff del spec) | ✅ Pass |
| VIII.1 — Domain tests sin infra | Use cases testean con repos en memoria | Pendiente (no hay tests aún) |
| VIII.2 — Integration tests | Repositories testean contra PostgreSQL real via Testcontainers | Pendiente |
| IX.1 — Idioma español | Código de dominio en español | ✅ Pass |
| IX.4 — Sin lógica en adapters | Adapters: validar → caso de uso → formatear | ✅ Pass |

**Violaciones a corregir (obligatorio antes de merge):**
1. `CrearAtencionUseCase` — agregar `IConsultorioNotificador` e invocar `atencionCambiada` post-creación
2. `CrearHistoriaUseCase` — agregar `IConsultorioNotificador` e invocar `historiaCreada` post-creación

## Project Structure

### Documentation (this feature)

```text
specs/007-consultorio-medico/
├── plan.md              ← este archivo
├── research.md          ← decisiones de los 8 gaps identificados
├── data-model.md        ← modelo de datos completo con invariantes
├── contracts/
│   └── rest-api.md      ← endpoints REST + eventos Socket.IO + errores
└── tasks.md             ← generado por /speckit-tasks (pendiente)
```

### Source Code (repository root)

```text
prisma/
├── 10-tenant.prisma     ← Consultorio model (schema: tenant) — ya existe
└── 60-consultorio.prisma  ← todos los demás modelos — ya existe
                            CAMBIOS PENDIENTES:
                            • Paciente: + dni String?, @@unique([consultorioId,dni])
                            • Paciente: + canalNotificacion String?
                            • Nuevo model AuditoriaAcceso

src/modules/consultorio/
├── domain/
│   ├── consultorio.entity.ts       ✅
│   ├── medico.entity.ts            ✅
│   ├── paciente.entity.ts          🔧 agregar: dni, canalNotificacion
│   ├── servicio-medico.entity.ts   ✅
│   ├── cita.entity.ts              ✅
│   ├── historia-clinica.entity.ts  ✅
│   ├── atencion-medica.entity.ts   ✅
│   ├── receta-medica.entity.ts     ✅
│   ├── vacunacion.entity.ts        ❌ NUEVO
│   ├── consultorio.errors.ts       🔧 agregar: DNIYaRegistrado, ConflictoVersionError
│   └── ports/
│       ├── IConsultorioRepository.ts      ✅
│       ├── IMedicoRepository.ts           ✅
│       ├── IPacienteRepository.ts         ✅
│       ├── IServicioMedicoRepository.ts   ✅
│       ├── ICitaRepository.ts             ✅
│       ├── IHistoriaClinicaRepository.ts  ✅
│       ├── IAtencionMedicaRepository.ts   ✅
│       ├── IRecetaMedicaRepository.ts     ✅
│       ├── IVacunacionRepository.ts       ❌ NUEVO
│       ├── IVentaService.ts               ❌ NUEVO (cross-module port)
│       └── IConsultorioNotificador.ts     🔧 agregar: historiaCreada
│
├── application/
│   ├── consultorio/           ✅
│   ├── medico/                ✅
│   ├── paciente/              🔧 crear-paciente y actualizar-paciente: soporte DNI
│   ├── servicio-medico/       ✅
│   ├── cita/
│   │   ├── crear-cita.usecase.ts          ✅
│   │   ├── listar-citas.usecase.ts        ✅
│   │   ├── obtener-cita.usecase.ts        ✅
│   │   ├── confirmar-cita.usecase.ts      🔧 + bloqueo optimista (expectedUpdatedAt)
│   │   ├── cancelar-cita.usecase.ts       🔧 + bloqueo optimista
│   │   └── marcar-no-asistio.usecase.ts   ✅
│   ├── historia-clinica/
│   │   ├── crear-historia.usecase.ts      🔧 + inyectar IConsultorioNotificador (Art. VI.2)
│   │   ├── listar-historias.usecase.ts    ✅
│   │   ├── obtener-historia.usecase.ts    🔧 + audit log de lectura
│   │   ├── actualizar-historia.usecase.ts 🔧 + bloqueo optimista
│   │   ├── upsert-extension.usecase.ts    ✅
│   │   └── adjuntar-archivo.usecase.ts    ✅
│   ├── atencion-medica/
│   │   ├── crear-atencion.usecase.ts      🔧 + inyectar IConsultorioNotificador (Art. VI.2)
│   │   ├── listar-atenciones.usecase.ts   ✅
│   │   ├── obtener-atencion.usecase.ts    ✅
│   │   ├── registrar-pago.usecase.ts      🔧 + crear venta via IVentaService
│   │   └── anular-atencion.usecase.ts     ✅
│   ├── receta-medica/
│   │   ├── crear-receta.usecase.ts        ✅
│   │   ├── listar-recetas.usecase.ts      ✅
│   │   ├── obtener-receta.usecase.ts      🔧 + audit log de lectura
│   │   └── anular-receta.usecase.ts       ✅
│   └── vacunacion/            ❌ NUEVO (crear, listar, eliminar)
│
├── infrastructure/
│   ├── consultorio.prisma.repository.ts          ✅
│   ├── medico.prisma.repository.ts               ✅
│   ├── paciente.prisma.repository.ts             🔧 soporte DNI + canalNotificacion
│   ├── servicio-medico.prisma.repository.ts      ✅
│   ├── cita.prisma.repository.ts                 ✅
│   ├── historia-clinica.prisma.repository.ts     🔧 + audit log en obtener()
│   ├── atencion-medica.prisma.repository.ts      ✅
│   ├── receta-medica.prisma.repository.ts        🔧 + audit log en obtener()
│   ├── vacunacion.prisma.repository.ts           ❌ NUEVO
│   ├── auditoria-acceso.prisma.repository.ts     ❌ NUEVO
│   ├── venta.service.adapter.ts                  ❌ NUEVO (implementa IVentaService)
│   ├── consultorio.socket.notificador.ts         🔧 agregar historiaCreada
│   ├── null-consultorio.notificador.ts            🔧 agregar historiaCreada (no-op)
│   └── consultorio.notificador.provider.ts       ✅
│
├── adapters/
│   ├── consultorio-router.ts   🔧 registrar vacunacion router
│   ├── consultorio.rest.ts     ✅
│   ├── medico.rest.ts          ✅
│   ├── paciente.rest.ts        🔧 incluir dni + canalNotificacion
│   ├── servicio-medico.rest.ts ✅
│   ├── cita.rest.ts            🔧 incluir expectedUpdatedAt en confirmar/cancelar
│   ├── historia-clinica.rest.ts 🔧 incluir expectedUpdatedAt en update
│   ├── atencion-medica.rest.ts 🔧 incluir caja context en registrar-pago
│   ├── receta-medica.rest.ts   ✅
│   ├── vacunacion.rest.ts      ❌ NUEVO
│   └── consultorio.schema.ts  🔧 actualizar schemas Zod para dni, canalNotificacion, bloqueo opt.

src/workers/
├── recordatorio-cita.worker.ts   🔧 usar canalNotificacion del paciente
└── expirar-recetas.worker.ts     ❌ NUEVO (job diario para transición VENCIDA)

src/core/
└── recordatorios.queue.ts   🔧 agregar queue para expirar-recetas

tests/consultorio/
├── unit/
│   ├── crear-cita.usecase.test.ts        ❌ NUEVO
│   ├── confirmar-cita.usecase.test.ts    ❌ NUEVO (incluye bloqueo optimista)
│   ├── registrar-pago.usecase.test.ts    ❌ NUEVO (incluye crear-venta integration)
│   └── crear-paciente.usecase.test.ts    ❌ NUEVO (incluye DNI único)
└── integration/
    ├── cita.prisma.repository.test.ts    ❌ NUEVO
    └── paciente.prisma.repository.test.ts ❌ NUEVO
```

## Complexity Tracking

| Decisión | Justificación | Alternativa Rechazada |
|----------|--------------|----------------------|
| `IVentaService` port cross-módulo | Consultorio debe crear ventas en el módulo ventas sin acoplar dominios | Llamada directa de use case a use case (viola fronteras hexagonales) |
| `AuditoriaAcceso` tabla separada | HIPAA requiere queries de auditoría por recurso/usuario/fecha | Logs Pino (no consultables estructuradamente por recurso médico) |
| `updatedAt` como token optimista | Todos los modelos ya tienen `updatedAt`; no requiere schema change adicional | Campo `version: Int` (más semántico pero agrega columna y migración innecesaria) |

---

## Implementation Roadmap

### Sprint 1 — Schema + Gaps Críticos (Fundación)

**Prioridad**: Estas tareas desbloquean todo lo demás.

1. **Schema Prisma changes** — agregar `dni`, `canalNotificacion` a Paciente + modelo `AuditoriaAcceso` → correr `prisma migrate dev`
2. **Corrección Art. VI.2** — inyectar `IConsultorioNotificador` en `CrearAtencionUseCase` y `CrearHistoriaUseCase`
3. **DNI en Paciente** — actualizar entity + port + repository + adapter + schema Zod + error `DNIYaRegistrado`
4. **Canal de notificación** — actualizar Paciente entity/adapter + worker BullMQ

### Sprint 2 — Vacunaciones + Bloqueo Optimista

5. **Vacunaciones** — entity + port + repository + use cases + adapter REST + registrar en router
6. **Bloqueo optimista** — `ConflictoVersionError` + lógica en confirmar-cita, cancelar-cita, actualizar-historia + adapters

### Sprint 3 — Cobro → Venta + Audit Trail

7. **IVentaService port** — domain port + adaptador de implementación (`venta.service.adapter.ts`) + integración en `RegistrarPagoUseCase`
8. **AuditoriaAcceso** — repositorio + logging no-bloqueante en obtener-historia, obtener-receta, obtener-paciente + endpoint REST de consulta para ADMIN

### Sprint 4 — BullMQ + Eventos + Tests

9. **Expirar recetas** — worker BullMQ diario + queue en core
10. **historiaCreada** — agregar evento al contrato notificador + implementaciones + socket
11. **Tests unitarios** — crear-cita, confirmar-cita, registrar-pago, crear-paciente
12. **Tests integración** — cita.prisma.repository, paciente.prisma.repository

---

## Dependencies Between Tasks

```
Schema Prisma (1) → DNI Paciente (3) → Tests Paciente (12)
Schema Prisma (1) → AuditoriaAcceso (8)
IVentaService (7) → Tests RegistrarPago (11)
Corrección VI.2 (2) → historiaCreada (10)
Bloqueo optimista (6) → Tests confirmar-cita (11)
```
