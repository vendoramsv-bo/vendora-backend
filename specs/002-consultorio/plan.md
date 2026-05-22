# Implementation Plan: Módulo de Consultorio Médico

**Branch**: `002-consultorio` | **Date**: 2026-05-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/002-consultorio/spec.md`

## Summary

Módulo TuConsultorio: gestión clínica completa para tenants con `esConsultorio=true`.
Cubre perfil del consultorio, médicos con horarios, pacientes, servicios médicos,
citas con validación de solapamiento, historial clínico con 4 extensiones por especialidad,
atención médica (registro económico) con pagos parciales, y recetas médicas con posología.
Eventos Socket.IO en tiempo real para citas, atenciones y recetas.

Arquitectura hexagonal sobre los modelos Prisma pre-existentes en `prisma/60-consultorio.prisma`
y `prisma/10-tenant.prisma` (schema `consultorio` + `tenant`).

## Technical Context

**Language/Version**: TypeScript strict, Node.js LTS ≥ 20
**Primary Dependencies**: Hono + `@hono/zod-openapi`, Prisma 7, Better-Auth, Socket.IO, BullMQ, Resend, Zod v3, Pino
**Storage**: PostgreSQL — schemas `consultorio` (19 modelos) + `tenant.Consultorio` (1 modelo)
**Testing**: Vitest con fakes en memoria (repositorios), Testcontainers para integración
**Target Platform**: Render (serverful), Node.js server
**Project Type**: módulo adicional de monolito modular hexagonal
**Performance Goals**: p95 < 3s para operaciones de listado; p95 < 2s para eventos Socket.IO (SC-006)
**Constraints**: Aislamiento por tenant obligatorio; `esConsultorio` guard en todos los endpoints
**Scale/Scope**: ~10–500 citas/día por consultorio, 100–5000 pacientes

## Constitution Check

*Pre-design: PASS. Post-design: PASS.*

| Artículo | Verificación | Estado |
|----------|--------------|--------|
| I — Stack | Node.js/TS, Hono, Prisma 7, Socket.IO+Redis, Zod, BullMQ, Resend | ✅ PASS |
| II.1 — Módulo vertical | `src/modules/consultorio/` con estructura hexagonal, depende de core pero core no depende de consultorio | ✅ PASS |
| II.2 — Hexagonal | domain/application/infrastructure/adapters por módulo | ✅ PASS |
| II.3 — Agnóstico del transporte | Casos de uso ejecutables desde REST, BullMQ o test sin cambios | ✅ PASS |
| III.1 — Aislamiento | `consultorioId` en todo modelo; `crearPrismaScoped(tenantId, userId)` | ✅ PASS |
| III.2 — Tenant activo | `requireTenantActivo` + `requireConsultorio` en todos los endpoints | ✅ PASS |
| III.3 — Prisma scopeado | `withAudit()` y `withTenantScope()` de `core/prisma-scoped.ts` | ✅ PASS |
| III.4 — Guard capability | `requireConsultorio` middleware verifica `tenant.esConsultorio=true` | ✅ PASS |
| IV — Queries parametrizables | `makeQueryParamsSchema()` en todos los listados | ✅ PASS |
| V — Schema existente | schema `consultorio` pre-existente, sin nuevas migraciones | ✅ PASS |
| VI.2 — Eventos desde app | Emitidos via `IConsultorioNotificador` en casos de uso, no en adaptadores | ✅ PASS |
| VII.2 — Roles consultorio | PROPIETARIO/ADMIN/MEDICO/RECEPCIONISTA (ADMIN incluye PROPIETARIO por guard) | ✅ PASS |
| IX — Español | Código de dominio, variables, errores en español | ✅ PASS |

**Violations**: ninguna.

## Project Structure

### Documentation (this feature)

```text
specs/002-consultorio/
├── plan.md              # Este archivo
├── research.md          # Decisiones técnicas (overlap check, recordatorios, etc.)
├── data-model.md        # Referencia de los modelos Prisma pre-existentes
├── quickstart.md        # Escenarios de validación manual
├── contracts/
│   ├── consultorio-rest.md   # API REST completa
│   └── socket-events.md      # Eventos Socket.IO
└── tasks.md             # Generado por /speckit-tasks
```

### Source Code

```text
src/modules/consultorio/
├── domain/
│   ├── consultorio.entity.ts
│   ├── medico.entity.ts
│   ├── paciente.entity.ts
│   ├── servicio-medico.entity.ts
│   ├── cita.entity.ts
│   ├── historia-clinica.entity.ts
│   ├── atencion-medica.entity.ts
│   ├── receta-medica.entity.ts
│   ├── consultorio.errors.ts
│   └── ports/
│       ├── IConsultorioRepository.ts
│       ├── IMedicoRepository.ts
│       ├── IPacienteRepository.ts
│       ├── IServicioMedicoRepository.ts
│       ├── ICitaRepository.ts
│       ├── IHistoriaClinicaRepository.ts
│       ├── IAtencionMedicaRepository.ts
│       ├── IRecetaMedicaRepository.ts
│       └── IConsultorioNotificador.ts
├── application/
│   ├── consultorio/
│   │   ├── obtener-consultorio.usecase.ts
│   │   └── actualizar-consultorio.usecase.ts
│   ├── medico/
│   │   ├── crear-medico.usecase.ts
│   │   ├── listar-medicos.usecase.ts
│   │   ├── obtener-medico.usecase.ts
│   │   ├── actualizar-medico.usecase.ts
│   │   └── gestionar-horarios.usecase.ts
│   ├── paciente/
│   │   ├── crear-paciente.usecase.ts
│   │   ├── listar-pacientes.usecase.ts
│   │   ├── obtener-paciente.usecase.ts
│   │   └── actualizar-paciente.usecase.ts
│   ├── servicio-medico/
│   │   ├── crear-servicio.usecase.ts
│   │   ├── listar-servicios.usecase.ts
│   │   ├── obtener-servicio.usecase.ts
│   │   └── actualizar-servicio.usecase.ts
│   ├── cita/
│   │   ├── crear-cita.usecase.ts          # Valida solapamiento
│   │   ├── listar-citas.usecase.ts
│   │   ├── obtener-cita.usecase.ts
│   │   ├── confirmar-cita.usecase.ts
│   │   ├── cancelar-cita.usecase.ts
│   │   └── marcar-cita.usecase.ts         # atendida / no_asistio
│   ├── historia-clinica/
│   │   ├── crear-historia.usecase.ts
│   │   ├── listar-historias.usecase.ts
│   │   ├── obtener-historia.usecase.ts
│   │   ├── actualizar-historia.usecase.ts
│   │   ├── upsert-extension.usecase.ts    # odontología/pediatría/general/perinatal
│   │   └── adjuntar-archivo.usecase.ts
│   ├── atencion-medica/
│   │   ├── crear-atencion.usecase.ts
│   │   ├── listar-atenciones.usecase.ts
│   │   ├── obtener-atencion.usecase.ts
│   │   ├── registrar-pago.usecase.ts      # Calcula estadoPago
│   │   └── anular-atencion.usecase.ts
│   └── receta-medica/
│       ├── crear-receta.usecase.ts        # Genera numeroReceta
│       ├── listar-recetas.usecase.ts
│       ├── obtener-receta.usecase.ts
│       └── anular-receta.usecase.ts
├── infrastructure/
│   ├── consultorio.prisma.repository.ts
│   ├── medico.prisma.repository.ts
│   ├── paciente.prisma.repository.ts
│   ├── servicio-medico.prisma.repository.ts
│   ├── cita.prisma.repository.ts          # Incluye verificarSolapamiento()
│   ├── historia-clinica.prisma.repository.ts
│   ├── atencion-medica.prisma.repository.ts
│   ├── receta-medica.prisma.repository.ts
│   ├── null-consultorio.notificador.ts
│   └── consultorio.socket.notificador.ts
└── adapters/
    ├── consultorio.rest.ts
    ├── medico.rest.ts
    ├── paciente.rest.ts
    ├── servicio-medico.rest.ts
    ├── cita.rest.ts
    ├── historia-clinica.rest.ts
    ├── atencion-medica.rest.ts
    ├── receta-medica.rest.ts
    └── consultorio.schema.ts              # Todos los schemas Zod del módulo

src/core/
└── hono-context.ts                        # MODIFICAR: agregar requireConsultorio

src/server/
├── hono.ts                                # MODIFICAR: montar rutas consultorio
└── index.ts                               # MODIFICAR: agregar ConsultorioSocketNotificador

src/workers/
└── recordatorio-cita.worker.ts            # NUEVO: worker BullMQ para recordatorios

tests/
├── helpers/
│   ├── fake-consultorio.repository.ts     # NUEVO
│   ├── fake-medico.repository.ts          # NUEVO
│   ├── fake-paciente.repository.ts        # NUEVO
│   ├── fake-cita.repository.ts            # NUEVO
│   └── fake-consultorio.notificador.ts    # NUEVO
└── unit/
    ├── crear-cita.usecase.test.ts         # Test solapamiento
    ├── registrar-pago.usecase.test.ts     # Test cálculo estadoPago
    └── crear-receta.usecase.test.ts       # Test generación numeroReceta
```

## Implementation Details

### Guard de capability: `requireConsultorio`

```typescript
// Agregar en src/core/hono-context.ts
export const requireConsultorio: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const session = c.get("session")
  const tenantId = session?.session?.activeOrganizationId
  if (!tenantId) return c.json({ error: "SIN_TENANT_ACTIVO" }, 403)

  // Importar prisma dinámicamente para evitar circular dep
  const { prisma } = await import("../modules/autenticacion/infrastructure/better-auth.setup.js")
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { esConsultorio: true },
  })
  if (!tenant?.esConsultorio) {
    return c.json({ error: "CONSULTORIO_NO_HABILITADO" }, 403)
  }
  await next()
}
```

### Validación de solapamiento en `CrearCitaUseCase`

```typescript
// Lógica en cita.prisma.repository.ts
async verificarSolapamiento(
  consultorioId: string,
  medicoId: string,
  fechaHora: Date,
  duracionMin: number,
  excludeCitaId?: string
): Promise<boolean> {
  const fin = new Date(fechaHora.getTime() + duracionMin * 60_000)
  const MAX_DURACION_MS = 4 * 60 * 60_000 // 4 horas como ventana máxima

  const candidatas = await this.client.cita.findMany({
    where: {
      consultorioId,
      medicoId,
      id: excludeCitaId ? { not: excludeCitaId } : undefined,
      estado: { notIn: ["CANCELADA", "NO_ASISTIO"] },
      fechaHora: {
        gte: new Date(fechaHora.getTime() - MAX_DURACION_MS),
        lt: fin,
      },
    },
    select: { fechaHora: true, duracionMin: true },
  })

  return candidatas.some((c) => {
    const cFin = new Date(c.fechaHora.getTime() + c.duracionMin * 60_000)
    return fechaHora < cFin && fin > c.fechaHora
  })
}
```

### Cálculo de `estadoPago` en `RegistrarPagoUseCase`

```typescript
// Obtener suma de pagos existentes
const sumaPagos = atencion.pagos.reduce((acc, p) => acc + Number(p.monto), 0)
const nuevoTotal = sumaPagos + monto

if (nuevoTotal > Number(atencion.total)) {
  throw new PagoExcedeTotalError()
}

const estadoPago = nuevoTotal >= Number(atencion.total) ? "PAGADO" : "PARCIAL"
const estadoAtencion = estadoPago === "PAGADO" ? "PAGADA" : "COMPLETADA"
```

### Generación de `numeroReceta` en `CrearRecetaUseCase`

```typescript
const ultimaReceta = await this.recetaRepo.ultimaReceta(consultorioId)
const year = new Date().getFullYear()
const seq = ultimaReceta
  ? parseInt(ultimaReceta.numeroReceta.split("-")[2]) + 1
  : 1
const numeroReceta = `REC-${year}-${String(seq).padStart(5, "0")}`
```

### BullMQ: worker de recordatorios

```typescript
// src/workers/recordatorio-cita.worker.ts
// Job encola al crear/confirmar cita: { citaId, canal: 'EMAIL' }
// Worker: leer cita con paciente y médico, enviar email Resend,
//         crear RecordatorioCita con estadoEnvio=ENVIADO
```

### Montaje de rutas en hono.ts

```typescript
// Grupo /api/consultorio con middleware requireConsultorio aplicado
const consultorioGroup = app.route("/api/consultorio", consultorioApp)
```

## Complexity Tracking

No hay violaciones constitucionales que justificar.

## Artifacts

- [research.md](research.md) — Decisiones técnicas
- [data-model.md](data-model.md) — Referencia de modelos Prisma
- [contracts/consultorio-rest.md](contracts/consultorio-rest.md) — API REST
- [contracts/socket-events.md](contracts/socket-events.md) — Eventos Socket.IO
- [quickstart.md](quickstart.md) — Escenarios de validación
